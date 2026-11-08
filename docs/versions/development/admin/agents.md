# Agent Administration

[Agents](../agentops/agents.md) run on kagent 1.0. Every agent conversation is an actor on the same [Agent Substrate](sandboxes.md) installation as sandboxes, in the workspace's atespace and on the shared worker pool. Administrators decide which workspaces may run agents and how much capacity the pool has.

## Requirements

- Sandboxes are set up, see [Sandbox Administration](sandboxes.md). Agents use the same Substrate, worker pool, and snapshot storage.
- The core PostgreSQL operator. kagent stores sessions and tasks in its own database cluster.

## Components

| Namespace | What runs there |
|---|---|
| `kagent` | kagent controller and its PostgreSQL database |
| `ate-workers` | Worker pods that host agent sessions, agent sandboxes, and sandboxes |
| Workspace | Agents and their resources; optionally the workspace's trace collector |

## Enable a Workspace

Agents run only in workspaces whose namespace carries the label `prokube.ai/kagent=enabled`:

```bash
kubectl label namespace <workspace> prokube.ai/kagent=enabled
```

The policy sync then lets the kagent controller manage actors in that workspace's atespace. Without the label, the **Agents** page shows a banner and agents do not start. Removing the label takes the controller's access to the workspace away; delete the workspace's agents before you remove it.

## Capacity

Agent sessions and sandboxes share the worker pool `ate-workers/default`. Each running agent session takes 1 CPU and 1 GiB from a worker; each agent sandbox takes the size of its template. Idle sessions are suspended to snapshots and use no worker. Size the pool for both, see [Sandbox Administration: Capacity](sandboxes.md#capacity).

## Security Model

- **Configuration** is Kubernetes RBAC: workspace editors create agents and their resources in their namespace; readers see them.
- **Conversations** belong to the user who started them, or to the owner of the API key that started them.
- **Agents have no built-in shell.** Code runs in agent sandboxes, which cannot reach the controller's APIs. Runtimes with their own shell (Codex, Claude, own images) run commands inside the agent session.
- **The controller trusts the user header it receives.** Only pkui and Agent Gateway set it, and network and mesh policies keep other callers to the agent, runtime, and tool endpoints. A process inside an agent session that sends its own requests could name another user. Decide whether to allow runtimes with a shell in workspaces that need strict separation.
- **Egress profiles do not apply to agents.** Agent sessions and agent sandboxes run in `ate-workers`, not in the workspace namespace, so a workspace's [egress profile](network_policies.md) does not restrict them. Their own network settings apply, see [Network and Credentials](../agentops/network_and_credentials.md).

## Related Pages

- [Agents](../agentops/agents.md)
- [Sandbox Administration](sandboxes.md)
- [External Models](external_models.md)
- [Network Policies](network_policies.md)
