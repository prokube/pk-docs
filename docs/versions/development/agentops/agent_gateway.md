# Agent Gateway

::: info Documentation in progress
This page is an early outline. Full Agent Gateway documentation is still being written and will be added here.
:::

Agent Gateway provides the external API access layer for AgentOps and selected MLOps workflows.

It is not only an agent feature. The same gateway model can protect sandbox APIs, MCP servers, agent endpoints, and classic model-serving endpoints.

## What It Does

- Exposes public API path families such as `/sandbox`, `/mcp`, `/a2a`, `/ai`, and `/serving`.
- Enforces scoped API-key access.
- Routes requests to workspace-scoped backends.
- Keeps public API access separate from browser-based UI login.

## Common Use Cases

- Calling model-serving endpoints from external applications.
- Giving an agent access to a sandbox API without giving it browser credentials.
- Exposing MCP servers to external agent clients.
- Separating workspace and route scopes for automation clients.

## API Keys

API keys are managed through pkui. The current Python and TypeScript SDKs send API keys as `x-api-key`. Bearer-style keys are not the SDK default right now.

Do not store API keys in source code, notebooks, screenshots, tickets, or chat messages.
