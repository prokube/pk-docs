# System Status

The **System Status** page is available from the prokube user menu. It shows workspace pod quota for workspaces you can access. For administrators, it also shows the installed platform version and edition, live backend component health checks, the state of live UI updates, and Agent Gateway traffic that is not tied to an API key.

Use this page to inspect pod quota pressure before starting new workloads, clean up completed pipeline pods, and perform a quick platform health check when you have administrator privileges.

## Access

Open the user menu in the prokube UI and select **System Status**.

![System Status in the user menu](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/platform/system-status/system-status-user-menu.png)

The page may also be available directly at `/system-status`.

All authenticated users can open the page to inspect workspace pod quota. The **Platform Information**, **Component Health**, **Realtime Operations**, **Agent Gateway traffic**, and **Backend Info** sections are visible only to realm administrators.

## Workspace Pod Quota

The top section shows pod quota usage across all workspaces you can access. Each workspace card shows:

- workspace name;
- your workspace role;
- pod quota usage, when loaded;
- running pod count;
- pending pod count;
- completed pipeline pod count;
- warning or critical state when usage approaches or exceeds the quota.

![Workspace pod quota overview](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/platform/system-status/system-status-quota-overview.png)

To keep the page responsive, quota details are not loaded for every workspace at once. The currently selected workspace is loaded automatically when it is in your accessible workspace list. If the selected workspace is not available, the first visible workspace card is loaded. Other workspace cards show **Load pod quota** until you load them manually.

Use **Refresh** on a workspace card to update that workspace's quota numbers on demand. If you have many workspaces, use **Load more workspaces** to show additional cards.

## Clean Up Completed Pipeline Pods

When a workspace has completed pipeline pods, the workspace card can show **Clean up completed pipeline pods**.

This action deletes completed Argo Workflows / Kubeflow Pipelines pod resources in that workspace. It does not delete running pods, pending pods, unrelated pods, pipeline metadata, artifacts, or logs.

Use this when completed pipeline pods are consuming workspace pod quota and blocking new work.

![Delete Completed Pipeline Pods dialog](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/platform/system-status/system-status-cleanup-dialog.png)

## Platform Information

Realm administrators see the installed prokube version, the edition, and the installation registration status.

![Platform Information with prokube version, edition, and registration status](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/platform/system-status/system-status-platform-information.png)

| Edition | Shown |
|---|---|
| **Demo** | Version and registration status. |
| **Core** | The section is titled **Platform & Subscription** and also shows **Subscription Status**, **Days Remaining**, **Valid Until**, **Grace Until**, and the **Installation ID**. |
| **Enterprise** | Version and registration status. |

The subscription status is **Active**, **Pending**, **Expiring soon**, **Grace period**, **Expired**, **Revoked**, or **Unavailable**.

### Register the Installation

When the installation is **Not registered**, the section shows **Register this installation**. Enter the **Organization** and a **Contact email**, accept the privacy statement, and select **Submit registration**. prokube.ai reviews the request manually; the status changes to **Pending**, then **Approved** or **Rejected**. After a rejection you can submit corrected details.

Registration does not change the edition. The installation stays on Demo until prokube.ai assigns Core or Enterprise. prokube.ai uses the contact details only to review and manage the registration; the contact email is stored as protected registration data and is not part of the installation's status. **Status unavailable** means that registration is not available from this cluster.

## Admin Component Health

Realm administrators also see **Component Health**. This section runs live health checks against backend components and shows whether platform services are healthy, degraded, unhealthy, or disabled.

Each component card includes:

- component name;
- health state;
- check latency in milliseconds when the component is enabled;
- a short detail message from the health check.

Possible states:

| State | Meaning |
|---|---|
| **Healthy** | The component is enabled and responded successfully. |
| **Degraded** | The component responded, but the check found a non-fatal issue. |
| **Unhealthy** | The component is enabled but failed its health check. |
| **Disabled** | The component is not enabled in the current deployment. |

The summary bar counts healthy, degraded, unhealthy, and disabled components.

![Admin Component Health](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/platform/system-status/system-status-admin-health.png)

## Realtime Operations

Realm administrators also see **Realtime Operations**. It shows whether the platform delivers live updates to the **Volumes**, **Dev Labs**, **KServe**, and **LLM** pages. When live updates fail, these pages fall back to polling and can lag behind the cluster.

The badge at the top shows the overall state:

| State | Meaning |
|---|---|
| **healthy** | Live updates work. |
| **reconnecting** | The connection to the Kubernetes API dropped. Cached data is still recent enough to use. |
| **recovering** | Data is being reloaded from the Kubernetes API. Cached data is still usable. |
| **stale** | Cached data is too old to use. Pages may show outdated state. |
| **capacity limited** | A connection, buffer, or watch limit is reached. New connections or updates can be rejected. |
| **unavailable** | The realtime service is not reachable, or the feature is not deployed. |

**Family cache health** shows the state of each page with a reason. **Transport**, **Authorization cache**, and **Diagnostics Event watches** show connection counts, limits, and counters such as reconnects and drops. Counters run from the last restart of the realtime service, shown as **Process generation**. An old non-zero count alone is not a current problem.

**Current admin browser** shows only your own browser tab: whether it receives live updates and whether its pages recently fell back to polling. It says nothing about other users.

### Troubleshoot Live Updates

1. Select **Run All Checks** to refresh the panel, or enable **Auto-refresh**.
2. If a state stays **reconnecting**, **recovering**, or **stale**, check the reason under **Family cache health**. Then check that the realtime service is ready and that the Kubernetes API is reachable and responsive.
3. If the state is **capacity limited**, find the limit that is reached under **Transport** or **Diagnostics Event watches**, and check whether drops keep increasing.
4. If only **Current admin browser** is disconnected, reload the page or sign in again.

## Agent Gateway Traffic

When the AI Gateway module is enabled, realm administrators also see **Agent Gateway traffic**. It covers calls in all workspaces that are not tied to an API key or model grant. Usage by API key and model grant is shown per workspace on [Gateway Usage](gateway_usage.html), and LLM spend across all workspaces on [LLM Usage and Cost](../admin/llm_usage.html).

![Agent Gateway traffic with internal, token, and failed calls, calls without valid credentials, the call trend, and top routes](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/platform/system-status/system-status-agent-gateway-traffic.png)

Select **Last hour**, **Last 24 hours** (default), **Last 7 days**, or **Max (N days)**. The panel shows:

- **Internal calls**: keyless calls between platform services inside the cluster, for example agents calling self-hosted models or MCP servers. See [Public vs. Internal Traffic](agent_gateway.html#public-vs-internal-traffic).
- **Token calls**: calls signed in with a user account or with a workspace notebook or pipeline token, for example to sandboxes. A token call can still fail after sign-in.
- **Calls without valid credentials**: calls with a missing or invalid API key or token. Most are rejected with `401`.
- **Failed calls**: failed calls across the three classes above.
- **Call trend**: calls and failed calls per interval.
- **Top routes**: the routes that received the most of these calls, with their class and failures. Background calls by platform controllers, such as kagent discovering MCP tools, are left out of the totals and can be shown with **Show**.

A sudden rise in calls without valid credentials usually means a client still uses a revoked or rotated key. If usage telemetry is not available, the panel says so instead of showing zero.

## Admin Backend Info

Realm administrators also see **Backend Info**, including backend version and enabled backend modules.

Use this to confirm which backend version and modules are active in the current deployment before debugging feature behavior.

![Backend Info](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/platform/system-status/system-status-backend-info.png)

## Refresh Checks

Click **Run All Checks** to rerun administrator health checks manually.

Enable **Auto-refresh** when you want the page to rerun checks periodically while watching a rollout or investigating an incident. Auto-refresh runs every 30 seconds and also updates Realtime Operations. Neither control refreshes the workspace quota cards.

Use manual refresh for normal checks. Use auto-refresh only while actively monitoring; for long-running observability, use Grafana, Prometheus, and alerting instead.

## Recommended Workflow

When a user reports that workloads cannot start:

1. Open **System Status** from the user menu.
2. Check the workspace pod quota card for the affected workspace.
3. If completed pipeline pods are consuming quota, clean them up from the workspace card.
4. If you are an administrator, run **Component Health** checks.
5. Use unhealthy or degraded component messages as a starting point, then continue in Grafana, Loki, Argo CD, Kubernetes events, or pod logs.

## Limitations

- Workspace pod quota cards show only workspaces you can access.
- Quota details are loaded per workspace, not all at once.
- Platform Information, component health checks, Realtime Operations, and Agent Gateway traffic are administrator-only.
- The page checks backend components and integrations, not every workload in every workspace.
- A healthy component status means the health check passed; it does not guarantee that all user workflows are healthy.
- A disabled status can be expected when a module is intentionally not enabled in a deployment.
- Detailed historical metrics, alerts, and logs remain in Grafana, Prometheus, Alertmanager, and Loki.

## Related Pages

- [Kubernetes Resources](kubernetes.md)
- [Observability](observability.md)
- [Pipelines](../mlops/pipelines.md)
- [Admin Documentation](../admin/index.md)
