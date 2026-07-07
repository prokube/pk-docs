# MCP Servers

::: info Upstream documentation
For MCP and ToolHive concepts that are not specific to prokube, use the upstream documentation:

- [Model Context Protocol documentation](https://modelcontextprotocol.io/)
- [ToolHive documentation](https://docs.stacklok.com/toolhive/)
- [ToolHive MCPServer API reference](https://docs.stacklok.com/toolhive/reference/mcpserver/)
:::

MCP servers expose tools, data sources, and internal APIs to AI assistants through the Model Context Protocol. In prokube, MCP servers run as Kubernetes workloads managed by ToolHive instead of local processes on a developer machine.

Use MCP servers when an agent or MCP-capable client needs governed access to a tool, for example sandbox execution, browser automation, databases, internal APIs, or other services that should not be called with broad user credentials.

For runnable manifests and a small custom FastMCP server image, see the [`agentops/mcp-toolhive`](https://github.com/prokube/examples/tree/main/agentops/mcp-toolhive) example.

## How prokube Runs MCP Servers

Open **MCP** from the prokube UI sidebar under **AgentOps**. Select the workspace before deploying or inspecting servers.

An MCP server is deployed into the selected workspace namespace as a [ToolHive `MCPServer`](https://docs.stacklok.com/toolhive/reference/mcpserver/) resource. prokube provides the UI, workspace authorization, registry integration, logs, events, metrics, and optional gateway access. ToolHive handles the MCP server runtime and proxying inside the cluster.

The MCP page contains two main sections:

- **Deployed Servers**: MCP servers currently running in the selected workspace.
- **Server Catalog**: registry entries that can be deployed with preconfigured images, tools, metadata, and required configuration fields.

## Deploy from the Catalog

Use the catalog for known server images and common integrations. Catalog cards show the server name, description, provided tools, source, tier, repository link, and compatibility badges such as **Requires Root**.

The catalog can be filtered by:

- search text;
- tier: **Official** or **Community**;
- source: **prokube.ai Only** or **Third Party Only**;
- sort order: stars or name.

Click a catalog card to deploy it. The deploy dialog shows:

- **Namespace**: target workspace namespace.
- **Server Name**: Kubernetes resource name for the MCP server.
- **Configuration**: required and optional environment variables from the registry entry.
- **Registry Credentials**: image pull secrets available in the workspace.
- **Resource Limits**: optional CPU and memory requests and limits.
- **Technical Details**: image, transport, and provided tools.

Environment variables can be entered directly or read from a Kubernetes Secret in the workspace. Use Secrets for tokens, passwords, API keys, and other sensitive values. See [Kubernetes Secrets](../platform/kubernetes.html#kubernetes-secrets).

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

## Review YAML Before Deploying

The deploy dialog can generate a ToolHive `MCPServer` manifest before creating the resource. Use the YAML preview when you need to inspect or adjust the generated manifest.

The namespace is set by prokube to the selected workspace namespace. Custom YAML must still be a ToolHive `MCPServer` resource using a supported `toolhive.stacklok.dev` API version.

## Connect Clients

The **Deployed Servers** table shows each server's status, image, transport, proxy port, and URL when available. Copy the URL from the table or details page and configure your MCP client or agent tool to use it.

For external clients, create an [API key](../platform/api_keys.html) scoped to the MCP server. Use the authentication format expected by the client. Existing MCP and non-OpenAI-style examples commonly use `x-api-key`.

For kagent workflows, create or link a remote MCP tool endpoint from the Agents UI after the MCP server is running. The MCP server provides the tool endpoint; the agent configuration decides which agents can use it.

## Sandbox MCP

The catalog includes `sandbox-mcp`, a prokube-provided MCP server for Agent Sandbox operations.

It exposes tools for common sandbox tasks, including creating sandboxes, claiming existing sandboxes, running commands, executing code, reading and writing files, and managing sandbox pools.

When deploying `sandbox-mcp`, prokube pre-fills deployment context for the selected workspace:

- `PROKUBE_API_URL`: backend API URL reachable from the MCP server pod;
- `PROKUBE_WORKSPACE`: selected workspace namespace;
- `PROKUBE_USER_ID`: current user identity used for backend authorization.

You can also set `SANDBOX_NAME` to auto-connect to a specific sandbox on the first tool call.

## Browser Automation Servers

Some catalog entries, such as the prokube Playwright noVNC image, include live browser viewing and trace support.

For these servers, the details page can show:

- **Live View** for an interactive browser session;
- **Traces** for recorded Playwright sessions;
- **Logs** and **Events** for debugging startup and runtime issues;
- **Metrics** for runtime monitoring.

Live view is only available for servers that declare live-view support in the catalog or custom configuration.

## Security and Operations

- Deploy servers only in workspaces where the intended users should have access to the exposed tools.
- Store sensitive configuration in Kubernetes Secrets instead of direct environment variable values.
- Prefer **Official** or internally maintained catalog entries for production use.
- Review third-party images before granting access to internal data or network destinations.
- Avoid root and writable-root-filesystem options unless the image requires them.
- Restricted workspace security policies can reject servers that request root privileges.
- Set resource requests and limits for long-running or shared servers.
- Delete MCP servers that are no longer used.

## Troubleshooting

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
- [Agent Sandboxes](./sandboxes.html)
- [Agents](./agents.html)
- [`prokube/examples` MCP ToolHive example](https://github.com/prokube/examples/tree/main/agentops/mcp-toolhive)
