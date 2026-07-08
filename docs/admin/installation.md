# Installation Planning

This page lists planning checks for installing prokube. It is not a substitute for release-specific installation instructions or deployment automation.

## Kubernetes Cluster

prokube runs on Kubernetes. The exact supported Kubernetes versions, ingress stack, storage classes, and cloud-provider integrations are release-specific.

Before installation, confirm:

- Kubernetes version and distribution are supported by the target prokube release;
- nodes have enough CPU, memory, storage, and optional GPU capacity for the selected product tracks;
- the cluster has a default StorageClass and any additional classes needed for object storage, notebooks, databases, and model-serving workloads;
- a CSI driver and snapshot support exist if backup workflows depend on volume snapshots;
- administrators have `kubectl` and cluster-admin access for bootstrap and recovery.

MicroK8s can be suitable for very small self-managed deployments. Production and multi-user deployments need capacity, availability, backup, storage, and operational controls sized for the expected workloads.

## DNS and TLS

Plan stable DNS and trusted TLS before onboarding users.

At minimum, decide:

- the public prokube domain;
- whether applications use path-prefix routing on the main domain or dedicated subdomains;
- certificate issuer and renewal process;
- how private or self-signed certificate authorities are distributed to users, workloads, and platform components.

Several platform services rely on browser redirects. Incorrect root URLs, missing TLS trust, or changed hostnames commonly break login and OIDC flows.

## Networking and Firewall

The cluster needs outbound access for image pulls, package downloads, identity-provider endpoints, object-storage targets, and webhook integrations used by the deployment. Inbound access should be restricted to the gateways and admin access paths that are intentionally exposed.

Do not publish broad Kubernetes control-plane or node ports unless the deployment architecture requires them. Use private networking, VPN, bastion hosts, or provider-native access controls for administrative access.

## Identity and SSO

Decide whether prokube will use local Keycloak users, an external corporate identity provider, or both.

Before production rollout:

- configure external IdP integration if needed;
- test login with a normal user and an administrator;
- define default groups and workspace access process;
- document break-glass administrator access;
- define client-secret rotation ownership.

See [Identity Providers](identity_providers.md) for external IdP guidance.

## Registry and Source Repositories

prokube workloads pull platform images, user images, pipeline component images, notebook images, and serving images. Plan:

- which container registries are allowed;
- how global image pull secrets are managed;
- how workspace-specific registry credentials are created;
- which Git or GitOps repositories are authoritative for deployment configuration;
- whether users can build and push images from Labs.

See [Workspace Defaults and Image Pull Secrets](operations_runbooks.md#workspace-defaults-and-image-pull-secrets) and [Registry Credentials](../platform/kubernetes.md#registry-credentials).

## Storage Sizing

Object storage, notebook volumes, MLflow artifacts, pipeline artifacts, and model files can grow quickly. Size MinIO tenants, databases, and persistent-volume storage before onboarding users.

For production deployments, avoid accepting placeholder storage sizes from a demo installation. Define expected retention, dataset size, model size, pipeline concurrency, and backup requirements first.

## Related Pages

- [Storage](storage.md)
- [Backup and Restore](backup_restore.md)
- [Identity Providers](identity_providers.md)
- [Operations Runbooks](operations_runbooks.md)
