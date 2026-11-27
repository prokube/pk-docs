# Agent Administration

[Agents](../agentops/agents.md) run on kagent 1.0. Every agent conversation is an actor on the same [Agent Substrate](sandboxes.md) installation as sandboxes, in the workspace's atespace, on a worker pool of its own. Administrators decide how much capacity the pool has.

## Requirements

- Sandboxes are set up, see [Sandbox Administration](sandboxes.md). Agents use the same Substrate and snapshot storage.
- The core PostgreSQL operator. kagent stores sessions and tasks in its own database cluster.

## Components

| Namespace | What runs there |
|---|---|
| `kagent` | kagent controller and its PostgreSQL database |
| `ate-workers` | Worker pods that host agent sessions and sandboxes |
| Workspace | Agents and their resources; optionally the workspace's trace collector |

## Workspaces

Every workspace can run agents; there is nothing to enable. The policy sync lets the kagent controller manage actors in every workspace's atespace. Agents cannot be turned off for a single workspace: the only switch is the kagent component of the whole installation.

## Capacity

Agents run on the worker pool `ate-workers/agents`, separate from the sandboxes' pool `default`, so busy agents and busy sandboxes cannot starve each other. Each agent turn that is running takes 0.5 CPU and 1 GiB from a worker's budget; idle sessions are suspended to snapshots and use no worker. By default the pool has two workers of 4 CPU and 4 GiB, so eight turns run at once.

When the pool is full, a new turn waits until a worker has room. The user sees a slow answer, not a message. Nothing limits how many turns one user or workspace runs at once.

The pool is defined in `paas/kagent/workers/agent-pool.yaml`. To change it, edit the file in the deployment's GitOps branch, commit, push, and sync the Argo CD Application `pk-sandbox-workers`. Workers work as described in [Sandbox Administration: Capacity](sandboxes.md#capacity).

## Agent Images

The workers pull the images of agents, harnesses, and sandbox templates themselves, without Kubernetes pull secrets. Users' own images must therefore be in a registry that allows anonymous pulls. The platform's registry login is used only for prokube's own sandbox image.

## Security Model

- **Configuration** is Kubernetes RBAC: workspace editors create agents and their resources in their namespace; readers see them.
- **Conversations** belong to the user who started them, or to the owner of the API key that started them. Only that user sees them in prokube. Every workspace member is an editor of the workspace's atespace, because sandboxes need that role, so a member with `kubectl ate` can copy another member's conversation, with its memory and files. Conversations are private from other workspace members only in prokube's UI and API.
- **Conversations are kept in kagent's database.** Deleting a conversation, or its expiry after seven days without activity, removes its actor, but kagent 1.0.1 keeps the conversation's messages in its PostgreSQL database. Deleting an agent leaves its conversations as they are.
- **Every agent has a shell.** The kagent runtime gives each agent kagent's built-in `bash` and file tools; Codex, Claude, and own images bring their own shell. Commands run inside the agent's session, an isolated actor with the agent's network settings, and never see injected credentials. The built-in tools are enabled for the whole installation (`config.runtimeDefaults.builtinTools` of the kagent controller).
- **Only pkui and Agent Gateway call the controller on behalf of users.** pkui checks the user's workspace role and Agent Gateway checks the API key, then each tells the controller who the user is. Network and mesh policies keep other callers away from the controller. Agent sessions reach it only through an Agent Gateway route that accepts a token Substrate signed for that session, and kagent limits each session to its own agent and conversation, so code running in a session cannot act as another user.
- **Egress profiles do not apply to agents.** Agent sessions run in `ate-workers`, not in the workspace namespace, so a workspace's [egress profile](network_policies.md) does not restrict them. Their own network settings apply, see [Network and Credentials](../agentops/network_and_credentials.md).

## Known Issues

kagent 1.0.1 has two known issues:

- **A running answer is lost when its worker is replaced**, for example during an upgrade, a pool change, or a node failure. The conversation still shows as ready; the user's next message gets an error that asks them to start a new conversation. Paused conversations are not affected.
- **On a fresh installation the kagent controller restarts** until its PostgreSQL database accepts logins. It then runs normally.

## Related Pages

- [Agents](../agentops/agents.md)
- [Sandbox Administration](sandboxes.md)
- [External Models](external_models.md)
- [Network Policies](network_policies.md)
