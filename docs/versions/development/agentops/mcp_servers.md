# MCP Servers

::: info Upstream documentation
For MCP and ToolHive concepts that are not specific to prokube, use the upstream documentation:

- [Model Context Protocol documentation](https://modelcontextprotocol.io/)
- [ToolHive documentation](https://docs.stacklok.com/toolhive/)
- [ToolHive Kubernetes CRD reference](https://docs.stacklok.com/toolhive/reference/crds/)
:::

MCP servers expose tools, data sources, and internal APIs to AI assistants through the Model Context Protocol. In prokube, MCP servers run as Kubernetes workloads managed by ToolHive instead of local processes on a developer machine.

Use an MCP server when an agent or MCP-capable client needs a tool such as browser automation, a database, or an internal API. The server runs in your workspace with its own configuration and credentials, so the agent does not need broad user credentials to reach the service.

## How prokube Runs MCP Servers

Open **MCP** from the prokube UI sidebar under **AgentOps**. Select the workspace before deploying or inspecting servers.

An MCP server is deployed into the selected workspace namespace as a [ToolHive `MCPServer`](https://docs.stacklok.com/toolhive/reference/crds/) resource. ToolHive runs the server and its local MCP proxy. prokube adds:

- a UI for deploying servers from the catalog or from a custom image;
- workspace authorization;
- logs, events, and metrics for each server;
- optional external access through Agent Gateway.

Every deployed server can be reached in two ways. Agents and other workloads in the same workspace use one shared workspace endpoint without an API key. Clients outside the workspace call each server through Agent Gateway with an API key:

![Diagram: agents and other workloads in the workspace reach all MCP servers and memory stores through one workspace MCP endpoint without an API key. External MCP clients reach each server through Agent Gateway at /svc/mcp/workspace/server with an API key that has access to that server.](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/diagrams/agentops/mcp-servers-flow.svg)

The MCP page contains two main sections:

- **Deployed Servers**: MCP servers currently running in the selected workspace.
- **Server Catalog**: ready-to-deploy MCP servers, each with its image and required configuration already described.

![MCP Servers page with deployed servers and server catalog](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/agentops/mcp/landing-page-with-server-list-and-catalogue.png)

## Deploy from the Catalog

Use the catalog for known server images and common integrations. Each catalog card describes the server and its tools, and shows compatibility badges such as **Requires Root**.

The catalog can be filtered by:

- search text;
- tier: **Official** or **Community**;
- source: **prokube.ai Only** or **Third Party Only**;
- sort order: stars or name.

Click a catalog card to deploy it. The deploy dialog shows:

- **Namespace**: target workspace namespace.
- **Server Name**: Kubernetes resource name for the MCP server.
- **Configuration**: required and optional environment variables from the catalog entry.
- **Registry Credentials**: image pull secrets available in the workspace.
- **Resource Limits**: optional CPU and memory requests and limits.
- **Technical Details**: image, transport, and provided tools.

![Deploy dialog for a catalog MCP server](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/agentops/mcp/playwright-launch-dialog.png)

Environment variables can be entered directly or read from a Kubernetes Secret in the workspace. Use Secrets for tokens, passwords, API keys, and other sensitive values. See [Kubernetes Secrets](../platform/kubernetes.html#kubernetes-secrets).

### Catalog Source and Trust

The catalog comes from the upstream [ToolHive Catalog](https://github.com/stacklok/toolhive-catalog), a community-maintained list of MCP servers. Each entry is reviewed through the ToolHive project and lists its publisher, source repository, tools, and required configuration. That makes it a safer starting point than an arbitrary container image.

A catalog entry is still not an approval for your environment. The tier tells you who maintains it:

- **Official** entries are maintained by the MCP team, the upstream project, or platform owners.
- **Community** entries are contributed and maintained by the community.
- **prokube.ai Only** narrows the list to entries published or curated by prokube.ai where available.

Before giving an MCP server credentials or access to internal systems, review what it connects to, who maintains it, which tools it exposes, and whether it needs broad permissions. Prefer Official or internally maintained servers for production workflows.

## Deploy a Custom Server

Use **Deploy Custom Server** when the server is not in the catalog or when you maintain your own image.

Required fields:

- **Server Name**: Kubernetes-compatible resource name.
- **Container Image**: image that runs the MCP server.
- **Transport Protocol**: `stdio`, `sse`, or `streamable-http`.
- **Proxy Port**: port exposed by the ToolHive proxy.

Optional fields:

- environment variables, either direct values or Secret references;
- image pull credentials for private registries;
- CPU and memory requests and limits;
- container arguments;
- root or writable-filesystem options for images that require them;
- persistent storage for servers that need data to survive pod restarts;
- live view for browser-based servers such as noVNC-backed Playwright images.

Prefer custom images that run as non-root and work with a read-only root filesystem. Images that require root or write access are harder to run in restricted workspaces and have a larger security footprint.

## Use YAML for Advanced Configuration

Use YAML when the form does not expose a setting you need. The deploy dialog can generate a ToolHive `MCPServer` manifest from the form fields. Inspect or adjust it, then submit it through the UI.

The namespace is set by prokube to the selected workspace namespace. Custom YAML must still be a ToolHive `MCPServer` resource using a supported `toolhive.stacklok.dev` API version.

### Edit Server Configuration

To change a deployed server, open it and select **Edit**. The **Edit MCP server** dialog shows its `MCPServer` YAML. You can change the image, arguments, environment values and Secret references, transport and ports, resource requests and limits, labels and annotations, and supported pod settings such as image pull Secrets, volume mounts, and security contexts. The name, namespace, persistent storage settings, and telemetry configuration cannot be changed.

Select **Save changes**. prokube accepts the new configuration, then updates the server's gateway access and isolation policies. The server runtime may restart; persistent storage is kept. The dialog stays open and shows the progress:

| State | Meaning |
|---|---|
| **Applying...** | The update was accepted and is waiting for gateway access and isolation to converge. |
| **Applied** | Gateway access and isolation match the new configuration. Check the server's status on its page to confirm that it runs. |
| **Failed** | The update could not converge or was replaced by a newer change. Close the editor and review the current configuration. |
| **Status unknown** | The update was accepted, but its status could not be read. Select **Retry status** to check again. |

**Save changes** stays disabled after an update is accepted. **Retry status** only checks the status; it never saves again. If **Retry status** is not offered, do not save again: select **Close editor** and reload the server page to inspect its current configuration.

If someone else changed the server after you opened the editor, saving fails. Reload the configuration, review the latest version, and apply your changes again.

## Connect Clients

The **Deployed Servers** table shows each server's status and, when available, its URL. Open a server to see its connection details on the **Overview** tab.

![MCP server overview with external and internal connection details](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/agentops/mcp/playwright-overview.png)

### From the Workspace

One internal endpoint serves the tools of all deployed MCP servers and [Memory Stores](memory_stores.html) in the workspace. New servers join it automatically. It accepts calls only from the same workspace and needs no API key.

- **kagent agents**: open **Agents** and select the MCP tools when creating or editing the agent. The tools appear under the managed `gateway-mcp` endpoint, with no further setup. Add an entry under **Tools** only to connect an MCP endpoint outside the workspace.
- **Other workloads**: use the internal URL shown on the **Overview** tab.

### From Outside the Workspace

External clients use the server's external URL, `https://<your-prokube-domain>/svc/mcp/<workspace>/<server>`, with an [API key](../platform/api_keys.html) that has access to that server. The **Overview** tab shows a ready-to-copy client configuration:

```json
{
  "mcpServers": {
    "<server>": {
      "type": "http",
      "url": "https://<your-prokube-domain>/svc/mcp/<workspace>/<server>",
      "headers": {
        "Authorization": "Bearer <api-key>"
      }
    }
  }
}
```

If the key was created with the `x-api-key` format, send `x-api-key: <api-key>` instead of the `Authorization` header.

In OpenCode Labs, add the server's URL from the **Overview** tab through the OpenCode MCP manager and set any required headers or OAuth settings there. See [OpenCode: Add MCP Servers](../labs/opencode.html#add-mcp-servers).

## Browser Automation Servers

Some catalog entries, such as the prokube Playwright noVNC image, include live browser viewing and trace support.

For these servers, the details page can show:

- **Live View** for an interactive browser session;
- **Traces** for recorded Playwright sessions;
- **Logs** and **Events** for debugging startup and runtime issues;
- **Metrics** for runtime monitoring.

![Live browser view for a browser automation MCP server](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/agentops/mcp/playwright-live-browser-viewer.png)

![MCP server metrics for a browser automation server](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/agentops/mcp/playwright-details-metrics.png)

Live view is only available for servers that declare live-view support in the catalog or custom configuration.

## Server Metrics

The **Metrics** tab shows Grafana panels from two sources:

- **Istio Mesh Traffic** from the server's Istio sidecar: request rate by response code, error rate, latency, mTLS versus plaintext requests, and requests by caller.
- **ToolHive Application Metrics** from the server's MCP proxy: request rate, success rate, latency, requests by MCP method, and active connections.

Servers deployed through the prokube UI report ToolHive metrics automatically. Servers deployed with `kubectl` or GitOps, and servers deployed by earlier prokube releases, report them only after they opt in. A server opts in by referencing an `MCPTelemetryConfig` with Prometheus metrics enabled and labelling its proxy pods:

```yaml
spec:
  telemetryConfigRef:
    name: <telemetry-config>
  resourceOverrides:
    proxyDeployment:
      podTemplateMetadataOverrides:
        labels:
          prokube.ai/mcp-metrics: "true"
```

Only reference an `MCPTelemetryConfig` you own: its settings can also export telemetry to other destinations. A server labelled without such a reference has no metrics endpoint and shows up as a failing monitoring target.

Adding the label restarts the server's proxy once, which drops open MCP sessions. Administrators can opt in all existing servers that already reference the prokube-managed `pkui-mcp-telemetry` config:

```bash
kubectl get mcpservers.toolhive.stacklok.dev -A -o json |
  jq -r '.items[] | select(.spec.telemetryConfigRef.name == "pkui-mcp-telemetry") | [.metadata.namespace, .metadata.name] | @tsv' |
  while IFS=$'\t' read -r namespace name; do
    kubectl patch mcpservers.toolhive.stacklok.dev "$name" -n "$namespace" \
      --type merge \
      -p '{"spec":{"resourceOverrides":{"proxyDeployment":{"podTemplateMetadataOverrides":{"labels":{"prokube.ai/mcp-metrics":"true"}}}}}}'
  done
```

## Security and Operations

- Deploy servers only in workspaces where the intended users should have access to the exposed tools.
- Store sensitive configuration in [Kubernetes Secrets](../platform/kubernetes.html#kubernetes-secrets) instead of direct environment variable values.
- Prefer **Official** or internally maintained catalog entries for production use.
- Review third-party images before granting access to internal data or network destinations.
- Avoid root and writable-root-filesystem options unless the image requires them.
- Restricted workspace security policies can reject servers that request root privileges.
- Set resource requests and limits for long-running or shared servers.
- Delete MCP servers that are no longer used.

## Troubleshooting

Most checks start on the server's details page: **Events** show scheduling and image pull problems, and **Logs** show startup and tool call errors.

![Logs tab on the MCP server details page](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/agentops/mcp/playwright-details-logs.png)

| Symptom | Check |
|---|---|
| Server stays `Pending` | Open the details page and check **Events** and **Logs**. Also verify image pull credentials and workspace quota. |
| Image cannot be pulled | Confirm the image name and select the required registry credential for private registries. See [Registry Credentials](../platform/kubernetes.html#registry-credentials). |
| Deployment is rejected by security policy | The image may require root or a writable filesystem in a restricted workspace. Use a compliant image or ask an administrator to review the workspace policy. |
| Required configuration is missing | Check the catalog entry's required environment variables and provide direct values or Secret references. |
| Client cannot connect | Confirm the server is `Running`, copy the current URL, and verify the API key is scoped to the MCP server. |
| Tool calls fail after connecting | Check server logs, required upstream credentials, workspace network policy, and whether the tool depends on an external service. |

## Related Pages

- [API Keys](../platform/api_keys.html)
- [Kubernetes Resources](../platform/kubernetes.html)
- [Agents](./agents.html)
