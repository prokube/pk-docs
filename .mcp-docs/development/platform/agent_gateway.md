# Agent Gateway

Agent Gateway is the shared routing and policy layer for external API traffic in prokube, built on [agentgateway](https://agentgateway.dev/), an AI-native Gateway API implementation. It gives programmatic clients a single, API-key-authenticated way to reach model, tool, and agent endpoints running in a workspace, without a browser session and without exposing each service through its own ad hoc ingress.

::: info Upstream references
- [agentgateway documentation](https://agentgateway.dev/docs/)
- [agentgateway on Kubernetes](https://agentgateway.dev/docs/kubernetes/latest)
:::

Agent Gateway is not an agent-only feature. The same routing and policy model fronts classic model-serving endpoints, Knative services, MCP servers, memory stores, and kagent A2A agents. It's a Foundation-level concept used by [MLOps](../mlops/model_serving.html), [AgentOps](../agentops/agent_gateway.html), and [Labs](../labs/opencode.html) alike. This page covers the shared routing model. For the AgentOps-specific view, see [Agent Gateway for AgentOps](../agentops/agent_gateway.html).

## When to Use Agent Gateway

- Call model-serving endpoints from an external application, script, or CI job.
- Expose MCP servers or memory stores to external agent clients.
- Reach kagent agents through agent-to-agent (A2A) calls from outside the cluster.
- Call a Knative-served endpoint from outside the platform.

This list is not exhaustive: any external, API-key-authenticated call to a workspace service goes through Agent Gateway.

For interactive work in the prokube UI, use your normal user session instead. Agent Gateway is for programmatic clients.

## Path Families

Agent Gateway exposes one public path family per service type. Each path is workspace-scoped and requires an API key with a matching scope.

| Family | Path pattern | Backed by |
|---|---|---|
| `/svc/ai` | `/svc/ai/<workspace>/models/<route-id>/v1/...` | OpenAI-compatible LLM traffic (chat completions, embeddings, rerank): self-hosted models deployed through [LLM Serving](../agentops/llm_serving.html), and [external models](../admin/external_models.html) granted by an administrator. Classic (non-LLM) KServe models never use this family. |
| `/svc/serving` | `/svc/serving/<workspace>/<name>` | Classic KServe InferenceServices (V1/V2 predict protocol) and Knative Services. Both share this one path family: `<name>` resolves against whichever resource matches. |
| `/svc/mcp` | `/svc/mcp/<workspace>/<server>` | MCP servers and MCP-compatible memory stores |
| `/svc/a2a` | `/svc/a2a/<workspace>/<agent>` | kagent agent-to-agent access |

A key authorizes only the services in its current scopes: individual services, or aggregate scopes such as **All MCP servers** that also cover matching services created later. A request to any other path is rejected even if the key is otherwise valid. See [API Keys](api_keys.html#create-a-key) for how scopes are selected.

## Public vs. Internal Traffic

Agent Gateway separates two kinds of callers:

- **Public**: external clients calling a `/svc/ai`, `/svc/serving`, `/svc/mcp`, or `/svc/a2a` path with an API key. This is what SDKs, CI jobs, and external integrations use.
- **Internal**: workloads running inside the same workspace (for example, an agent calling another service in-cluster) use Agent Gateway's internal `/_platform/...` routes. Istio authorization policies admit these calls based on the workload's service mesh identity instead of an API key, so you do not need to create or manage a key. The calling workload must therefore run with an Istio sidecar: internal requests without a mesh identity are rejected with `403`.

You only need to think about API keys for the public path.

## Managing Access

API keys are the unit of access control for Agent Gateway. Create, scope, rotate, and disable them from the **API Keys** sidebar page. Each key belongs to one workspace and, optionally, to a specific set of services in that workspace.

See [API Keys](api_keys.html) for the full create/edit/rotate/disable workflow, client authentication formats, and troubleshooting.

## Usage and Traffic

Agent Gateway logs every call it handles. prokube shows these calls in several places:

- [Gateway Usage](gateway_usage.html) under **Monitoring**: all calls in the selected workspace by source, caller, and API key, with estimated LLM cost and individual calls. Any workspace member can open it.
- The **Traffic** views on model, MCP server, memory store, and agent pages: calls that one resource received.
- For administrators, [LLM Usage and Cost](../admin/llm_usage.html) for LLM calls across all workspaces, and [System Status](system_status.html#agent-gateway-traffic) for internal calls, token calls, and calls without valid credentials across all workspaces.

## Related Pages

- [Agent Gateway for AgentOps](../agentops/agent_gateway.html)
- [API Keys](api_keys.html)
- [Gateway Usage](gateway_usage.html)
- [Model Serving](../mlops/model_serving.html)
- [Serverless](../mlops/knative.html)
- [MCP Servers](../agentops/mcp_servers.html)
- [External Models](../admin/external_models.html)
