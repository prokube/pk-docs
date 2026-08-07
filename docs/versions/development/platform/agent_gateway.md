# Agent Gateway

Agent Gateway is the shared routing and policy layer for external API traffic in prokube, built on [agentgateway](https://agentgateway.dev/), an AI-native Gateway API implementation. It gives SDKs, automation, CI jobs, and agent clients a single, API-key-authenticated way to reach model, tool, agent, and sandbox endpoints running in a workspace, without a browser session and without exposing each service through its own ad hoc ingress.

::: info Upstream references
- [agentgateway documentation](https://agentgateway.dev/docs/)
- [agentgateway on Kubernetes](https://agentgateway.dev/docs/kubernetes/latest)
:::

Agent Gateway is not an agent-only feature. The same routing and policy model fronts classic model-serving endpoints, Knative services, MCP servers, memory stores, kagent A2A agents, and Agent Sandboxes. It's a Foundation-level concept used by [MLOps](../mlops/model_serving.html), [AgentOps](../agentops/agent_gateway.html), and [Labs](../labs/opencode.html) alike. This page covers the shared routing model; for the AgentOps-specific view (how it moves traffic between agents, tools, and models), see [Agent Gateway for AgentOps](../agentops/agent_gateway.html).

## When to Use Agent Gateway

- Call model-serving endpoints from an external application, script, or CI job.
- Give an agent access to a sandbox API without handing it browser credentials.
- Expose MCP servers or memory stores to external agent clients.
- Reach kagent agents through agent-to-agent (A2A) calls from outside the cluster.
- Call a Knative-served endpoint from outside the platform.

This list is not exhaustive: any external, API-key-authenticated call to a workspace service goes through Agent Gateway.

For interactive work in the prokube UI, use your normal user session instead. Agent Gateway is for programmatic clients.

## Path Families

Agent Gateway exposes one public path family per service type. Each path is workspace-scoped and requires an API key with a matching scope.

| Family | Path pattern | Backed by |
|---|---|---|
| `/ai` | `/ai/<workspace>/models/<route-id>/v1/...` | OpenAI-compatible LLM traffic (chat completions, embeddings, rerank): self-hosted models deployed through [LLM Serving](../agentops/llm_serving.html), and [external models](../admin/external_models.html) granted by an administrator. Classic (non-LLM) KServe models never use this family. |
| `/serving` | `/serving/<workspace>/<name>` | Classic KServe InferenceServices (V1/V2 predict protocol) and Knative Services. Both share this one path family; `<name>` resolves against whichever resource matches. |
| `/mcp` | `/mcp/<workspace>/<server>` | MCP servers and MCP-compatible memory stores |
| `/a2a` | `/a2a/<workspace>/<agent>` | kagent agent-to-agent access |
| `/sandbox` | `/sandbox/<workspace>/...` | Agent Sandbox API |

A key only authorizes the exact routes it was scoped to at creation. A request to a path outside the key's scope is rejected even if the key is otherwise valid. See [API Keys](api_keys.html#create-a-key) for how scopes are selected.

## Public vs. Internal Traffic

Agent Gateway separates two kinds of callers:

- **Public**: external clients calling a `/ai`, `/serving`, `/mcp`, `/a2a`, or `/sandbox` path with an API key. This is what SDKs, CI jobs, and external integrations use.
- **Internal**: workloads running inside the same workspace (for example, an agent calling another service in-cluster) are authorized by their Kubernetes/mesh identity instead of an API key. This path is automatic for in-cluster workloads and does not require you to create or manage a key.

You only need to think about API keys for the public path.

## Managing Access

API keys are the unit of access control for Agent Gateway. Create, scope, rotate, and disable them from the **API Keys** sidebar page. Each key belongs to one workspace and, optionally, to a specific set of services in that workspace.

See [API Keys](api_keys.html) for the full create/edit/rotate/disable workflow, client authentication formats, and troubleshooting.

## Usage Dashboard

The API Keys page also has a **Usage** tab showing request volume, LLM token/cost estimates, and per-key activity for the selected workspace. Any workspace member can see this; administrators additionally see aggregate-only traffic that isn't tied to a specific key. See [Usage Dashboard](api_keys.html#usage-dashboard) for details.

## Related Pages

- [Agent Gateway for AgentOps](../agentops/agent_gateway.html)
- [API Keys](api_keys.html)
- [Model Serving](../mlops/model_serving.html)
- [Serverless](../mlops/knative.html)
- [MCP Servers](../agentops/mcp_servers.html)
- [Agent Sandboxes](../agentops/sandboxes.html)
- [External Models](../admin/external_models.html)
