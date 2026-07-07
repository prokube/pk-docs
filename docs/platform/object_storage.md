# Object Storage

prokube provides S3-compatible object storage for datasets, model artifacts, pipeline outputs, and shared files. Object storage is the preferred place for data that must be consumed by Labs, pipelines, MLflow, model serving, and other workspace workloads.

::: info MinIO documentation
For MinIO concepts and client reference that are not specific to prokube, use the upstream documentation:

- [MinIO documentation](https://docs.min.io/community/minio-object-store/)
- [MinIO Client reference](https://min.io/docs/minio/linux/reference/minio-mc.html)
:::

## Object Storage Browser

Open **Object Storage** in the prokube UI to inspect and manage the buckets available to your workspace. The browser uses your platform session and shows only storage you are allowed to access.

Use it for day-to-day file operations:

- browse buckets, folders, and objects with breadcrumb navigation;
- search buckets and recursively search objects inside folders;
- sort objects by name, size, and last modified time;
- create folders;
- upload files or folders, including drag-and-drop uploads;
- download files;
- inspect object details such as size, content type, ETag, and last modified time;
- copy `s3://bucket/key` paths for notebooks, pipelines, and model-serving configuration;
- generate temporary share links for files;
- rename, duplicate, move, and delete files or folders;
- select multiple items and delete them in one action.

Prefer this browser when you need a standalone storage view without opening a Lab or external S3 client.

## Use Object Paths

Many prokube workflows expect S3-compatible object paths in this form:

```text
s3://<bucket>/<path>/<object>
```

Common examples:

- pass dataset paths into pipeline parameters;
- select a model artifact directory with **Browse S3** when deploying a model;
- log and inspect artifacts created by MLflow or pipelines;
- load files from a JupyterLab notebook or VS Code Lab.

Copy paths from the Object Storage browser instead of typing bucket names manually when possible.

## Access from Labs

Labs can use object storage through UI extensions, Python libraries, command-line tools, and S3-compatible SDKs.

The prokube-maintained `pk-*` notebook images include `rclone` with a preconfigured `minio` remote when workspace object-storage configuration is available:

```bash
rclone lsd minio:
rclone copy local-file minio:my-bucket/path/
rclone copy minio:my-bucket/path/file ./file
```

Python clients can use the S3-compatible API. For example, with `s3fs`:

```python
import s3fs

s3 = s3fs.S3FileSystem()

with s3.open("my-bucket/path/file.txt", "rb") as f:
    print(f.read())
```

Use pandas with an `s3://` path:

```python
import pandas as pd

df = pd.read_parquet("s3://my-bucket/path/data.parquet")
```

DuckDB can read files from object storage through its `httpfs` extension. In managed Labs, S3-compatible endpoint and credential environment variables are usually provided by the workspace configuration:

```python
import duckdb

conn = duckdb.connect()
conn.execute("INSTALL httpfs")
conn.execute("LOAD httpfs")
conn.execute("SET s3_url_style='path'")

df = conn.sql("SELECT * FROM read_parquet('s3://my-bucket/path/data.parquet') LIMIT 10").df()
```

If DuckDB cannot discover credentials automatically, configure it from environment variables rather than hard-coding secrets:

```python
import os

conn.execute(f"SET s3_access_key_id='{os.environ['AWS_ACCESS_KEY_ID']}'")
conn.execute(f"SET s3_secret_access_key='{os.environ['AWS_SECRET_ACCESS_KEY']}'")
```

JupyterLab images can also include an S3 browser extension in the JupyterLab sidebar. See [JupyterLab](../labs/jupyterlab.md#object-storage-in-jupyterlab).

## Access from Workloads

Labs and model-serving workloads usually receive object-storage configuration automatically. Other Kubernetes workloads, such as custom pods, Katib trials, PyTorchJobs, or pipeline components, may need the workspace `s3creds` secret injected explicitly.

For a plain pod or training-job manifest, inject only the keys the workload needs:

```yaml
env:
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

For Kubeflow Pipelines, use `kfp-kubernetes` instead of embedding credentials in pipeline code or compiled YAML. See [Use Secrets in Components](../mlops/pipelines.md#use-secrets-in-components).

## External S3 Clients

Some workflows need access from outside the cluster, for example from a local development machine or external automation. The exact endpoint depends on your deployment and is usually exposed under a MinIO or S3-compatible domain such as:

```text
https://minio.<your-prokube-domain>
```

External S3 clients need these settings:

- endpoint URL;
- access key ID;
- secret access key.

Create and rotate these credentials only through the storage or account management flow enabled by your administrator. Store secret keys in a password manager or secret store. Do not commit them to notebooks, repositories, pipeline definitions, or container images.

Configure `s3fs` explicitly for external access:

```python
import getpass
import s3fs

AWS_ENDPOINT_URL = "https://minio.<your-prokube-domain>"
AWS_ACCESS_KEY_ID = "<access-key-id>"
AWS_SECRET_ACCESS_KEY = getpass.getpass("S3 secret access key: ")

s3 = s3fs.S3FileSystem(
    key=AWS_ACCESS_KEY_ID,
    secret=AWS_SECRET_ACCESS_KEY,
    endpoint_url=AWS_ENDPOINT_URL,
)
```

## When to Use the MinIO UI

The prokube Object Storage browser covers normal file browsing, upload, download, organization, and path-copying workflows.

Use the MinIO UI only when you need account-level or storage-administration functions that are not exposed in the prokube browser, such as:

- creating or managing personal S3 access keys, if enabled;
- reviewing MinIO-specific account settings;
- performing bucket or policy administration tasks allowed by your administrator.

## Security and Scope

Object storage access is workspace- and permission-dependent. A bucket visible in one workspace or tool may not be visible in another.

Follow these rules:

- use workspace or service credentials for shared workloads instead of personal credentials;
- avoid storing broad cloud, registry, or administrator credentials in shared buckets;
- treat temporary share links as bearer-access links and share them only with intended recipients;
- remove old exports, model artifacts, and intermediate data when they are no longer needed;
- prefer object storage over persistent volumes for large datasets and artifacts that multiple workloads need to read.

## Troubleshooting

| Symptom | Check |
|---|---|
| Bucket is not visible | Confirm that the selected workspace or user has access to the bucket. |
| Upload fails | Check file size limits, available storage, and whether the bucket policy allows writes. For large files, use a Lab terminal, `rclone`, or another S3-compatible client instead of the browser upload path. |
| Pipeline cannot read an object | Verify the exact `s3://` path and the workspace credentials used by the pipeline pod. |
| Katib, PyTorchJob, or a custom pod cannot read objects | Inject the workspace `s3creds` secret into the workload container and verify the S3 client uses those environment variables. |
| Model serving cannot load a model | Verify the storage URI, model artifact layout, and KServe storage credentials. See [Model Serving](../mlops/model_serving.md#s3-compatible-storage). |
| DuckDB cannot read an object | Load the `httpfs` extension, use `s3://` paths, and confirm DuckDB can discover or is explicitly given the S3 credentials. |
| External client returns authentication errors | Check endpoint URL, access key, secret key, and whether the credential has permission for the bucket. |

## Related Pages

- [Labs](../labs/index.md)
- [JupyterLab](../labs/jupyterlab.md)
- [Pipelines](../mlops/pipelines.md)
- [MLflow](../mlops/mlflow.md)
- [Model Serving](../mlops/model_serving.md)
