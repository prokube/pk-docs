# Storage Administration

prokube uses Kubernetes storage for workspace volumes, notebook homes, databases, S3-compatible file-storage tenants, pipeline artifacts, and model-serving data. Storage behavior is deployment-specific and depends on the installed StorageClasses and CSI drivers.

## StorageClasses

Inspect the live cluster before making assumptions:

```bash
kubectl get storageclass
kubectl get pvc -A
```

For each StorageClass, record:

- access modes supported by the provisioner;
- whether volume expansion is allowed;
- whether snapshots are supported;
- reclaim policy;
- node-local versus replicated behavior;
- intended workload type.

## Local Storage

OpenEBS LocalPV and similar local-path provisioners can provide fast node-local volumes, often with class names such as `openebs-hostpath`. This is useful for small single-node deployments and temporary or easily recreated data.

Node-local storage is not portable across nodes. A pod using a `ReadWriteOnce` local volume must run on the node where the data exists. If the node is lost, the volume can be lost too unless another backup exists.

Use local storage only when the availability tradeoff is acceptable.

## Replicated Storage

Mayastor/OpenEBS replicated storage can provide synchronous replicas across nodes when the deployment is configured for it. Class names vary by deployment; examples include no-redundancy and three-replica classes.

Replication improves availability for node or disk failure, but it is not backup. Replication also adds capacity and performance tradeoffs because each replica consumes storage and network bandwidth.

Use replicated storage for stateful components that need higher availability, such as databases or S3-compatible file-storage volumes, when the cluster has enough nodes and disks to support the replica count.

## Component Usage

Typical storage choices:

| Component | Storage considerations |
|---|---|
| Labs | Persistent home volumes are convenient for interactive work but can be constrained by `ReadWriteOnce` attachment. |
| Pipelines | Prefer S3-compatible file storage for artifacts and datasets instead of relying on Lab volumes. |
| MLflow | Metadata and artifacts need backup; artifact storage can grow quickly. |
| MinIO | Tenant volumes require deliberate sizing, backup, and migration planning. |
| Databases | Use storage with snapshot/backup support and predictable latency. |
| Model Serving | Large models should live in S3-compatible file storage or MLflow, with optional cache support where configured. |

## Model Cache PVCs

[LLM Serving](../agentops/llm_serving.html#cache-model-weights) caches preset model weights in workspace S3 by default. Dedicated PVC caches are off by default. To offer them, enable them in the pk-ui Helm values and allowlist each StorageClass with the access modes and sizes that users may request:

```yaml
marathon:
  modelCache:
    pvc:
      enabled: true
      storageClasses:
        - name: fast-rwo
          accessModes: [ReadWriteOnce]
          minSize: 10Gi
          maxSize: 2Ti
          defaultSize: 100Gi
```

Each cache gets its own new claim; pkui never reuses existing claims. When you choose StorageClasses and access modes:

- pkui does not check which access modes a StorageClass supports. List only modes that the provisioner supports.
- A `ReadWriteOnce` cache can be mounted on only one node at a time, and pkui does not schedule a model's replicas onto that node. Replicas that land on other nodes cannot start. Offer a `ReadWriteMany` class if users need several replicas.
- The cache Job writes as a non-root user and relies on `fsGroup` to get write access to the new volume. The CSI driver must apply `fsGroup` ownership for the listed access modes.
- When a user deletes a PVC cache, pkui deletes the claim. With a `Retain` reclaim policy, the PersistentVolume and its data remain until you remove them.

LLM Serving must be enabled for model caching. In GitOps deployments, set these values in the `pkui` Argo CD Application under `spec.source.helm.valuesObject` in the GitOps branch, so that the next sync does not revert them.

## Troubleshooting PVCs

| Symptom | Check |
|---|---|
| PVC remains pending | StorageClass name, provisioner health, capacity, allowed topology, and quota. |
| Pod cannot attach volume | Existing attachment to another node, `ReadWriteOnce` constraints, stale `VolumeAttachment`, or node failure. |
| Volume expansion does not apply | `allowVolumeExpansion`, filesystem resize support, and whether the pod must restart. |
| Storage is slow | Underlying disk type, replication factor, node pressure, network bandwidth, and workload I/O pattern. |

Do not delete PVCs, PVs, `VolumeAttachment` resources, or storage-engine custom resources unless you administer the cluster and have confirmed the data is no longer needed or a restore path exists.

## Destructive Disk Operations

Some storage-engine recovery tasks require wiping disks or removing stale metadata. These operations are destructive and can permanently delete data for multiple workloads.

Before any disk wipe:

1. Identify the exact node, disk, PV, PVC, and workload owners.
2. Confirm backup or acceptance of data loss.
3. Stop workloads that might write to the disk.
4. Record current storage-engine resources and events.
5. Run the storage-engine documented recovery procedure for the installed version.

## Related Pages

- [Backup and Restore](backup_restore.md)
- [Operations Runbooks](operations_runbooks.md)
- [File Storage](../platform/file_storage.md)
