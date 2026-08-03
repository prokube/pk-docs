# Agent Gateway

Agent Gateway is the shared routing and policy layer for external API traffic in prokube. It gives SDKs, automation, CI jobs, and agent clients a single, API-key-authenticated way to reach model, tool, agent, and sandbox endpoints running in a workspace — without a browser session and without exposing each service through its own ad hoc ingress.

Agent Gateway is not an agent-only feature. The same routing and policy model fronts classic model-serving endpoints, Knative services, MCP servers, memory stores, kagent A2A agents, and Agent Sandboxes. This page provides an overview of the features enabled by Agent Gateway and explains when it is used.

## When to Use Agent Gateway

- Call model-serving endpoints from an external application, script, or CI job.
- Give an agent access to a sandbox API without handing it browser credentials.
- Expose MCP servers or memory stores to external agent clients.
- Reach kagent agents through agent-to-agent (A2A) calls from outside the cluster.
- Call a Knative-served endpoint from outside the platform.

For interactive work in the prokube UI, use your normal user session instead — Agent Gateway is for programmatic clients.

## Path Families

Agent Gateway exposes one public path family per service type. Each path is workspace-scoped and requires an API key with a matching scope.

| Family | Path pattern | Backed by |
|---|---|---|
| `/ai` | `/ai/<workspace>/models/<route-id>/v1/...` | OpenAI-compatible LLM traffic (chat completions, embeddings, rerank): self-hosted models deployed through [LLM Serving](llm_serving.html), and [external models](../admin/external_models.html) granted by an administrator. Classic (non-LLM) KServe models never use this family. |
| `/serving` | `/serving/<workspace>/<name>` | Classic KServe InferenceServices (V1/V2 predict protocol) and Knative Services. Both share this one path family; `<name>` resolves against whichever resource matches. |
| `/mcp` | `/mcp/<workspace>/<server>` | MCP servers and MCP-compatible memory stores |
| `/a2a` | `/a2a/<workspace>/<agent>` | kagent agent-to-agent access |
| `/sandbox` | `/sandbox/<workspace>/...` | Agent Sandbox API |

A key only authorizes the exact routes it was scoped to at creation. A request to a path outside the key's scope is rejected even if the key is otherwise valid — see [API Keys](../platform/api_keys.html#create-a-key) for how scopes are selected.

## Public vs. Internal Traffic

Agent Gateway separates two kinds of callers:

- **Public**: external clients calling a `/ai`, `/serving`, `/mcp`, `/a2a`, or `/sandbox` path with an API key. This is what SDKs, CI jobs, and external integrations use.
- **Internal**: workloads running inside the same workspace (for example, an agent calling another service in-cluster) are authorized by their Kubernetes/mesh identity instead of an API key. This path is automatic for in-cluster workloads and does not require you to create or manage a key.

You only need to think about API keys for the public path.

## Managing Access

API keys are the unit of access control for Agent Gateway. Create, scope, rotate, and disable them from the **API Keys** sidebar page. Each key belongs to one workspace and, optionally, to a specific set of services in that workspace.

See [API Keys](../platform/api_keys.html) for the full create/edit/rotate/disable workflow, client authentication formats, and troubleshooting.

## Usage Dashboard

The API Keys page also has a **Usage** tab showing request volume, LLM token/cost estimates, and per-key activity for the selected workspace. See [Usage Dashboard](../platform/api_keys.html#usage-dashboard) for details.

## External Models

Agents can use external models through two different paths:

| | User-created Model Configuration | Admin-managed external model |
|---|---|---|
| Providers | OpenAI, Anthropic, Gemini | Anthropic, OpenAI, Mistral AI, Azure OpenAI, GitHub Models, or a custom OpenAI-compatible endpoint |
| Credential | API key stored in a workspace Kubernetes Secret | Provider credential managed centrally by an administrator |
| Availability | Available only through that workspace's Model Configuration | Granted to selected workspaces and shown there as an **AI Gateway** Model Configuration |
| Routing | Agent connects to the provider through the Model Configuration | Model traffic is routed through Agent Gateway |

Use a user-created Model Configuration for a workspace-specific provider credential. Use the admin-managed path when credentials should be shared centrally, when workspaces need explicit model grants, or when the provider is not available in the self-service list.

Workspace users select either type from the same Model Configurations list when creating an agent. Administrators configure providers, models, and workspace grants under [External Models](../admin/external_models.html).

## Related Pages

- [API Keys](../platform/api_keys.html)
- [Agents](agents.html)
- [LLM Serving](llm_serving.html)
- [Agent Sandboxes](sandboxes.html)
- [MCP Servers](mcp_servers.html)
- [Memory Stores](memory_stores.html)
- [External Models](../admin/external_models.html)
- [Model Serving](../mlops/model_serving.html)
- [Serverless](../mlops/knative.html)
