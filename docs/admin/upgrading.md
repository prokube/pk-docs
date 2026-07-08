# Upgrading

Upgrade prokube with the release-specific instructions for the target version. Do not use backup and restore as a version-upgrade mechanism unless a release explicitly documents that path.

## Before Upgrading

Prepare the upgrade as an operational change:

- read the release notes and migration notes for every skipped version;
- verify the target Kubernetes version and component compatibility;
- confirm a recent successful backup and restore procedure;
- check cluster health, node capacity, and storage capacity;
- pause or drain user workloads where required by the release notes;
- identify the GitOps repository, branch, and Argo CD applications that control the deployment.

## GitOps-Managed Deployments

In GitOps-managed deployments, upgrade by changing the authoritative deployment configuration, not by patching live resources manually.

Typical flow:

1. Create an upgrade branch from the deployment repository.
2. Apply the release-specific changes.
3. Review generated manifests and environment overlays.
4. Merge or push through the deployment's normal approval path.
5. Refresh and sync the affected Argo CD applications.
6. Watch reconciliation, pods, jobs, and application health until the platform is stable.

Avoid force pushes and live hotfixes unless the deployment runbook explicitly requires them and the rollback path is clear.

## Kubernetes and Node Upgrades

Kubernetes or node upgrades can affect stateful workloads and `ReadWriteOnce` volumes. Before draining nodes, check for Labs, database pods, MinIO pods, MLflow components, and model-serving workloads with local or node-bound storage.

If a pod cannot move during a drain, inspect:

- PVC access mode and topology;
- pod disruption budgets;
- node selectors and affinities;
- GPU or local-storage constraints;
- controller reconciliation status.

Do not delete stuck stateful pods or volumes to force progress unless the storage and application recovery implications are understood.

## After Upgrading

Validate user-facing and admin paths:

- login and workspace selection;
- Labs start/stop and volume mounting;
- object storage browser and S3 access;
- Pipelines submission and run logs;
- MLflow login, tracking, and artifact access;
- Model Serving deployment and endpoint testing;
- System Status, Grafana, Prometheus, Loki, and Alertmanager;
- backup jobs and monitoring alerts.

## Related Pages

- [Backup and Restore](backup_restore.md)
- [Installation Planning](installation.md)
- [Operations Runbooks](operations_runbooks.md)
