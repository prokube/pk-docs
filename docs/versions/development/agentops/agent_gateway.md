# Agent Gateway

Agent Gateway is the shared data plane for model, MCP, and agent traffic in prokube. It connects agent runtimes to configured models and workspace tools, and exposes selected services to other applications. prokube builds this layer on [agentgateway](https://agentgateway.dev/) and the Kubernetes Gateway API.

::: info Upstream references
- [Agentgateway overview](https://agentgateway.dev/docs/kubernetes/latest/about/overview/)
- [LLM consumption](https://agentgateway.dev/docs/kubernetes/latest/llm/about/)
- [MCP connectivity](https://agentgateway.dev/docs/kubernetes/latest/mcp/about/)
- [Virtual MCP](https://agentgateway.dev/docs/kubernetes/latest/mcp/virtual/)
- [Kagent integration](https://agentgateway.dev/docs/kubernetes/latest/integrations/web-uis/kagent/)
- [Agentgateway observability](https://agentgateway.dev/docs/kubernetes/latest/observability/otel-stack/)
:::

This page explains how prokube uses Agent Gateway for agent workloads. For public paths, API-key scopes, and client authentication, see [Agent Gateway](../platform/agent_gateway.html) in Foundation and [API Keys](../platform/api_keys.html).

## Controlled Agent Traffic

<ControlledFlowsDiagram />

Agent Gateway provides common routing between the main parts of an agent workload:

- **Agent to model:** a kagent Agent uses its selected Model Configuration to reach a self-hosted or administrator-managed model.
- **Agent to tool:** workspace MCP endpoints are federated behind Agent Gateway and exposed to kagent through a `RemoteMCPServer`.
- **Agent to agent:** kagent agents are reachable over Agent2Agent (A2A) routes.
- **Application to service:** internal applications and authenticated external clients can call models, MCP servers, agents, and sandbox APIs through stable workspace routes.

prokube creates and maintains the required gateway backends, routes, workspace isolation policies, and kagent references when supported resources are created through pkui.

## Model Access

Every declarative agent references a kagent `ModelConfig`. How its traffic reaches the model depends on the configuration's origin:

| Model path | How it is connected |
|---|---|
| Model deployed through [LLM Serving](llm_serving.html) | prokube creates an OpenAI-compatible route to the in-cluster model. |
| Administrator-managed external model | The `ModelConfig` points to an internal Agent Gateway provider route. Provider credentials remain centrally managed, and access is granted per workspace and model. |
| User-created external `ModelConfig` | The agent uses the provider credential stored in the workspace Secret and connects through that configuration. This path is not automatically routed through the centrally managed provider gateway. |

Workspace users select an available Model Configuration when creating an [Agent](agents.html). Administrators manage centralized providers and workspace model grants under [External Models](../admin/external_models.html).

## MCP Federation and Tool Selection

prokube combines the MCP endpoints available in a workspace into a federated Agent Gateway backend. kagent discovers that backend through the workspace `RemoteMCPServer` named `gateway-mcp`. This gives agents one stable MCP connection even when the set of workspace MCP servers changes.

When configuring an Agent, you can either:

- select individual discovered tools, which stores their names in the Agent's `mcpServer.toolNames` field; or
- attach the complete `RemoteMCPServer` without `toolNames`, which makes all current and future tools from that connection available to the Agent.

Tool selection controls which tools kagent presents to that Agent. Do not treat it as an independent network-security boundary: prokube does not currently materialize a separate Agent Gateway authorization policy for each Agent and selected tool. Use workspace separation and narrowly scoped MCP servers when a capability requires stronger isolation.

See [Agents](agents.html) for the UI workflow and [MCP Servers](mcp_servers.html) for deploying and operating tool servers.

## Agent-to-Agent Routes

prokube creates an A2A route for each supported kagent Agent. Other workloads can use that route to invoke the Agent without depending on its backing Pod or Service address.

Workloads in the same workspace can use the internal route with their workload identity and do not need an API key. Calls from other workspace or cluster namespaces are denied. External clients use the public `/a2a/<workspace>/<agent>` path and an API key scoped to that Agent.

## External Clients

Agent Gateway also exposes workspace services to SDKs, automation, CI jobs, and agents outside the platform. Public routes are grouped by service type, including `/ai`, `/mcp`, `/a2a`, and `/sandbox`.

External access is configured through service-scoped API keys, not on this page. See [API Keys](../platform/api_keys.html) for creating, rotating, and restricting keys and [Agent Gateway](../platform/agent_gateway.html) for the public routing model.

## Observability

Traffic routed through Agent Gateway provides a common collection point for request metrics, logs, and traces. The currently documented user-facing view is the [API Key Usage Dashboard](../platform/api_keys.html#usage-dashboard), which covers requests authenticated with an API key and does not represent all internal agent traffic.

For workload logs, Kubernetes events, metrics, and currently available tracing workflows, see [Observability](../platform/observability.html). The underlying agentgateway data plane supports OpenTelemetry-based metrics and tracing integrations.

## Related Pages

- [Agents](agents.html)
- [MCP Servers](mcp_servers.html)
- [LLM Serving](llm_serving.html)
- [Agent Gateway](../platform/agent_gateway.html)
- [API Keys](../platform/api_keys.html)
- [External Models](../admin/external_models.html)
- [Observability](../platform/observability.html)
