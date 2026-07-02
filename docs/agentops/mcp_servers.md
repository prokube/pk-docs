# MCP Servers

MCP Servers expose tools, skills, and internal APIs to AI agents through the Model Context Protocol.

In prokube.ai, MCP servers are part of the AgentOps track and are managed as platform resources rather than ad-hoc local processes.

## Goals

- Make tools discoverable and manageable.
- Keep tool access scoped by workspace and identity.
- Support MCP-capable agent clients.
- Connect agents to internal APIs without distributing broad credentials.

## Related Components

- ToolHive operator
- pkui MCP Servers module
- Agent Gateway public routes
- Workspace identity and policy controls
