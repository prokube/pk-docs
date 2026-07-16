# Memory Stores

::: info Documentation in progress
This page is an early outline. Full Memory Stores documentation is still being written and will be added here.
:::

Memory Stores provide state and retrieval capabilities for agent workflows.

They are part of the AgentOps track and are intended for workloads where agents need to persist or retrieve context across interactions.

## Typical Uses

- Agent memory
- Retrieval-augmented workflows
- Workspace-scoped context stores
- Tool or skill state

## Relationship to the Platform

Memory Stores should use the same workspace, identity, storage, and observability foundation as the rest of the platform. They should not become a separate unmanaged data plane.
