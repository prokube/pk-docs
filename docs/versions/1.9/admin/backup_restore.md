# Backup and Restore

prokube backups are operational disaster-recovery backups. They are not an upgrade mechanism and should be restored only into a compatible prokube deployment, normally the same platform version.

Backup setup is deployment-specific. Confirm the installed backup stack, storage location, schedule, and restore procedure for the target environment before relying on it.

## What to Back Up

A useful prokube backup covers both Kubernetes resources and application data. Kubernetes manifests alone are not enough because platform components store state in databases, object storage, and persistent volumes.

Typical backup scope includes:

- Keycloak configuration and database state;
- Kubeflow Profiles, Notebook servers and volumes, Katib experiments, Pipelines metadata, and KServe resources;
- MinIO tenant configuration and object data;
- MLflow experiments, runs, artifacts, registered models, and permission state;
- platform configuration that is not otherwise recoverable from GitOps.

Some deployments use Velero plus application-specific backup steps. Others use provider-native snapshots and external database/object-storage backups. The important requirement is that restore has been tested end to end, including application data.

## Backup Storage

Store backups outside the prokube cluster. An S3-compatible bucket in a separate failure domain is a common target.

Backup storage should have:

- lifecycle and retention rules that match the recovery policy;
- restricted write/delete permissions;
- monitoring for failed uploads and unexpected growth;
- protection from accidental deletion where supported by the provider.

Backups that depend on Kubernetes volume snapshots require a CSI storage class and snapshot support. Without CSI snapshot support, notebook volumes and other persistent volumes may need a different backup method or may not be covered fully.

## Scheduling and Retention

Most production deployments run scheduled backups and allow manual backups before maintenance. The schedule and retention period are environment decisions. Do not assume that a default backup schedule exists unless it is visible in the deployment configuration and recent backup jobs have succeeded.

Before major maintenance:

1. Confirm the latest successful backup timestamp.
2. Trigger a manual backup if the last backup is too old for the planned change.
3. Confirm backup objects exist in external storage.
4. Confirm restore instructions for the installed platform version are available.

## Restore Expectations

Restores are manual operations. Plan a restore as a maintenance window, not a normal user workflow.

Before restoring:

- identify the exact prokube version and deployment configuration that produced the backup;
- verify target cluster capacity, storage classes, DNS, TLS, and identity-provider configuration;
- stop or isolate workloads that could write conflicting state;
- restore Kubernetes resources and application data in the order required by the deployment;
- validate login, workspaces, object storage, Labs, Pipelines, MLflow, and Model Serving after restore.

Replication is not backup. Replicated storage can survive a node or disk failure, but it does not protect against accidental deletion, corrupted data, faulty migrations, or destructive admin commands.

## Host-Level Items

For small self-managed deployments, also document and back up host-level configuration that is outside Kubernetes, such as SSH access policy, network configuration, firewall rules, DNS records, certificates, and cloud-provider credentials. Keep those backups in the same operational runbook as the platform restore procedure.

## Related Pages

- [Operations Runbooks](operations_runbooks.md)
- [Storage](storage.md)
- [Upgrading](upgrading.md)
