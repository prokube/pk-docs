# AgentOps

AgentOps in prokube covers the operational path for building, connecting, exposing, and observing AI agents on controlled workspace infrastructure.

Use [Labs](../labs/index.md) for interactive development and debugging. Use AgentOps when agent workflows need managed models, governed tool access, sandboxed execution, memory, external API access, or agent-to-agent integration.

## Main Workflows

| Workflow | Use |
|---|---|
| [Agents](agents.md) | Create kagent agents, attach model configurations and tools, test conversations, and expose agents over A2A. |
| [LLM Serving](llm_serving.md) | Deploy self-hosted OpenAI-compatible models for agents and other LLM clients, including tool-calling support where available. |
| [MCP Servers](mcp_servers.md) | Run governed MCP tool servers in a workspace and expose their tools to agents, OpenCode, and external MCP clients. |
| [Agent Sandboxes](sandboxes.md) | Give agents isolated execution environments for code, shell commands, files, package installation, and stateful task execution. |
| [Memory Stores](memory_stores.md) | Provide workspace-scoped state and retrieval capabilities for agent workflows. |
| [Agent Gateway](agent_gateway.md) | Expose models, MCP servers, agents, sandboxes, and serving endpoints to external clients through scoped API keys. |

## Typical Flow

1. Choose a model path: use an administrator-granted external model, create a workspace Model Configuration, or deploy an in-cluster model with [LLM Serving](llm_serving.md).
2. Add tools when the agent needs capabilities beyond model inference: deploy [MCP Servers](mcp_servers.md), attach sandbox-backed tools, or connect another agent.
3. Create an [Agent](agents.md), attach the Model Configuration, select the MCP or agent tools it may call, and test it in the built-in chat.
4. Use [Agent Sandboxes](sandboxes.md) when the workflow needs isolated code execution, file operations, package installation, or long-running task state.
5. Expose programmatic access through [Agent Gateway](agent_gateway.md) only when external clients, SDKs, CI jobs, or other integrations need to call the service without a browser session.
6. Use logs, events, metrics, traces, and API-key usage data to debug behavior and review operational impact.

## Access Model

AgentOps separates browser-based UI work, internal workspace traffic, and external API traffic.

| Access path | Typical caller | Authentication |
|---|---|---|
| UI | A user working in pkui | Browser session and workspace permissions |
| Internal workspace traffic | Agents, MCP servers, models, sandboxes, and other workloads in the same workspace | Kubernetes and mesh identity |
| External API traffic | SDKs, automation, CI jobs, external MCP clients, and A2A callers | Agent Gateway API key scoped to the target service |

You usually need API keys only for external clients. In-workspace agents and tools normally use the platform's internal identity and routing model.

## Foundation

AgentOps workloads run on the shared prokube foundation: workspaces, Kubernetes namespaces, RBAC, secrets, storage, observability, and API-key management.

Start with these cross-cutting pages when you need platform behavior rather than feature-specific usage:

- [Workspaces](../platform/workspaces.md)
- [Kubernetes Resources](../platform/kubernetes.md)
- [Kubernetes Secrets](../platform/kubernetes.html#kubernetes-secrets)
- [Observability](../platform/observability.md)
- [API Keys](../platform/api_keys.md)
