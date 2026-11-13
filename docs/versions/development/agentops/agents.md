# Agents

prokube runs agents on [kagent](https://kagent.dev/) 1.0. Agents and everything they use are Kubernetes resources in your workspace, managed on the pkui **Agents** page. Each conversation runs as its own isolated sandbox on the platform's shared worker fleet.

::: info kagent documentation
Upstream references:

- [kagent documentation](https://kagent.dev/docs)
- [kagent architecture (resources, runtimes, egress)](https://github.com/kagent-dev/kagent/tree/main/docs/architecture)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
:::

## How an Agent Is Put Together

An agent combines a few resources. The create form shows each of them as a card:

| Card | kagent resource | Holds |
|---|---|---|
| **What the agent does** | `AgentTemplate` | Model, instructions, MCP tools, and other agents it can delegate to |
| **Runs on** | `Harness` | The runtime: kagent, Codex, Claude, or your own image |
| **Network and credentials** | `EgressPolicy` | Hosts the agent may reach and the credentials injected for them |
| **Capabilities** | `SandboxTemplate`, Harness | **Run code** and **Export traces** |

By default the form creates a template just for the new agent and runs it on the workspace's `default` harness. Choose **Use a shared template** to let several agents share one template; a change to a shared template applies to all of them.

Each conversation is a separate session that only its user sees. Sessions pause when idle and resume where they stopped.

## Typical Workflow

1. If needed, store an external provider API key as a Kubernetes Secret.
2. Choose an available **Model Configuration**, or create one.
3. Create the agent: instructions, model, tools, and what it may reach.
4. Test it in the chat.

### 1. Store the Provider API Key

Skip this step if you use an admin-provided Model Configuration or an **Internal** (in-cluster) model. Otherwise, for OpenAI, Anthropic, or Gemini, create a Kubernetes Secret: open the user menu (top right) → **K8s Secrets** → **Add Secret** and store the key, for example `ANTHROPIC_API_KEY: sk-ant-...`. See [Kubernetes Secrets](../platform/kubernetes.html#kubernetes-secrets).

### 2. Choose or Create a Model Configuration

Open the **Models** tab on the **Agents** page. Models an administrator granted to the workspace through AI Gateway appear with **AI Gateway** as their origin and need no key in the workspace. See [External Models](../admin/external_models.html).

If no suitable configuration exists, click **Create ModelConfig** and pick a **Provider**:

| Provider | Type | Needs a Secret? |
|---|---|---|
| OpenAI (external) | External | Yes |
| Anthropic (external) | External | Yes |
| Gemini (external) | External | Yes |
| Internal - OpenAI-compatible | In-cluster | No |
| Internal - Ollama | In-cluster | No |

For a self-hosted model used with MCP tools, enable **automatic tool calling** in [LLM Serving](llm_serving.html#enable-tool-calling-for-agents).

### 3. Create the Agent

On the **Agents** tab, click **Create agent** and fill in the cards:

- **What the agent does:** model, instructions, and tools. **Tools** lists the MCP servers available to the workspace (see [MCP Servers](mcp_servers.md)); select individual tools or all current and future tools of a server. Other agent templates can be added as sub-agents.
- **Runs on:** keep `default` unless you need another runtime (see [Runtimes](#runtimes)).
- **Capabilities:** turn on **Run code** if the agent should compute, transform files, or install packages. Turn on **Export traces** to send its traces to the workspace's trace export (see [Agent Tracing](agent_tracing.md)).
- **Network and credentials:** the hosts the agent may call and the credentials the gateway injects. The agent's model and MCP servers are always reachable. See [Network and Credentials](network_and_credentials.md).

Saving starts a new revision of the agent. Running conversations finish on their revision; new ones use the new one.

### 4. Test the Agent

Open the agent. The **Chat** tab is available once the status is **Ready**. Each answer that used a tool shows the tool's arguments and result, so you can check what the agent actually did. Earlier conversations are listed under **Conversations**.

The **Configuration** tab shows the agent's cards with **Edit** buttons; **Status** shows its conditions when something is wrong.

## Run Code

Agents have no shell of their own. With **Run code**, the agent starts sandboxes and runs code in them. They use a Python image and the agent's network and credential settings. You see them on the **Sandboxes** page under the filter **Agent sandboxes**.

This keeps code out of the agent: a sandbox has its own image and network rules and cannot reach the agent's control APIs. For details, see [Network and Credentials](network_and_credentials.md#run-code).

## Runtimes

| Runtime | Use it for | Notes |
|---|---|---|
| kagent | Most agents | The `default` harness; supports **Run code** |
| Claude | Coding tasks with Claude Code | Needs an Anthropic model configuration with your own key; has its own shell (`bash`, `wget`, no Python) |
| Codex | Coding tasks with OpenAI Codex | Needs an OpenAI model configuration with **API format** set to **Responses** (see below) |
| Own image | Agents you build yourself, for example with LangGraph | See [Own Images](#own-images) |

For Codex with an OpenAI model from AI Gateway, create a second model configuration next to the granted one: provider **OpenAI or OpenAI-compatible**, the same model name, base URL and API key Secret, and **API format** **Responses**. Models from Anthropic providers and self-hosted models do not offer the Responses API.

Create a runtime on the **Harnesses** tab, then select it in **Runs on**. Claude and Codex run commands in their own shell, so **Run code** is not needed; the agent's network settings apply to everything the shell does. The [`harnesses` example](https://github.com/prokube/examples/tree/kagentv1/main/kagent/harnesses) creates one agent on each.

### Own Images

An own image runs your agent code instead of the kagent runtime. It must:

- serve kagent's agent interface and store its tasks in kagent. The kagent Python packages provide the building blocks: `kagent-core` with `kagent-adk`, `kagent-langgraph`, `kagent-openai` or `kagent-crewai`. Their version must match the platform's kagent version.
- be referenced by digest (`registry/image@sha256:...`) in a Harness of type `byo`, with the command that starts it.
- be in a registry that allows anonymous pulls. The workers pull images without Kubernetes pull secrets.

The image gets its model and settings from the agent's template; API keys are added on the way out, as for other agents. The [`own-image` example](https://github.com/prokube/examples/tree/kagentv1/main/kagent/own-image) runs a LangGraph workflow this way.

## Call an Agent from Applications

External applications call an agent over A2A through Agent Gateway at `/svc/a2a/<workspace>/<agent>` with an API key scoped to that agent. Conversations started with a key belong to the key's owner. See [Agent Gateway](agent_gateway.md#agent-to-agent-routes) and [API Keys](../platform/api_keys.html).

## Examples

The [kagent examples](https://github.com/prokube/examples/tree/kagentv1/main/kagent) show one capability per step: a basic agent, MCP tools, running code, allowed hosts, injected credentials, Claude Code and Codex, an own LangGraph image, delegation, calling an agent over A2A, and tracing.

## Related Pages

- [Network and Credentials](network_and_credentials.md)
- [Agent Tracing](agent_tracing.md)
- [MCP Servers](mcp_servers.md)
- [Agent Gateway](agent_gateway.md)
- [Sandboxes](sandboxes.md)
- [LLM Serving](llm_serving.md)
- [External Models](../admin/external_models.html)
- [Agents for Administrators](../admin/agents.md)
