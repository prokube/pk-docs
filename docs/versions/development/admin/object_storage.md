# Object Storage Administration

prokube stores objects in [SeaweedFS](https://github.com/seaweedfs/seaweedfs), an S3-compatible object store. It backs pipeline artifacts, MLflow artifacts, KServe model storage, and all workspace data buckets. SeaweedFS replaces MinIO in current prokube deployments.

:::: info SeaweedFS documentation
For SeaweedFS internals, `weed` command reference, and upstream operations guidance, use the upstream documentation.

- [SeaweedFS wiki](https://github.com/seaweedfs/seaweedfs/wiki)
- [`weed shell` commands](https://github.com/seaweedfs/seaweedfs/wiki/Weed-Shell)
::::

The manifests are not part of core prokube. They live in the companion platform repository and are deployed as a separate application into the `seaweedfs` namespace. Core prokube components only consume the S3 endpoint.

SeaweedFS splits into four roles: a master for topology and volume assignment, volume servers holding the data, a filer providing the metadata layer including S3 identities and policies, and an S3 gateway translating the S3 and IAM APIs onto the filer.

## Deployment Profiles

Two mutually exclusive profiles are available.

| Profile | Used for | Topology |
|---|---|---|
| `seaweedfs-aio` | single-node deployments | one Deployment running master, volume, filer, and S3 gateway in a single process, with an embedded leveldb filer store on one PVC |
| `seaweedfs-ha` | multi-node and managed deployments | master, volume, and filer StatefulSets with 3 replicas each, a 3-replica S3 gateway Deployment, and a PostgreSQL cluster as the filer metadata store |

The deploy script selects the profile from the cluster topology: `seaweedfs-aio` on single-node clusters, `seaweedfs-ha` on HA and managed clusters. An explicit `--extra-apps seaweedfs-aio` or `--extra-apps seaweedfs-ha` overrides the automatic choice. Requesting both fails, because the profiles are declared as conflicting.

`seaweedfs-ha` needs the CrunchyData PostgreSQL operator from core prokube for the filer metadata database. Install it alongside the profile.

:::: warning Switching profiles is not a migration
The profiles use different filer metadata stores. Buckets, objects, and S3 credentials do not carry over. Moving an existing deployment between profiles means copying data out with an S3 client and back in afterwards.
::::

## Endpoints

| Scope | Endpoint |
|---|---|
| In-cluster | `http://seaweedfs-s3.seaweedfs.svc.cluster.local:8333` |
| External | `https://s3.<your-prokube-domain>` |

Both profiles expose the gateway through the same `seaweedfs-s3` Service, so consumer manifests carry one hostname regardless of profile. Requests use path-style addressing and SigV4. Clients address the in-cluster endpoint over plain HTTP; the namespace is mesh-injected, so that traffic is carried by the service mesh.

The platform injects the in-cluster endpoint into workloads as `S3_ENDPOINT` and `AWS_ENDPOINT_URL`. Prefer those variables over hardcoded hostnames.

The external hostname serves the S3 API only. There is no object-store web console. The DNS record for `s3.<your-prokube-domain>` and its TLS certificate are set up during installation, see [Installation Planning](installation.md).

## Credentials and IAM

Platform admin credentials live in the `seaweedfs-s3-secret` Secret in the `seaweedfs` namespace, with keys `admin_access_key_id`, `admin_secret_access_key`, and the identity document mounted into the gateway. Deployment fills in only missing keys, so re-running a deployment does not rotate existing credentials.

The [user-management-operator](user_management.md) uses those admin credentials to provision per-workspace access:

- one IAM user per workspace;
- two IAM groups per workspace, `pk-s3-edit-<workspace>` and `pk-s3-view-<workspace>`, each carrying its access rules as an inline policy;
- the workspace buckets `<workspace>-data` and `<workspace>-mlpipeline`;
- the `s3creds` Secret in the workspace namespace with `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

Every workspace member can read `s3creds`, and Labs, pipeline steps, and model-serving workloads use it. Contributor access to another workspace is granted by adding the contributor's workspace user to that workspace's group.

:::: warning The operator owns the `pk-s3-` prefix
On every reconcile, the operator makes sure a user is a member of exactly the intended `pk-s3-*` groups and that each group's inline policy matches the template. Hand edits inside that prefix are reverted. Groups, users, and policies outside the prefix are never touched, which is the supported way to grant additional, manually managed access.
::::

Inspect the current state with any IAM client. The examples below use the admin credentials and the external endpoint:

```bash
export AWS_ACCESS_KEY_ID=$(kubectl get secret seaweedfs-s3-secret -n seaweedfs \
  -o jsonpath='{.data.admin_access_key_id}' | base64 -d)
export AWS_SECRET_ACCESS_KEY=$(kubectl get secret seaweedfs-s3-secret -n seaweedfs \
  -o jsonpath='{.data.admin_secret_access_key}' | base64 -d)
export AWS_DEFAULT_REGION=us-east-1
export S3_URL=https://s3.<your-prokube-domain>

aws configure set default.s3.addressing_style path
aws --endpoint-url "$S3_URL" iam list-users
aws --endpoint-url "$S3_URL" iam get-group --group-name pk-s3-edit-<workspace>
aws --endpoint-url "$S3_URL" iam get-group-policy \
  --group-name pk-s3-edit-<workspace> --policy-name pk-s3-edit-<workspace>
```

To work without the external hostname, port-forward the gateway and use `http://localhost:8333` instead:

```bash
kubectl port-forward -n seaweedfs svc/seaweedfs-s3 8333:8333
```

### Dedicated Credentials for a Service

For a workload that must not use the shared workspace credentials, give it its own user and group outside the `pk-s3-` prefix. Group names may only contain `[A-Za-z0-9_-]`:

```bash
aws --endpoint-url "$S3_URL" iam create-group --group-name my-service-rw
aws --endpoint-url "$S3_URL" iam put-group-policy \
  --group-name my-service-rw --policy-name my-service-rw \
  --policy-document file://policy.json
aws --endpoint-url "$S3_URL" iam create-user --user-name my-service
aws --endpoint-url "$S3_URL" iam add-user-to-group \
  --user-name my-service --group-name my-service-rw
aws --endpoint-url "$S3_URL" iam create-access-key --user-name my-service
```

Store the returned secret access key immediately; it cannot be retrieved again. Credentials created this way are not managed by the platform, so rotation and deletion are your responsibility.

## Cluster Administration

Cluster-level tasks use `weed shell`, which connects to the master inside the cluster:

```bash
# single-node profile
kubectl exec -it -n seaweedfs deploy/seaweedfs-all-in-one -- weed shell

# high-availability profile
kubectl exec -it -n seaweedfs seaweedfs-master-0 -- weed shell
```

Single commands can be piped in:

```bash
echo 's3.bucket.list' | kubectl exec -i -n seaweedfs deploy/seaweedfs-all-in-one -- weed shell
```

Useful commands:

| Task | Command |
|---|---|
| List buckets | `s3.bucket.list` |
| Set a bucket quota | `s3.bucket.quota -name=example-bucket -op=set -sizeMB=1024` |
| Remove a bucket quota | `s3.bucket.quota -name=example-bucket -op=remove` |
| Clean up aborted multipart uploads | `s3.clean.uploads -timeAgo 24h` |
| Reclaim space from deleted objects | `volume.vacuum -garbageThreshold=0.1` |
| Show volume usage | `volume.list` |
| Show usage per bucket path | `fs.du /buckets` |

Give shared or user-facing buckets a quota so one bucket cannot fill cluster storage. Alerting covers capacity, but a quota is cheaper than a recovery.

Object expiration uses the S3 bucket lifecycle API, which is useful for pipeline artifacts and other data with a known retention period:

```bash
aws --endpoint-url "$S3_URL" s3api put-bucket-lifecycle-configuration \
  --bucket example-bucket --lifecycle-configuration file://lifecycle.json
```

Do not apply expiration rules to buckets holding records, registered models, or audit-relevant artifacts unless the retention policy allows deletion.

## Admin UI

Both profiles run the SeaweedFS admin UI as the `seaweedfs-admin` workload. It has no ingress and authenticates against static credentials in the `seaweedfs-admin-secret` Secret:

```bash
kubectl port-forward -n seaweedfs svc/seaweedfs-admin 23646:23646
```

The UI shows cluster topology, volumes, and buckets. It is an operational dashboard, not the administration interface. Day-to-day work happens through `weed shell` and the S3/IAM APIs.

## Storage Sizing

SeaweedFS data lives on PVCs provisioned by the cluster's StorageClass, node-local for single-node deployments and replicated for HA deployments.

| Profile | PVCs |
|---|---|
| `seaweedfs-aio` | one 50Gi data volume |
| `seaweedfs-ha` | one 20Gi data volume per volume server, plus one 4Gi volume per master |

Sizes come from the profile values in the platform repository. Changing them means re-rendering the manifests there, not editing them in the cluster.

Resizing is a manual operation because the chart's resize hook is disabled: back up first, disable auto-sync for the object-store application, scale the workload down if the StorageClass requires it, patch the PVCs, scale back up, then raise the size in the profile values so the repository matches the cluster. StatefulSet volume claim templates are immutable, so a raised size applies only to volume servers created afterwards. Replicated volumes can usually be grown but not shrunk; shrinking requires copying the data onto a new, smaller volume.

## Monitoring

Both profiles ship a ServiceMonitor per component and a SeaweedFS Grafana dashboard. The prokube cluster overview dashboard additionally graphs bucket sizes and volume-server capacity. Platform alert rules cover component availability, volume-server free space at 25%, 10%, and 2%, disk errors, and the S3 gateway 5xx rate. See [Observability](../platform/observability.md).

## Backup

The `s3-backup` module backs up the object store with an rclone CronJob that syncs the live S3 endpoint into the external backup store under the `s3` prefix, keeping a full mirror in `live/` and previous versions of changed or deleted objects in `old-versions/<timestamp>/` with 7 days of history. Because the copy happens through the S3 API, volume snapshots are not required. See [Backup and Restore](backup_restore.md).

## Troubleshooting

| Symptom | Check |
|---|---|
| A workload reports invalid access key or access denied | Whether `s3creds` exists in the workspace namespace, whether its key id still exists in the object store (`iam list-users`, `iam list-access-keys`), and the user-management-operator logs. Denial on one bucket is a policy problem, not a credential problem. |
| Gateway returns 500 errors on `seaweedfs-ha` | Filer and PostgreSQL health. The filer stores metadata, S3 identities, and policies in PostgreSQL; if the database is unavailable, the gateway cannot serve requests. A `PostgresCluster` stuck in provisioning usually means the PostgreSQL operator is missing or unhealthy. |
| Large upload fails | Use a client that splits objects into multipart uploads (`aws s3 cp`, `rclone`, `boto3` `upload_file`, `s3fs`). If a single large request is still rejected by the ingress request-body limit, upload against the port-forwarded in-cluster gateway. |
| Out of space | Reclaim deleted-object space with `volume.vacuum`, clean aborted multipart uploads with `s3.clean.uploads`, expire old objects with lifecycle rules, or grow the volumes. |
| Storage is slow | Throughput is dominated by the disk behind the volume servers. Move the SeaweedFS volumes to a dedicated SSD through its own StorageClass. |

Useful state:

```bash
kubectl get pods -n seaweedfs
kubectl get svc -n seaweedfs
kubectl logs -n seaweedfs statefulset/seaweedfs-filer
```

## Migration from MinIO

Deployments upgrading from a MinIO-based prokube release do not get an automatic data migration. The MinIO applications are removed from the deployment and their namespace is left behind unmanaged, so export any bucket contents you still need before upgrading and import them into SeaweedFS afterwards with an S3 client.

Bucket names and the `s3creds` Secret keep their names and keys, but the first reconcile against the new object store issues fresh access keys, so pods that read them as environment variables need a restart to pick up the new pair. The external endpoint moves to `https://s3.<your-prokube-domain>`, and there is no replacement for the MinIO Console: administration happens through the S3 and IAM APIs, and users browse their buckets in the prokube [File Storage](../platform/file_storage.md) UI.

## Related Pages

- [File Storage](../platform/file_storage.md)
- [Storage Administration](storage.md)
- [Backup and Restore](backup_restore.md)
- [User Management](user_management.md)
