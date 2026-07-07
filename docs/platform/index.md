# Foundation

Foundation covers the shared platform concepts used across Labs, MLOps, and AgentOps. Start here when you need to understand workspace scope, Kubernetes access, API credentials, or operational visibility.

## Core Concepts

| Page | Use it for |
|---|---|
| [Workspaces](./workspaces.html) | Workspace selection, access boundaries, namespace mapping, and shared ownership. |
| [Kubernetes Resources](./kubernetes.html) | Kubeconfig access, quotas, pods, secrets, registry credentials, and cleanup tasks. |
| [Object Storage](./object_storage.html) | S3-compatible buckets, object paths, UI file operations, and storage access from workloads. |
| [Observability](./observability.html) | Monitoring, logging, tracing, and dashboards. |
| [System Status](./system_status.html) | Workspace pod quota, completed pipeline pod cleanup, and admin-only component health checks. |
| [API Keys](./api_keys.html) | Scoped programmatic access for SDKs, automation, serving clients, sandboxes, MCP, and external integrations. |

## Shared Model

AgentOps and MLOps are product tracks on the same platform, not separate environments. They share workspace identity, Kubernetes namespaces, access control, API routing, storage, and observability.

Feature pages link back to Foundation instead of repeating cross-cutting behavior. If a behavior applies across multiple product tracks, document it here first.
