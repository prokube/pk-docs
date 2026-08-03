# Agents

prokube runs agents on [kagent](https://kagent.dev/), a Kubernetes-native agent runtime. Agents, their model configuration, and their tools are Kubernetes custom resources, managed through the pkui **Agents** page in your workspace.

::: info kagent documentation
Upstream references:

- [kagent documentation](https://kagent.dev/docs)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
:::

This page covers the prokube-specific workflow for wiring a model, tools, and an agent together, and testing the result. For tool hosting itself, see [MCP Servers](mcp_servers.html).

## When to Use Agents

Use the Agents page when you need a conversational or task-driven agent that calls an LLM and, optionally, tools exposed through MCP servers or other agents. Use it instead of a standalone script when you want the agent's configuration versioned as Kubernetes resources, observable through pkui, and reachable by other workloads over A2A.

## Typical Workflow

Building a working agent is a short chain of dependent resources:

1. Store the model provider's API key as a Kubernetes Secret (external providers only).
2. Create a **Model Configuration** that points at a provider or an in-cluster model.
3. Create an **Agent**, attach the Model Configuration, and select MCP tools.
4. Test the agent in the built-in chat.

### 1. Store the Provider API Key

For an **external** provider (OpenAI, Anthropic, Gemini), create a Kubernetes Secret first: open the user menu (top right) → **K8s Secrets** → **Add Secret**, and store the provider API key as a key/value pair in the workspace. See [Kubernetes Secrets](../platform/kubernetes.html#kubernetes-secrets) for the full flow.

**Internal** (in-cluster) models do not need a Secret — they authenticate over mesh identity.

### 2. Create a Model Configuration

On the **Agents** page, open **Model Configurations** → **Create ModelConfig**. The **Provider** field selects how kagent reaches the backend:

| Provider | Type | Needs a Secret? |
|---|---|---|
| OpenAI (external) | External | Yes |
| Anthropic (external) | External | Yes |
| Gemini (external) | External | Yes |
| Internal - OpenAI-compatible | In-cluster | No |
| Internal - Ollama | In-cluster | No |

- For an **external** provider, select the Secret and the secret key created in step 1, and enter the model name.
- For **Internal - OpenAI-compatible**, either pick a **Ready** model deployed through [LLM Serving](llm_serving.html) in the workspace, or enter a custom in-cluster OpenAI-compatible base URL and model name manually.
- For **Internal - Ollama**, enter the in-cluster Ollama host, for example `http://ollama.<workspace>.svc.cluster.local:11434`.

If you want a provider that is not in this list (for example Azure OpenAI, Mistral, or another OpenAI-compatible endpoint), that requires an administrator — see [Additional Providers (Administrators)](#additional-providers-administrators) below.

::: info Tool calling with internal models
Not every self-hosted model runtime supports OpenAI-style tool calling. If an agent will attach MCP tools to an **Internal** Model Configuration, deploy the underlying model through [LLM Serving](llm_serving.html) with **Enable automatic tool calling** turned on (in the deploy form's Advanced Configuration) and a tool-call parser that matches the model. This option is only available for the vLLM and HuggingFace runtimes with a Text Generation model. Without it, the agent's tool calls will not work reliably even though the Model Configuration itself is valid.
:::

### 3. Create an Agent

Still on the Agents page, open **Configured Agents** → **Create Agent**. Choose an **Agent type**:

- **Declarative**: the common case. Requires a **Name**, the **Model Configuration** from step 2, and a required **System message** describing the agent's behavior.
- **BYO**: wraps your own container image, invoked over A2A, instead of a declarative kagent agent.

For a declarative agent, attach tools:

- **MCP tools**: a searchable, filterable table of every tool discovered from MCP servers (Tools) available to the workspace. Check individual tools, or use **"Use all current and future tools from `<server>`"** per server to keep the agent in sync with a tool server automatically instead of a fixed snapshot.
- **Agent tools**: let this agent call other agents in the same workspace as tools.

MCP tools come from **Tools** on the same Agents page — connect an MCP endpoint there first if the tool you need isn't listed yet. See [MCP Servers](mcp_servers.html) for details. If the agent uses [Agent Sandboxes](sandboxes.html)-backed skills, attach the Tool that points at `sandbox-mcp`.

### 4. Test the Agent

Open the agent from the Agents list. The detail page's **Chat** tab is available once the agent is `Ready`, and shows:

- A session sidebar (new/previous sessions).
- The chat itself.
- A **Connected Tools** panel listing attached tools and their readiness.

Each response that used a tool shows a **Tool Activity** entry with the tool's arguments and result, so you can verify what the agent actually called and with what inputs — useful for debugging both prompt and tool wiring before relying on the agent elsewhere.

For programmatic access instead of the chat UI, the agent's Overview tab lists its A2A endpoint. External callers need an API key scoped to the agent (`a2a`) — see [API Keys](../platform/api_keys.html). Callers inside the same workspace can reach the agent over the internal A2A path without a key.

## Additional Providers (Administrators)

Model Configurations only offer OpenAI, Anthropic, and Gemini as external providers. Administrators can connect additional providers — Mistral AI, Azure OpenAI, GitHub Models, or any custom OpenAI-compatible endpoint — through the platform **AI Gateway** page and grant specific workspaces access to a model from that provider. A granted model then appears automatically as a normal, selectable Model Configuration in the workspace (tagged **AI Gateway** as its origin) — no per-user Secret required. See [Agent Gateway: External Model Providers](agent_gateway.html#external-model-providers-administrators) for the admin-side workflow.

## Related Pages

- [Agent Gateway](agent_gateway.html)
- [LLM Serving](llm_serving.html)
- [MCP Servers](mcp_servers.html)
- [Agent Sandboxes](sandboxes.html)
- [Memory Stores](memory_stores.html)
- [API Keys](../platform/api_keys.html)
- [Kubernetes Resources](../platform/kubernetes.html)
