# Agent Sandboxes

Agent Sandboxes are workspace-scoped Linux environments where agents can run code, execute shell commands, and read or write files without running that workload on the user's machine.

Use them when a workflow needs an execution environment rather than a fixed API call: generated Python code, shell commands, package installs, file inspection, tests, or multi-step agent state.

Sandboxes are exposed in two ways:

- **pkui** for creating pools, inspecting capacity, and managing active sandboxes.
- **SDKs** for agents and automation that claim, use, pause, resume, and delete sandboxes programmatically.

## Get Started

The fastest way to try Sandboxes is to use the Python SDK from a managed Lab. The SDK can create a WarmPool, claim a sandbox, run code, execute shell commands, read and write files, and clean up resources again.

### 1. Install the SDK

```bash
pip install "git+https://github.com/prokube/prokube-sdk.git@v0.1.3"
```

### 2. Configure Access

External clients need an API key with **Sandbox API** access:

```bash
export PROKUBE_API_URL="https://<cluster-domain>/pkui"
export PROKUBE_WORKSPACE="<workspace>"
export PROKUBE_API_KEY="<api-key>"
```

In a managed Lab, you can use the in-cluster Agent Gateway service without an API key:

```bash
export PROKUBE_API_URL="http://agentgateway-proxy.agentgateway-system.svc.cluster.local"
export PROKUBE_WORKSPACE="<workspace>"
export PROKUBE_USER_ID="<user-or-workspace>"
```

The example notebook uses the in-cluster Agent Gateway service in managed Labs. For external access, set `PROKUBE_API_URL`, `PROKUBE_WORKSPACE`, and `PROKUBE_API_KEY` explicitly.

Create and rotate external keys on the **API Keys** page. See [API Keys](../platform/api_keys.html) for scope and key-handling guidance.

Do not put API keys in source code, notebooks, screenshots, tickets, or chat messages.

### 3. Create or Use a WarmPool

WarmPools keep ready-to-claim sandboxes available for low-latency starts. This example creates a small pool with the SDK. If a pool with the same name already exists, choose a different name or delete the old pool first.

```python
import time

from prokube.sandbox import SandboxPool

pool = SandboxPool.create(
    name="sandbox-sdk-quickstart",
    image="europe-west3-docker.pkg.dev/prokube-internal/prokube-customer/pk-sandbox-base:v14-05-2026",
    pool_size=1,
    cpu="1",
    memory="2Gi",
)

deadline = time.monotonic() + 120
while time.monotonic() < deadline:
    pool.refresh()
    if pool.ready_replicas >= pool.pool_size:
        break
    time.sleep(2)
else:
    raise TimeoutError(
        f"Pool {pool.name} did not become ready: "
        f"{pool.ready_replicas}/{pool.pool_size} ready"
    )
```

If your deployment uses a different sandbox image, use one of the images offered in pkui or set the image explicitly for your workspace.

### 4. Claim and Use a Sandbox

```python
from prokube.sandbox import Sandbox

with Sandbox.from_pool("sandbox-sdk-quickstart") as sbx:
    result = sbx.run_code("print('hello from sandbox')")
    print(result.stdout)

    command = sbx.commands.run("python --version")
    print(command.stdout)

    sbx.files.write("/workspace/input.txt", "hello")
    content = sbx.files.read("/workspace/input.txt")
    print(content.decode() if isinstance(content, bytes) else content)
```

The context manager deletes the claimed sandbox when the block exits. In longer-running agents, use `try`/`finally` or the SDK context manager so cleanup still runs after errors.

### Stateful Code Execution

`run_code()` uses a stateful Python kernel. Imports and variables persist across calls while the sandbox stays running.

```python
from prokube.sandbox import Sandbox

with Sandbox.from_pool("python-pool") as sbx:
    sbx.run_code("import statistics")
    sbx.run_code("values = [1, 2, 3, 4]")
    result = sbx.run_code("print(statistics.mean(values))")
    print(result.stdout)
```

## Run the Example Notebook

Use the public [`prokube/examples`](https://github.com/prokube/examples) repository for a step-by-step notebook. prokube managed Labs clone this repository into the Lab home directory by default.

Open this notebook in JupyterLab:

```text
~/examples/sandboxes/sdk-quickstart/sandbox-sdk-quickstart.ipynb
```

The notebook covers SDK installation, managed Lab configuration, WarmPool creation, WarmPool claims, stateful code execution, shell commands, file operations under `/workspace`, and cleanup.

The notebook focuses on the SDK and Agent Sandbox features. Examples that integrate Sandboxes with an agent framework belong in separate example directories.

Repository path:

[`sandboxes/sdk-quickstart`](https://github.com/prokube/examples/tree/main/sandboxes/sdk-quickstart)

## SDK Versions

Use the current SDK releases for new clients:

| SDK | Recommended version | Install |
|---|---:|---|
| Python | `v0.1.3` | `pip install "git+https://github.com/prokube/prokube-sdk.git@v0.1.3"` |
| TypeScript | `v2026-07-05` | `npm install https://github.com/prokube/prokube-sdk-ts/releases/download/v2026-07-05/prokube-v2026-07-05.tgz` |

Older SDK versions still work for the basic list, claim, run, and kill flows, but new clients should move to the versions above. They include the current Agent Gateway routing, pending/readiness timeout behavior, and WarmPool exhaustion handling.

## TypeScript SDK

```typescript
import { Sandbox } from "prokube";

const sbx = await Sandbox.fromPool("python-pool");

try {
  const result = await sbx.runCode("print('hello from sandbox')");
  console.log(result.stdout);

  const command = await sbx.commands.run("python --version");
  console.log(command.stdout);

  await sbx.files.write("/workspace/input.txt", "hello");
  const content = await sbx.files.read("/workspace/input.txt");
  console.log(new TextDecoder().decode(content));
} finally {
  await sbx.kill();
}
```

## Core Concepts

| Concept | What it means |
|---|---|
| **Workspace** | The Kubernetes namespace and security boundary for sandbox resources. API keys and pools are workspace-scoped. |
| **Sandbox** | One isolated runtime environment with code execution, shell commands, and file access. |
| **WarmPool** | A pool of pre-created sandbox pods. Claiming from a WarmPool is faster than creating a cold sandbox. |
| **Direct sandbox** | A standalone sandbox created from an image. It usually takes longer to become ready. |
| **API key** | A scoped key used by external SDK clients. Use the SDK's configured API-key header mode for your deployment. |

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

```python
from prokube.sandbox import Sandbox

sbx = Sandbox.create(
    image="europe-west3-docker.pkg.dev/prokube-internal/prokube-customer/pk-sandbox-base:v14-05-2026",
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

## Troubleshooting

| Symptom | Check |
|---|---|
| SDK returns `401` | Confirm external clients have a valid `PROKUBE_API_KEY`, or in-cluster clients have `PROKUBE_USER_ID` or `KF_USER` set. |
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
