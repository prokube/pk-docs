# API Access

API access is a shared platform capability used by both AgentOps and MLOps.

Agent Gateway is the preferred path for public programmatic access to selected platform APIs. It can protect model-serving endpoints, sandbox APIs, MCP servers, agent endpoints, and other route families.

## Concepts

- Browser users authenticate through the normal UI login flow.
- Programmatic clients use scoped API keys.
- API keys should be scoped by workspace and route family.
- Public API routes should not bypass Agent Gateway.

## Current SDK Note

The current Python and TypeScript SDKs send API keys as `x-api-key`. Bearer-style keys are not the SDK default right now.
