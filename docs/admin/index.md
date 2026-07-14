# Admin Documentation

Admin documentation covers installation planning, platform configuration, user and workspace administration, operations, upgrades, and troubleshooting.

Use these pages when you operate a prokube deployment, connect it to organizational infrastructure, or expose custom workloads through the platform. User-facing concepts that apply across Labs, MLOps, and AgentOps are documented under [Foundation](../platform/index.md).

## What Admins Own

- deployment prerequisites such as Kubernetes, DNS, TLS, storage, identity, and registry access;
- workspace, user, group, and network-policy administration;
- external identity-provider and custom application integration;
- capacity-sensitive resources such as storage, GPUs, databases, and file storage;
- backup, restore, upgrade, observability, and incident runbooks.

## Available Pages

| Page | Use it for |
|---|---|
| [Installation Planning](./installation.html) | Planning Kubernetes, DNS, TLS, identity, registry, and storage prerequisites before installation. |
| [User Management](./user_management.html) | Managing users, workspaces, groups, workspace access, and workspace security policy settings. |
| [Identity Providers](./identity_providers.html) | Connecting external SSO providers to Keycloak and troubleshooting login/group mapping. |
| [Network Policies](./network_policies.html) | Defining reusable egress profiles and assigning outbound network restrictions to workspaces. |
| [Application Networking](./application_networking.html) | Exposing custom applications through prokube gateways and Istio routing. |
| [Application Authentication](./application_authentication.html) | Choosing gateway authentication or direct OIDC for custom applications. |
| [Storage](./storage.html) | Understanding StorageClasses, local storage, replicated storage, and PVC troubleshooting. |
| [GPU Administration](./gpu.html) | Operating GPU nodes, NVIDIA GPU Operator, timeslicing, MIG, and GPU monitoring. |
| [Backup and Restore](./backup_restore.html) | Disaster-recovery scope, backup storage, restore expectations, and validation. |
| [Upgrading](./upgrading.html) | Planning release upgrades, GitOps-driven rollout, and post-upgrade validation. |
| [Operations Runbooks](./operations_runbooks.html) | Administrator runbooks for MinIO, Keycloak bootstrap, and observability operations. |
| [System Status](../platform/system_status.html) | Checking administrator-only backend component health and backend metadata; the same page also shows workspace pod quota to all users. |

Platform-wide metrics, dashboards, alerts, and log-retention configuration remain administrator/operator topics. Use [System Status](../platform/system_status.html) for quick backend health checks, then use the deployment's Grafana, Prometheus, Alertmanager, and Loki tools for detailed monitoring.
