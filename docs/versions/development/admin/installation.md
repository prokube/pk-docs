# Installation Planning

This page lists the infrastructure prerequisites for installing prokube. Use it before running the release-specific installation automation.

## Kubernetes Cluster

prokube runs on Kubernetes. Supported distributions include managed Kubernetes services such as GKE, EKS, and AKS, plus self-managed clusters such as MicroK8s, kubeadm-based clusters, OpenShift, or Rancher-backed installations.

Recommended baseline for a multi-user deployment:

| Resource | Minimum | Recommended |
|---|---:|---:|
| Kubernetes version | `1.32` to `1.35` | `1.35` |
| Nodes | 3 | 3 or more, across failure domains where possible |
| Memory per node | 32 GB | 96 GB |
| CPU per node | 8 cores | 24 cores |
| Storage per node | 100 GB | 1 TB |

These values are starting points. Actual sizing depends on enabled product tracks, number of users, notebook and pipeline concurrency, model size, GPU use, retention periods, and whether platform databases and file storage run in the same cluster.

Before installation, confirm:

- Kubernetes version and distribution are supported by the target prokube release;
- nodes have enough CPU, memory, storage, and optional GPU capacity for the selected product tracks;
- the cluster has a default StorageClass and any additional classes needed for file storage, notebooks, databases, and model-serving workloads;
- a CSI driver and snapshot support exist if backup workflows depend on volume snapshots;
- administrators have `kubectl` and cluster-admin access for bootstrap and recovery.

MicroK8s can be suitable for very small self-managed deployments. Production and multi-user deployments need capacity, availability, backup, storage, and operational controls sized for the expected workloads.

If the deployment will run GPU workloads, choose GPU hardware supported by the NVIDIA GPU Operator and confirm the selected Kubernetes distribution is supported by the operator. See [GPU Administration](gpu.md).

## DNS and TLS

Plan stable DNS and trusted TLS before onboarding users.

Most installations need DNS names that resolve to the external load balancer or ingress nodes. A common layout uses one name for the main prokube UI and APIs and a separate name for MinIO, for example:

```text
prokube.example.com
minio.prokube.example.com
```

The exact hostnames depend on the deployment's ingress and file-storage configuration. Keep them stable after installation because login redirects, OIDC clients, API URLs, and generated links depend on them.

At minimum, decide:

- the public prokube domain;
- whether MinIO uses a separate hostname;
- whether applications use path-prefix routing on the main domain or dedicated subdomains;
- certificate issuer and renewal process;
- how private or self-signed certificate authorities are distributed to users, workloads, and platform components.

TLS certificates must cover all public hostnames. Public Let's Encrypt certificates are suitable when the names are publicly reachable and ACME challenges can complete. Private certificates are possible, but clients, workloads, and platform components must trust the issuing CA.

Some prokube deployments distribute private CA trust into workloads with cert-manager trust bundles and Kyverno mutation policies. In that setup, the custom CA is published as a namespace-local bundle and injected into annotated pods, including selected Labs and pipeline workflows. Verify that the custom-CA bundle and Kyverno policies are installed before relying on private certificates for user workloads.

Several platform services rely on browser redirects. Incorrect root URLs, missing TLS trust, or changed hostnames commonly break login and OIDC flows.

## Networking and Firewall

The cluster needs outbound access for image pulls, package downloads, identity-provider endpoints, file-storage targets, and webhook integrations used by the deployment. Inbound access should be restricted to the gateways and admin access paths that are intentionally exposed.

For user traffic, allow access to:

| Port | Purpose |
|---:|---|
| `443` | HTTPS access to prokube, APIs, and exposed applications. |
| `80` | Optional HTTP redirect to HTTPS. |

For administrator access, expose the Kubernetes API only through the deployment's approved access path, such as private networking, VPN, bastion, provider IAM, or a restricted load balancer. Do not expose cluster admin ports broadly to user networks.

Self-managed clusters also need node-to-node traffic for Kubernetes control plane, kubelet, etcd or dqlite, CNI networking, and distribution-specific agents. Examples include API server, kubelet, controller-manager, scheduler, etcd peer/client, MicroK8s dqlite, and Calico VXLAN traffic. The exact ports depend on the Kubernetes distribution and CNI.

For self-managed clusters, use the distribution's firewall guide as the source of truth. The following ports are commonly relevant for MicroK8s-style or kubeadm-style installations and should be restricted to cluster nodes or administrator networks, not broadly exposed to users:

| Port | Scope | Purpose |
|---:|---|---|
| `16443` | admin / control plane | Kubernetes API server in MicroK8s deployments. Other distributions often use `6443`. |
| `10250` | node-to-control-plane | Kubelet API with authenticated TLS access. |
| `10257` | control plane | kube-controller-manager HTTPS endpoint. |
| `10259` | control plane | kube-scheduler HTTPS endpoint. |
| `2379` | control plane | etcd client requests. |
| `2380` | control plane | etcd peer communication. |
| `12379` | control plane | MicroK8s etcd endpoint in deployments that use etcd. |
| `19001` | control plane | MicroK8s dqlite cluster coordination. |
| `25000` | cluster nodes | MicroK8s cluster-agent traffic. |
| `4789` | cluster nodes | Calico VXLAN overlay traffic when Calico VXLAN is used. |

Do not open deprecated or unauthenticated endpoints such as the kubelet read-only port. Use the firewall guidance for the selected Kubernetes distribution and keep control-plane traffic private wherever possible.

## Identity and SSO

Decide whether prokube will use local Keycloak users, an external corporate identity provider, or both. For corporate SSO, create an OIDC application with the organization's identity provider and connect it through Keycloak.

Before production rollout:

- configure external IdP integration if needed;
- test login with a normal user and an administrator;
- define default groups and workspace access process;
- document break-glass administrator access;
- define client-secret rotation ownership.

See [Identity Providers](identity_providers.md) for external IdP guidance.

## Registry and Source Repositories

prokube workloads pull platform images, user images, pipeline component images, notebook images, and serving images. Users will often need to build and push their own images for custom notebooks, pipeline components, and model-serving containers.

Plan:

- which container registries are allowed;
- where users can push custom images;
- how global image pull secrets are managed;
- how workspace-specific registry credentials are created;
- which Git or GitOps repositories are authoritative for deployment configuration;
- whether users can build and push images from Labs;
- whether the source repository platform should support webhooks or CI integration for image builds.

Common source platforms include GitHub, GitLab, Bitbucket, and self-hosted Git servers. The registry must be reachable from the cluster and should support the retention, vulnerability scanning, and access-control policy required by the organization.

See [Workspace Defaults and Image Pull Secrets](operations_runbooks.md#workspace-defaults-and-image-pull-secrets) and [Registry Credentials](../platform/kubernetes.md#registry-credentials).

## Storage Sizing

Object storage, notebook volumes, MLflow artifacts, pipeline artifacts, and model files can grow quickly. Size MinIO tenants, databases, and persistent-volume storage before onboarding users.

For production deployments, avoid accepting placeholder storage sizes from a demo installation. Define expected retention, dataset size, model size, pipeline concurrency, and backup requirements first.

## Related Pages

- [Storage](storage.md)
- [Backup and Restore](backup_restore.md)
- [Identity Providers](identity_providers.md)
- [Operations Runbooks](operations_runbooks.md)
