# System Status

The prokube UI includes a **System Status** page for platform administrators. It runs live health checks against backend components and shows whether platform services are healthy, degraded, unhealthy, or disabled.

Use this page for a fast first check when users report platform issues. It is not a replacement for Grafana, Prometheus, Loki, Argo CD, or detailed Kubernetes debugging, but it can quickly show whether a backend integration is reachable.

## Access

Open **System Status** from the admin area in the prokube UI. Depending on the deployment, it may also be available at `/system-status`.

The page and its API are only accessible to users with administrator privileges. Users without the required role see an access denied message.

## Health States

The page displays a component health dashboard with one card per backend component. Each card includes:

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

The summary bar counts healthy, degraded, unhealthy, and disabled components. The page also shows backend metadata such as backend version and enabled backend modules.

## Refresh Checks

Click **Run All Checks** to rerun health checks manually.

Enable **Auto-refresh** when you want the page to rerun checks periodically while watching a rollout or investigating an incident. Auto-refresh runs every 30 seconds.

Use manual refresh for normal checks. Use auto-refresh only while actively monitoring; for long-running observability, use Grafana, Prometheus, and alerting instead.

## Recommended Workflow

When users report an issue:

1. Open **System Status** and run all checks.
2. Look for degraded or unhealthy components.
3. Check whether the affected feature depends on the unhealthy component.
4. Open the relevant detailed admin tools, such as Grafana, Loki, Argo CD, Kubernetes events, or pod logs.
5. Use the component detail message as a starting point, not as the final root cause.

## Limitations

- The page checks backend components and integrations, not every workload in every workspace.
- A healthy status means the health check passed; it does not guarantee that all user workflows are healthy.
- A disabled status can be expected when a module is intentionally not enabled in a deployment.
- Detailed historical metrics, alerts, and logs remain in Grafana, Prometheus, Alertmanager, and Loki.

## Related Pages

- [Observability](../platform/observability.md)
- [Kubernetes Resources](../platform/kubernetes.md)
- [Admin Documentation](index.md)
