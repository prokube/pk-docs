# Feast Feature Store

Feast is an open-source feature store for ML pipelines. prokube deploys the Feast operator; each user provisions their own private feature store inside their workspace namespace — no shared feature store, no per-workspace admin action.

::: info Feast references
- [Feast documentation](https://docs.feast.dev/)
- [Feast registries](https://docs.feast.dev/reference/registries)
- [Feast online stores](https://docs.feast.dev/reference/online-stores)
- [Feast offline stores](https://docs.feast.dev/reference/offline-stores)
:::

::: info Optional component
Feast must be enabled by your administrator (`--extra-apps feast`, alongside `redis` for an online store). If the `FeatureStore` custom resource is not available on your cluster, ask your admin to enable it.
:::

## How a Feast store is put together

A Feast feature store has three storage concerns, each with its own recommended backend on prokube:

| Store | Backend | Why |
|---|---|---|
| Registry | SQLite on PVC, auto-created | Feature definitions; written only on `feast apply`. No realistic write contention in a single-workspace deployment. |
| Online store | Redis, user-deployed | On the critical path for real-time inference. Multi-replica safe, sub-millisecond latency. |
| Offline store | Parquet on PVC, user-populated | Historical data for training; batch workload, not on the serving path. |

The operator creates the registry and offline-store PVCs automatically from the `FeatureStore` spec, but you populate the offline-store parquet files yourself. SQL registries and BigQuery/Snowflake/Redshift offline stores are also supported upstream if your data already lives there — see the reference links above.

## Set up your feature store

You perform all three steps yourself; the admin's only role is keeping the operators running. The recommended workflow is to run all of these from a [JupyterLab](../labs/jupyterlab.md) session using `kubectl`.

### 1. Deploy a Redis instance

Skip this step if your cluster already has Redis available elsewhere — use that connection string in step 2 instead.

```bash
kubectl create secret generic redis-feast \
  -n <your-workspace> \
  --from-literal=password=$(openssl rand -base64 24 | tr -d '/')
```

```yaml
# redis.yaml
apiVersion: redis.redis.opstreelabs.in/v1beta2
kind: Redis
metadata:
  name: redis-feast
  namespace: <your-workspace>
spec:
  kubernetesConfig:
    image: quay.io/opstree/redis:v7.0.15
    redisSecret:
      name: redis-feast
      key: password
    resources:
      requests: { cpu: 100m, memory: 128Mi }
      limits: { cpu: 200m, memory: 256Mi }
  podSecurityContext:
    fsGroup: 1000
    runAsUser: 1000
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: [ReadWriteOnce]
        resources:
          requests: { storage: 1Gi }
```

```bash
kubectl apply -f redis.yaml
kubectl get redis -n <your-workspace> -w   # wait until Running
```

The Redis service becomes reachable at `redis-feast.<your-workspace>.svc.cluster.local:6379`.

### 2. Create the Feast Redis secret

The operator reads the online-store connection string from a secret named `feast-redis-config`. The key must be `redis`, and its value a YAML map with `connection_string` — not a `redis://` URI:

```bash
NAMESPACE=<your-workspace>
PASSWORD=$(kubectl get secret redis-feast -n $NAMESPACE -o jsonpath='{.data.password}' | base64 -d)

cat > /tmp/redis-config.yaml << EOF
connection_string: "redis-feast.${NAMESPACE}.svc.cluster.local:6379,password=${PASSWORD}"
EOF

kubectl create secret generic feast-redis-config \
  -n $NAMESPACE --from-file=redis=/tmp/redis-config.yaml
rm /tmp/redis-config.yaml
```

### 3. Deploy a FeatureStore

```yaml
# featurestore.yaml
apiVersion: feast.dev/v1
kind: FeatureStore
metadata:
  name: my-store
  namespace: <your-workspace>
spec:
  feastProject: my_features
  services:
    runFeastApplyOnInit: false
    securityContext:
      runAsUser: 0
    registry:
      local:
        persistence:
          file:
            pvc:
              mountPath: /data/registry
              create:
                resources: { requests: { storage: 1Gi } }
    offlineStore:
      persistence:
        file:
          type: file
          pvc:
            mountPath: /data/offline
            create:
              resources: { requests: { storage: 10Gi } }
    onlineStore:
      persistence:
        store:
          type: redis
          secretRef: { name: feast-redis-config }
          secretKeyName: redis
```

```bash
kubectl apply -f featurestore.yaml
kubectl get featurestore -n <your-workspace> -w   # wait until Ready
```

The operator creates the registry and offline-store PVCs and a Feast server `Deployment` automatically. `securityContext.runAsUser: 0` is required for PVC write access on prokube's storage backend.

## Use Feast from a notebook

Feast is not preinstalled in prokube notebook images — install it first: `!pip install feast`.

Build a `feature_store.yaml` from your namespace credentials (the notebook SDK reads this file automatically):

```python
import base64, subprocess, yaml

def get_namespace():
    with open("/var/run/secrets/kubernetes.io/serviceaccount/namespace") as f:
        return f.read().strip()

def get_redis_connection_string(namespace):
    result = subprocess.run(
        ["kubectl", "get", "secret", "feast-redis-config",
         "-n", namespace, "-o", "jsonpath={.data.redis}"],
        capture_output=True, text=True, check=True,
    )
    return yaml.safe_load(base64.b64decode(result.stdout).decode())["connection_string"]

NAMESPACE = get_namespace()
REDIS = get_redis_connection_string(NAMESPACE)
FEAST_PROJECT = "my_features"  # must match spec.feastProject in your FeatureStore CR

with open("feature_store.yaml", "w") as f:
    f.write(f"""project: {FEAST_PROJECT}
provider: local
offline_store:
    type: file
online_store:
    type: redis
    connection_string: "{REDIS}"
registry:
    registry_type: file
    path: /tmp/registry.db
auth:
    type: no_auth
entity_key_serialization_version: 3
""")
```

`/tmp/registry.db` is local to the notebook pod — re-run `feast apply` at the start of each session. The Redis online store persists across sessions regardless.

Define and register features, then use them for training and serving:

```python
# features.py
from datetime import timedelta
from feast import Entity, FeatureView, Field, FileSource
from feast.types import Float32, Int64

driver = Entity(name="driver_id")
source = FileSource(path="data/driver_stats.parquet", timestamp_field="event_timestamp")

driver_stats = FeatureView(
    name="driver_hourly_stats",
    entities=[driver],
    ttl=timedelta(days=1),
    schema=[
        Field(name="conv_rate", dtype=Float32),
        Field(name="acc_rate", dtype=Float32),
        Field(name="avg_daily_trips", dtype=Int64),
    ],
    source=source,
    online=True,
)
```

```bash
feast apply
```

```python
from feast import FeatureStore
import pandas as pd

store = FeatureStore(repo_path=".")

# Historical features for training
entity_df = pd.DataFrame({"driver_id": [1001, 1002, 1003]})
training_df = store.get_historical_features(
    entity_df=entity_df,
    features=["driver_hourly_stats:conv_rate", "driver_hourly_stats:acc_rate"],
).to_df()
```

```bash
# Materialize to the online store
feast materialize-incremental $(date -u +"%Y-%m-%dT%H:%M:%S")
```

```python
# Online feature retrieval for inference
features = store.get_online_features(
    features=["driver_hourly_stats:conv_rate", "driver_hourly_stats:acc_rate"],
    entity_rows=[{"driver_id": 1001}],
).to_dict()
```

## Optional: persistent shared registry

By default, the notebook example above writes to `/tmp/registry.db` — ephemeral, wiped on pod restart. To use the operator-managed registry PVC instead (so definitions persist and are visible to every client in the namespace), enable the registry gRPC server:

```yaml
spec:
  services:
    registry:
      local:
        server: {}   # exposes gRPC on port 6570
        persistence:
          file:
            pvc: { mountPath: /data/registry, create: { resources: { requests: { storage: 1Gi } } } }
    podAnnotations:
      traffic.sidecar.istio.io/excludeInboundPorts: "6570"
```

::: warning Istio sidecar workaround required
The operator's registry `Service` has no `appProtocol` set, so both client- and server-side Istio sidecars misclassify the gRPC traffic as HTTP/1.1 and it fails. Until the operator sets `appProtocol: grpc` upstream, apply this workaround alongside the `excludeInboundPorts` annotation above (replace `<name>`/`<namespace>`):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: feast-<name>-registry-grpc
  namespace: <namespace>
spec:
  selector: { app: feast-<name> }
  ports:
    - { name: grpc, port: 80, targetPort: 6570, appProtocol: grpc }
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: feast-<name>-registry-grpc
  namespace: <namespace>
spec:
  host: feast-<name>-registry-grpc.<namespace>.svc.cluster.local
  trafficPolicy:
    tls: { mode: DISABLE }
```

Then point your client at the alt-service instead of the default one:

```yaml
registry:
  registry_type: remote
  path: grpc://feast-<name>-registry-grpc.<namespace>.svc.cluster.local:80
```
:::

## Isolation

Each user's Feast deployment is fully isolated to their workspace namespace: the Redis instance, `FeatureStore` CR, and all PVCs live there, Kubeflow RBAC prevents other users from creating resources in your namespace, and Istio `AuthorizationPolicy` restricts inbound traffic to same-namespace sources. Deleting a workspace cascade-deletes the Redis instance, `FeatureStore` CR, PVCs, and all Feast data — this is irreversible, so confirm no pipeline or model still depends on the features first.

## Troubleshooting

| Symptom | Check |
|---|---|
| `FeatureStore` resource not found | Feast is an opt-in platform component — ask your administrator to enable it. |
| `FeatureStore` stuck, not `Ready` | Check operator logs in `feast-operator-system`. Confirm `feast-redis-config` exists with a `redis` key formatted as `connection_string: "host:port,password=..."`, not a `redis://` URI. |
| PVC write errors from the Feast server pod | Confirm `spec.services.securityContext.runAsUser: 0` is set on the `FeatureStore` CR. |
| gRPC registry calls fail with a protocol error | Apply the Istio sidecar workaround above; confirm `excludeInboundPorts: "6570"` is set on the `FeatureStore` CR's pod annotations. |
| On-demand feature views hang when using a remote registry | Known issue in Feast ≤ 0.63: `PandasTransformation.from_proto()` deserializes UDFs via `dill.loads()`, which triggers a runaway typeguard AST traversal. Monkey-patch `from_proto` to inject the live function object by name instead of deserializing it, or avoid on-demand feature views with a remote registry until upstream fixes this. |
| Can't share a `FeatureStore` with teammates | Not supported directly — anyone with contributor access to your workspace namespace can already reach your Feast services from within the cluster. |

## Related Pages

- [MLflow](mlflow.md) — track training runs that feed feature engineering
- [Pipelines](pipelines.md) — run `feast apply`/`materialize` as reproducible pipeline steps
- [Workspaces](../platform/workspaces.md) — namespace isolation model that Feast relies on
- [Kubernetes Resources](../platform/kubernetes.md#kubernetes-secrets) — creating and managing the `feast-redis-config` secret
