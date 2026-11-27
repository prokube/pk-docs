# Feast Feature Store

Feast manages reusable ML features for training and online inference. On prokube, you use Feast as a Python SDK and CLI from Labs, pipelines, and other workspace workloads. prokube does not run a Feast server or operator; you choose where Feast keeps its registry and data.

::: info References
- [Feast documentation](https://docs.feast.dev/)
- [Feast quickstart](https://docs.feast.dev/getting-started/quickstart)
- [Feature repository and `feature_store.yaml`](https://docs.feast.dev/reference/feature-repository)
- [Registries](https://docs.feast.dev/reference/registries), [offline stores](https://docs.feast.dev/reference/offline-stores), and [online stores](https://docs.feast.dev/reference/online-stores)
:::

## Choose Storage

Feast uses three stores. Configure them in `feature_store.yaml`:

| Store | Contents | Single Lab | Shared across workloads |
|---|---|---|---|
| Registry | Feature definitions written by `feast apply` | SQLite on the Lab home volume | File on [S3-compatible storage](../platform/file_storage.md) |
| Offline store | Historical feature data for training | Parquet on the Lab home volume | Parquet on S3-compatible storage |
| Online store | Latest materialized values for low-latency reads | SQLite on the Lab home volume | [Redis in your workspace](#run-redis-in-your-workspace) |

Keep everything on the Lab home volume while you work alone in one Lab. Move the registry and offline data to S3-compatible storage, and the online store to Redis, when pipelines, inference services, or teammates need the same features.

The [`prokube/examples` Feast notebook](https://github.com/prokube/examples/tree/main/feast) runs the shared setup end to end: it starts Redis in your workspace, registers features in your workspace bucket, trains a model, and serves online features.

Do not put the registry under `/tmp`. Files outside the home directory or another mounted volume are lost when the Lab restarts.

## Use Feast in a Lab

Install the SDK in a [JupyterLab](../labs/jupyterlab.md) session. To keep the package across Lab restarts, use an environment under `/home/jovyan` or a [custom notebook image](../labs/custom_notebooks.md).

```bash
pip install 'feast[aws,redis]'
```

Create a feature repository directory, for example `/home/jovyan/feature_repo`, with this `feature_store.yaml`:

```yaml
project: my_features
provider: local
registry:
  registry_type: sql
  path: sqlite:////home/jovyan/feature_repo/data/registry.db
offline_store:
  type: file
online_store:
  type: sqlite
  path: data/online_store.db
entity_key_serialization_version: 3
```

Define entities, data sources, and feature views as described in the [Feast quickstart](https://docs.feast.dev/getting-started/quickstart), then register and materialize them from the repository directory:

```bash
feast apply
feast materialize-incremental $(date -u +"%Y-%m-%dT%H:%M:%S")
```

Use the SDK for historical training data and online retrieval:

```python
from feast import FeatureStore
import pandas as pd

store = FeatureStore(repo_path="/home/jovyan/feature_repo")

training_df = store.get_historical_features(
    entity_df=pd.DataFrame({
        "driver_id": [1001, 1002],
        "event_timestamp": [pd.Timestamp.now(tz="UTC")] * 2,
    }),
    features=["driver_hourly_stats:conv_rate"],
).to_df()

online_features = store.get_online_features(
    features=["driver_hourly_stats:conv_rate"],
    entity_rows=[{"driver_id": 1001}],
).to_dict()
```

## Share Features Through S3-Compatible Storage

To share feature definitions and training data, store the registry and Parquet sources in a bucket your workspace can write to. Workspaces usually have a `<workspace>-data` bucket; check the available buckets in the [Object Storage browser](../platform/file_storage.md#file-storage-browser).

```yaml
project: my_features
provider: local
registry: s3://<workspace>-data/feast/my_features/registry.db
offline_store:
  type: file
online_store:
  type: sqlite
  path: data/online_store.db
entity_key_serialization_version: 3
```

Labs receive the S3 endpoint and credentials as environment variables, so the registry needs no further configuration. Parquet data sources do not pick up the endpoint automatically. Pass it on each `FileSource`:

```python
import os
from feast import FileSource

driver_stats_source = FileSource(
    name="driver_hourly_stats_source",
    path="s3://<workspace>-data/feast/my_features/data/driver_stats.parquet",
    timestamp_field="event_timestamp",
    s3_endpoint_override=os.environ["AWS_ENDPOINT_URL"],
)
```

Pipeline components and custom pods need the workspace `s3creds` secret injected explicitly, plus `AWS_ENDPOINT_URL` set to the same value as in your Lab (`echo $AWS_ENDPOINT_URL`). See [Access S3-Backed Files from Workloads](../platform/file_storage.md#access-s3-backed-files-from-workloads) and [Use Secrets in Components](pipelines.md#use-secrets-in-components).

## Run Redis in Your Workspace

A SQLite online store is only readable from the pod that mounts it. If a model-serving endpoint or another workload must read online features, use a network online store. You can run [Redis](https://docs.feast.dev/reference/online-stores/redis) in your workspace with standard Kubernetes resources; no operator or administrator action is needed.

The [`prokube/examples` Feast example](https://github.com/prokube/examples/tree/main/feast) includes a ready-to-use `redis.yaml` with a single-replica Redis StatefulSet and Service. From that directory in a Lab terminal:

```bash
kubectl create secret generic feast-redis \
  --from-literal=password="$(openssl rand -hex 24)"
kubectl apply -f redis.yaml
kubectl rollout status statefulset/feast-redis
```

Point the online store at the Service. `feature_store.yaml` resolves `${VAR}` references from the environment, so the password stays out of the file:

```yaml
online_store:
  type: redis
  connection_string: ${FEAST_REDIS_CONNECTION_STRING}
```

```bash
export FEAST_REDIS_CONNECTION_STRING="feast-redis:6379,password=$(kubectl get secret feast-redis -o jsonpath='{.data.password}' | base64 -d)"
```

This Redis is owned by your workspace and has no replication or platform backups. Use it for data you can rebuild with `feast materialize`. For production online serving, ask your administrator which [database services](../platform/databases.md) are available.

If your workspace has an [egress profile](../admin/network_policies.md), pods in the workspace cannot reach each other until you allow it. Apply the example's `redis-networkpolicy.yaml` to let workspace pods connect to Redis.

## Use Features from Other Workloads

A pipeline step, inference service, or other pod in the same workspace reads the features with the same `feature_store.yaml`, a shared registry in S3-compatible storage, and Redis as the online store. Give its container the Redis connection string and S3 settings:

```yaml
env:
  - name: REDIS_PASSWORD
    valueFrom:
      secretKeyRef:
        name: feast-redis
        key: password
  - name: FEAST_REDIS_CONNECTION_STRING
    value: feast-redis:6379,password=$(REDIS_PASSWORD)
  - name: AWS_ENDPOINT_URL
    value: <same value as in your Lab: echo $AWS_ENDPOINT_URL>
  - name: AWS_ACCESS_KEY_ID
    valueFrom:
      secretKeyRef:
        name: s3creds
        key: AWS_ACCESS_KEY_ID
  - name: AWS_SECRET_ACCESS_KEY
    valueFrom:
      secretKeyRef:
        name: s3creds
        key: AWS_SECRET_ACCESS_KEY
```

Install the same Feast version in that workload as in the Lab that ran `feast apply`. On-demand feature views are stored as serialized Python code in the registry and may not load with a different version.

## Access and Lifecycle

Files on the Lab home volume are private to that volume. Registry and data files in S3-compatible storage follow the bucket's permissions; anyone with write access to the bucket can change the feature definitions. Workspace Redis is reachable by every pod in the workspace, and workspace members with edit access can read the `feast-redis` Secret. Feast has no access control of its own in this setup.

## Troubleshooting

| Symptom | Check |
|---|---|
| Feature definitions disappear after a Lab restart | The registry path is outside `/home/jovyan` or another persistent volume. |
| `ACCESS_DENIED` when reading an `s3://` data source | Set `s3_endpoint_override` on the `FileSource`. |
| Registry in S3-compatible storage is not found or access is denied | Check that `AWS_ENDPOINT_URL` and S3 credentials are set in the workload and that the bucket exists. |
| Connections to `feast-redis` time out or are reset | The workspace has an egress profile. Apply `redis-networkpolicy.yaml` from the example. |
| `feast-redis-0` is stuck in `ImagePullBackOff` | The cluster cannot pull from Docker Hub. Replace the image in `redis.yaml` with a mirror your administrator provides. |

## Related Pages

- [File Storage](../platform/file_storage.md)
- [Pipelines](pipelines.md)
- [MLflow](mlflow.md)
- [Labs](../labs/index.md)
