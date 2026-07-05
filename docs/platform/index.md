# Platform Foundation

The Platform Foundation is the shared base used by both AgentOps and MLOps.

It contains the services that should not be documented as belonging exclusively to one product track.

## Shared Capabilities

- Workspaces and user management
- Identity and role-based access control
- Kubernetes resource access, quotas, and secrets
- API access and gateway integration
- Object storage, databases, and persistent volumes
- Monitoring, logging, tracing, and dashboards
- GitOps-managed operations
- Kubernetes access and resource isolation

## Why This Matters

AgentOps and MLOps are product tracks, not separate platforms. They share the same operational model and many of the same technical components.

This section should document the common layer once and link to it from both tracks.
