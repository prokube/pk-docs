# Feast Feature Store

Feast manages reusable ML features for training and online inference. In prokube, each workspace provisions its own `FeatureStore`, Redis online store, and persistent volumes.

::: info References
- [Feast documentation](https://docs.feast.dev/)
- [Feature stores](https://docs.feast.dev/reference/feature-repository)
- [Online stores](https://docs.feast.dev/reference/online-stores)
:::

::: info Optional component
An administrator must enable Feast. If `FeatureStore` is unavailable in your workspace, ask them to deploy `--extra-apps feast,redis`.
:::

## Storage

| Store | prokube default |
|---|---|
| Registry | SQLite on an operator-created PVC |
| Online store | Redis in your workspace |
| Offline store | Parquet files on an operator-created PVC |

The registry contains feature definitions and is written by `feast apply`. The offline store contains historical data for training; you supply its Parquet files. Redis stores the latest materialized feature values for low-latency reads.

## Create a FeatureStore

Run these commands from a [JupyterLab](../labs/jupyterlab.md) session or another workload with `kubectl` access to the workspace namespace.

### 1. Create Redis

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
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: [ReadWriteOnce]
        resources:
          requests: { storage: 1Gi }
```

```bash
kubectl apply -f redis.yaml
kubectl get redis -n <your-workspace> -w
```

Use an existing reachable Redis service instead if your workspace already has one.

### 2. Create the Redis connection secret

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

The secret key must be `redis`. Its value is YAML containing `connection_string`, not a `redis://` URI.

### 3. Apply the FeatureStore resource

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
kubectl get featurestore -n <your-workspace> -w
```

The operator creates the Feast server and PVCs. `runAsUser: 0` is required for PVC write access.

## Use Feast

Install the client in your notebook if it is not present: `!pip install feast`.

Create `feature_store.yaml` with the same project and Redis connection details as the resource above:

```yaml
project: my_features
provider: local
offline_store:
  type: file
online_store:
  type: redis
  connection_string: "redis-feast.<your-workspace>.svc.cluster.local:6379,password=<password>"
registry:
  registry_type: file
  path: /tmp/registry.db
auth:
  type: no_auth
entity_key_serialization_version: 3
```

Define features according to the [Feast quickstart](https://docs.feast.dev/getting-started/quickstart), then register and materialize them:

```bash
feast apply
feast materialize-incremental $(date -u +"%Y-%m-%dT%H:%M:%S")
```

Use the SDK for historical training data and online retrieval:

```python
from feast import FeatureStore
import pandas as pd

store = FeatureStore(repo_path=".")
training_df = store.get_historical_features(
    entity_df=pd.DataFrame({"driver_id": [1001, 1002]}),
    features=["driver_hourly_stats:conv_rate"],
).to_df()

online_features = store.get_online_features(
    features=["driver_hourly_stats:conv_rate"],
    entity_rows=[{"driver_id": 1001}],
).to_dict()
```

## Access and lifecycle

Feast resources, Redis, and PVCs are scoped to your workspace namespace. Workspace contributors can access them according to the workspace's Kubernetes RBAC. Deleting a workspace deletes its Feast resources and data.

## Troubleshooting

| Symptom | Check |
|---|---|
| `FeatureStore` resource not found | Ask an administrator to enable the Feast extra app. |
| `FeatureStore` is not `Ready` | Check `feast-operator-system` logs and the `feast-redis-config` secret format. |
| PVC write error | Set `spec.services.securityContext.runAsUser: 0`. |
| Registry gRPC protocol error | The operator's registry service currently needs an Istio-specific workaround. Use the local registry, or contact platform support before enabling the remote registry server. |

## Related Pages

- [Pipelines](pipelines.md)
- [MLflow](mlflow.md)
- [Workspaces](../platform/workspaces.md)
- [Kubernetes Resources](../platform/kubernetes.md#kubernetes-secrets)
