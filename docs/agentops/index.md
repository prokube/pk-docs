# AgentOps

AgentOps is the prokube product track for building and operating AI agents on controlled infrastructure.

It combines governed model access, tool access, memory, isolated code execution, and observability into one platform track. The goal is to let teams run agents without giving them uncontrolled credentials, unmanaged SaaS dependencies, or direct access to sensitive infrastructure.

## Core Capabilities

- **Agent Gateway** for public API routes, scoped API keys, routing, and policy enforcement.
- **Agent Sandboxes** for isolated code execution in Kubernetes-native environments.
- **MCP Servers** for exposing tools, skills, and internal APIs as governed capabilities.
- **Memory Stores** for agent state and retrieval-backed workflows.
- **Agents** for managed agent runtimes, skills, tools, and agent-to-agent patterns.

## Shared Platform Services

AgentOps uses the same foundation as the MLOps track:

- Workspaces and identity
- Role-based access control
- Observability and audit trails
- Object storage and persistent volumes
- GitOps-managed operations
- Kubernetes-native resource isolation

## Current Status

The AgentOps feature set is under active integration. Some components are already used in pilot deployments, while the final installer profile and public documentation structure are still being shaped.
