# Storage Administration

prokube uses Kubernetes storage for workspace volumes, notebook homes, databases, object-storage tenants, pipeline artifacts, and model-serving data. Storage behavior is deployment-specific and depends on the installed StorageClasses and CSI drivers.

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

Use replicated storage for stateful components that need higher availability, such as databases or object-storage volumes, when the cluster has enough nodes and disks to support the replica count.

## Component Usage

Typical storage choices:

| Component | Storage considerations |
|---|---|
| Labs | Persistent home volumes are convenient for interactive work but can be constrained by `ReadWriteOnce` attachment. |
| Pipelines | Prefer object storage for artifacts and datasets instead of relying on Lab volumes. |
| MLflow | Metadata and artifacts need backup; artifact storage can grow quickly. |
| MinIO | Tenant volumes require deliberate sizing, backup, and migration planning. |
| Databases | Use storage with snapshot/backup support and predictable latency. |
| Model Serving | Large models should live in object storage or MLflow, with optional cache support where configured. |

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
- [Object Storage](../platform/object_storage.md)
