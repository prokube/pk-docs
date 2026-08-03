# Agent Gateway

Agent Gateway is the shared routing and policy layer for external API traffic in prokube. It gives SDKs, automation, CI jobs, and agent clients a single, API-key-authenticated way to reach model, tool, agent, and sandbox endpoints running in a workspace — without a browser session and without exposing each service through its own ad hoc ingress.

Agent Gateway is not an agent-only feature. The same routing and policy model fronts classic model-serving endpoints, Knative services, MCP servers, memory stores, kagent A2A agents, and Agent Sandboxes.

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
| `/ai` | `/ai/<workspace>/models/<route-id>/v1/...` | OpenAI-compatible LLM traffic (chat completions, embeddings, rerank): self-hosted models deployed through [LLM Serving](llm_serving.html), and external models granted through the admin AI Gateway. Classic (non-LLM) KServe models never use this family. |
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

API keys are the unit of access control for Agent Gateway. Create, scope, rotate, and disable them from the **API Keys** page (sidebar, under **Serving**). Each key belongs to one workspace and, optionally, to a specific set of services in that workspace.

See [API Keys](../platform/api_keys.html) for the full create/edit/rotate/disable workflow, client authentication formats, and troubleshooting.

## Usage Dashboard

The API Keys page also has a **Usage** tab showing request volume, LLM token/cost estimates, and per-key activity for the selected workspace. See [Usage Dashboard](../platform/api_keys.html#usage-dashboard) for details.

## External Model Providers (Administrators)

::: info Two pages, one name
The sidebar has two separate entries both labeled **AI Gateway**: **API Keys** (under **Serving**, described above, available to every user) and the provider-management page described in this section (under **Admin**, restricted to platform administrators). They are different pages for different jobs — API Keys manages access tokens, this page manages centrally-credentialed model providers.
:::

Administrators use the **AI Gateway** admin page to connect model providers once, centrally, and grant specific workspaces access to specific models — instead of every workspace holding its own provider credentials.

This is a separate mechanism from the [Model Configuration](agents.html#_2-create-a-model-configuration) that any user can create for themselves. The two differ in provider coverage and who holds the credential:

| | User's own Model Configuration | Admin-managed AI Gateway |
|---|---|---|
| Providers | OpenAI, Anthropic, Gemini | Anthropic, OpenAI, Mistral AI, Azure OpenAI, GitHub Models, or any custom OpenAI-compatible endpoint |
| Credential | User's own Kubernetes Secret | Held centrally by the admin, never exposed to the workspace |
| Who can create it | Any workspace user | Administrators only |

Use the admin path when you want to standardize on a shared provider credential (for example, a company-wide Azure OpenAI deployment), offer a provider outside the fixed OpenAI/Anthropic/Gemini list, or control exactly which workspaces can reach a given model.

### Connect a Provider and Grant Access

The page has three sections:

1. **External Providers** — **Add Provider** to connect a provider: pick it from the catalog, name it, and supply its API key. Custom and Azure OpenAI entries also need an upstream host and path prefix.
2. **Models** — under a provider's detail page, either **Discover models** (queries the provider for available model IDs) or **Add manually** (enter a model ID directly).
3. **Workspace Access** — **Grant Workspace Access** to make one model available to one workspace: pick the workspace, a route ID (this becomes the Model Configuration's name in that workspace), and the model.

A grant creates a Model Configuration in the target workspace automatically. It shows up in that workspace's Agents page like any other Model Configuration, tagged with **AI Gateway** as its origin, and agents can select it the same way as a user-created one. No Secret is created in the workspace — the credential stays with the admin-managed provider. Revoke access from the Workspace Access table when a workspace should no longer use a granted model.

A granted model is *not* selectable as a service when scoping an API key on the API Keys page — it is consumed by kagent agents through their Model Configuration, not called directly by external clients with their own key.

### Provider-Wide Usage

The AI Gateway page also shows a **Usage and Cost** panel covering all authenticated Agent Gateway traffic across every workspace, with the same time-window options (Last hour / 24 hours / 7 days / 30 days) as the per-workspace [Usage Dashboard](../platform/api_keys.html#usage-dashboard). Use it for a platform-wide view; use the per-workspace dashboard to see which key in a specific workspace generated that traffic.

## Related Pages

- [API Keys](../platform/api_keys.html)
- [Agents](agents.html)
- [LLM Serving](llm_serving.html)
- [Agent Sandboxes](sandboxes.html)
- [MCP Servers](mcp_servers.html)
- [Memory Stores](memory_stores.html)
- [Model Serving](../mlops/model_serving.html)
- [Serverless](../mlops/knative.html)
