# Workspaces

Workspaces are the main scope boundary in prokube. They group the workloads, storage, credentials, and access rules that belong to a user or team.

Use this page to understand what changes when you switch workspaces, what access levels mean, and which security implications matter when sharing a workspace.

## What a Workspace Controls

The selected workspace affects which resources you can see and create across the platform:

- Labs and their mounted workspace storage
- pipeline runs, experiments, and related Kubernetes resources
- model-serving endpoints and serverless workloads
- workspace-scoped secrets and registry credentials
- object-storage buckets and access credentials
- AgentOps resources such as sandboxes, MCP servers, and memory stores where enabled

Each workspace has its own Kubernetes namespace. That namespace is one part of the workspace boundary; the workspace also includes platform-level access rules, storage configuration, UI scope, and integrations with other services.

## Personal and Shared Workspaces

### Personal Workspaces

Each user gets a personal workspace for their own experiments, development environments, and private platform resources.

### Shared Workspaces

Shared workspaces are for teams that work together on cluster resources such as pipelines, models, agents, Labs, object-storage buckets, and workspace-scoped credentials.

Use a shared workspace when multiple users need to collaborate on the same resources.

::: warning Keep workspace boundaries intentional
Do not invite contributors into personal workspaces. Personal workspaces commonly contain user-specific Labs, storage, credentials, and temporary experiments.

Do not put personal credentials, administrator tokens, or unrelated customer data into a shared workspace. Use credentials created for that team and workload instead.
:::

## Access Levels

Workspace access determines what a user can do inside that workspace.

| Access level | Typical capabilities |
| --- | --- |
| View | Inspect workloads, metadata, logs, and workspace resources where read access is allowed. |
| Edit | Create, update, and delete workspace workloads such as Labs, pipelines, model-serving resources, and secrets. |
| Owner | Manage the workspace and its contributors where owner-level access is enabled. |

Exact permissions can depend on platform configuration. When in doubt, check with your platform administrator before storing sensitive credentials or production data in a shared workspace.

## Select a Workspace

Some platform views are workspace-scoped. Select the active workspace before using services that create or inspect workload resources, such as Labs, Pipelines, MCP servers, agents, model-serving endpoints, or Kubernetes resources.

<img class="pk-docs-small-screenshot" src="../_static/screenshots/platform/workspaces/workspace-selector.png" alt="Workspace selector in the prokube UI" />

The workspace selector controls which workspace-scoped resources are shown or created in those views.

As a rule of thumb, workspace selection matters for services that schedule workloads or create workspace-scoped Kubernetes resources.

Other services handle access through their own integration with prokube. For example, object-storage browsers, MLflow, or similar integrated tools can use OIDC-based user and workspace permissions configured by the platform backend. In those cases, the active workspace selector is not necessarily the control that determines which buckets, experiments, models, or artifacts the current user can access.

## Security Implications

Workspace access affects more than UI pages. It can also affect Kubernetes resources, mounted storage, object-storage credentials, registry credentials, and workload configuration.

Users with sufficient workspace access may be able to read [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/) in the workspace namespace. Store only credentials that are intended for that workspace and workload.

For production workloads, use dedicated credentials with the minimum required access.

## Request or Change Access

Workspace access must be managed by platform administrators in prokube. If you need access to a workspace, or if a user should be added or removed, contact your administrator.

If you administer prokube, see the existing [IAM user management documentation](https://docs.prokube.ai/latest/admin_docs/iam_user_management/) while the new admin docs are being migrated.

## Related Pages

- [Using Labs](../labs/index.md)
- [API Access](api_access.md)
- [API Keys](api_keys.md)
