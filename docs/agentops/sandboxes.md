# Agent Sandboxes

Agent Sandboxes are workspace-scoped Linux environments for agents, notebooks, and automation that need to run code, shell commands, and file operations inside prokube.

Use them when a workflow needs an execution environment rather than a fixed API call: generated Python code, shell commands, package installs, file inspection, tests, or multi-step agent state.

Sandboxes are exposed in two ways:

- **pkui** for creating pools, inspecting capacity, and managing active sandboxes.
- **SDKs** for agents and automation that claim, use, pause, resume, and delete sandboxes programmatically.

## Core Concepts

| Concept | What it means |
|---|---|
| **Workspace** | The Kubernetes namespace and security boundary for sandbox resources. API keys and pools are workspace-scoped. |
| **Sandbox** | One isolated runtime environment with code execution, shell commands, and file access. |
| **WarmPool** | A pool of pre-created sandbox pods. Claiming from a WarmPool is faster than creating a cold sandbox. |
| **Direct sandbox** | A standalone sandbox created from an image. It usually takes longer to become ready. |
| **API key** | A scoped key used by external SDK clients. Sandbox SDKs send it as `x-api-key`. |

## When to Use a WarmPool

Use a WarmPool when startup latency matters or when many tasks use the same image and resource profile.

Good fits:

- agent workloads that need a sandbox quickly;
- repeated execution of the same runtime image;
- user-facing tools where cold-start latency is visible;
- workloads that need predictable resource limits.

Use a direct sandbox when you need an uncommon image, a one-off resource profile, or do not need low-latency startup.

## Manage Sandboxes in pkui

Open **AgentOps → Sandboxes** in pkui and select the workspace in the page header.

The page has three main areas:

- **Timeline**: active, pending, and idle pool capacity over time.
- **Warm Pools**: pool size, readiness, image, resources, and pool actions.
- **Active Sandboxes**: current direct and pool-backed sandboxes in the workspace.

### Create a WarmPool

Create a WarmPool when you want ready-to-claim sandbox capacity.

Set:

- pool name;
- image;
- pool size;
- CPU and memory requests/limits;
- optional auto-idle timeout;
- optional environment variables and workspace secrets;
- optional internet access, if allowed for the workspace.

The pool name must be a valid Kubernetes name: lowercase letters, numbers, and hyphens.

### Edit a WarmPool

Existing WarmPools can be edited from the Warm Pools table.

Editable now:

- **Pool Size**: changes the desired number of warm pods. Setting it to `0` drains the pool.
- **Auto-idle Default**: changes the default timeout used by future claims from that pool.

Shown as read-only context:

- image;
- CPU and memory;
- environment variables and secret references;
- ports, runtime, security, and network policy settings.

Those fields are template-affecting. Existing warm pods do not automatically change when the template changes, so pkui keeps them read-only until there is an explicit rollout or recreate workflow.

### Claim from a WarmPool

Claiming reserves one ready sandbox from a pool. The claimed sandbox can then run code, shell commands, and file operations through the SDK or API.

If the claim does not set an auto-idle timeout, it inherits the pool default. If the pool has no default, the platform default applies.

If no pool capacity is available, the SDK returns a capacity/backpressure error instead of silently creating unlimited pending sandboxes.

### Create a Direct Sandbox

Use **Create Sandbox** for a standalone sandbox from a selected image.

Direct creation is a cold-start path. The API returns before the sandbox is fully ready; clients should wait until the sandbox reaches `Running` before executing code.

## Lifecycle and Persistence

Sandboxes move through phases such as `Pending`, `Running`, `Paused`, `Failed`, and `Completed`.

### Pending

`Pending` means the sandbox exists but is not ready to execute code yet. Common reasons include image pull time, scheduling, runtime startup, or exhausted pool capacity.

Current SDK releases enforce readiness timeouts while waiting for pending sandboxes. If the sandbox does not become ready in time, the client gets a timeout instead of waiting indefinitely.

### Running

`Running` sandboxes can execute Python code, shell commands, and file operations.

Python code execution uses a Jupyter-style kernel. Variables and imports persist across `run_code()` calls while the sandbox stays running.

### Pause and Resume

Pausing a sandbox stops the underlying pod and frees compute resources. Resuming starts it again.

Persistent paths are restored after resume:

- `/workspace`
- `/root`
- `/home/agent`
- `/skills`

Running processes and in-memory kernel state do not survive pause/resume. System packages installed with tools such as `apt install` are not preserved unless your workflow reinstalls them after resume.

Use a restore script such as `~/.sandbox-restore.sh` when a sandbox needs to reconstruct runtime state on startup.

### Kill/Delete

Delete a sandbox when the task is done. SDK context managers and `try/finally` blocks should always clean up claimed sandboxes.

## SDK Versions

Use the current SDK releases for new clients:

| SDK | Recommended version | Install |
|---|---:|---|
| Python | `v0.1.3` | `pip install "git+https://github.com/prokube/prokube-sdk.git@v0.1.3"` |
| TypeScript | `v2026-07-05` | `npm install https://github.com/prokube/prokube-sdk-ts/releases/download/v2026-07-05/prokube-v2026-07-05.tgz` |

Older SDK versions still work for the basic list, claim, run, and kill flows, but new clients should move to the versions above. They include the current Agent Gateway routing, pending/readiness timeout behavior, and WarmPool exhaustion handling.

## Configure SDK Access

External clients need three values:

```bash
export PROKUBE_API_URL="https://<cluster-domain>/pkui"
export PROKUBE_WORKSPACE="<workspace>"
export PROKUBE_API_KEY="<api-key>"
```

Create the key in **API Keys** and include the **Sandbox API** service scope. See [API Keys](../platform/api_keys.html) for key creation, scope, and rotation guidance.

Do not put API keys in source code, notebooks, screenshots, tickets, or chat messages.

## Python SDK

### Claim from a WarmPool

```python
from prokube.sandbox import Sandbox

with Sandbox.from_pool("python-pool") as sbx:
    result = sbx.run_code("print('hello from sandbox')")
    print(result.stdout)
```

### Run Stateful Code

```python
from prokube.sandbox import Sandbox

with Sandbox.from_pool("python-pool") as sbx:
    sbx.run_code("import statistics")
    sbx.run_code("values = [1, 2, 3, 4]")
    result = sbx.run_code("print(statistics.mean(values))")
    print(result.stdout)
```

### Shell Commands and Files

```python
from prokube.sandbox import Sandbox

with Sandbox.from_pool("python-pool") as sbx:
    command = sbx.commands.run("python --version")
    print(command.stdout)

    sbx.files.write("/workspace/input.txt", "hello")
    content = sbx.files.read("/workspace/input.txt")
    print(content)
```

### Create a Direct Sandbox

```python
from prokube.sandbox import Sandbox

sbx = Sandbox.create(
    image="pk-sandbox:python-datascience",
    cpu="1",
    memory="1Gi",
    allow_internet_access=False,
)

try:
    sbx.wait_until_ready(timeout=180)
    result = sbx.commands.run("python --version")
    print(result.stdout)
finally:
    sbx.kill()
```

## TypeScript SDK

### Claim from a WarmPool

```typescript
import { Sandbox } from "prokube";

const sbx = await Sandbox.fromPool("python-pool");

try {
  const result = await sbx.runCode("print('hello from sandbox')");
  console.log(result.stdout);
} finally {
  await sbx.kill();
}
```

### Run Stateful Code

```typescript
import { Sandbox } from "prokube";

const sbx = await Sandbox.fromPool("python-pool");

try {
  await sbx.runCode("x = 41");
  const result = await sbx.runCode("print(x + 1)");
  console.log(result.stdout);
} finally {
  await sbx.kill();
}
```

### Shell Commands and Files

```typescript
import { Sandbox } from "prokube";

const sbx = await Sandbox.fromPool("python-pool");

try {
  const command = await sbx.commands.run("python --version");
  console.log(command.stdout);

  await sbx.files.write("/workspace/input.txt", "hello");
  const content = await sbx.files.read("/workspace/input.txt");
  console.log(new TextDecoder().decode(content));
} finally {
  await sbx.kill();
}
```

## Troubleshooting

| Symptom | Check |
|---|---|
| SDK returns `401` | Confirm `PROKUBE_API_KEY` is set, copied correctly, enabled, and sent as `x-api-key`. |
| SDK returns `403` | Confirm the key belongs to the workspace and includes the Sandbox API scope. |
| Claim waits and then times out | Check WarmPool readiness and available pods. Increase pool size or use a less constrained image/resource profile. |
| Sandbox stays `Pending` | Check image pull, scheduling capacity, runtime class availability, and workspace quota. |
| File is missing after resume | Confirm the file was written under a persisted path such as `/workspace` or `/skills`. |
| Installed package disappeared after resume | Reinstall it on startup or use a restore script. System-level changes are not automatically persisted. |

## Low-Level API Shape

Most clients should use an SDK. For debugging, the public sandbox route is:

```text
https://<cluster-domain>/sandbox/<workspace>/...
```

Example:

```bash
curl \
  -H "x-api-key: ${PROKUBE_API_KEY}" \
  "https://<cluster-domain>/sandbox/<workspace>/sandboxes"
```

Backend routes are workspace-scoped internally under `/api/namespaces/{namespace}/...`, but external clients should not call internal backend service URLs directly.

## Operational Notes

Sandbox-capable deployments require:

- Agent Sandbox controller and CRDs;
- a sandbox runtime such as gVisor;
- the pkui Sandbox module;
- Agent Gateway for external API access;
- workspace RBAC, quota, secrets, and observability from the shared platform foundation.

Changing WarmPool image, resources, environment variables, or runtime settings affects template data. Existing warm pods keep their current pod spec until they are recreated. Use pool size changes and auto-idle defaults for live edits; treat template-level changes as rollout operations.
