# Sandboxes

::: info Upstream documentation
For Agent Substrate concepts that are not specific to prokube, use the upstream documentation of the release prokube deploys:

- [Agent Substrate](https://github.com/kagent-dev/substrate/tree/v0.6.0-alpha2)
- [Substrate documentation](https://github.com/kagent-dev/substrate/tree/v0.6.0-alpha2/docs)
- [gVisor](https://gvisor.dev/)
:::

A sandbox is an isolated Linux environment in your workspace for running code and coding agents. It runs in gVisor and reaches only the network destinations you allow. Creating a sandbox and resuming a suspended one typically take well under a second.

Use a sandbox for agent-generated or untrusted code, for a coding agent that needs its own machine, or for short-lived environments that your code creates and deletes. Use [Labs](../labs/index.md) when you want an IDE or notebooks.

## Quickstart

```bash
pip install 'prokube-sdk[cli] @ git+https://github.com/prokube/prokube-sdk.git'
pk login https://<your-prokube-domain> --workspace <workspace>
pk sandbox create demo --connect
```

`pk login` opens your browser for the platform login. The last command creates the sandbox and opens an SSH session in it.

## Create a Sandbox

Open **Sandboxes** under **AgentOps**, select the workspace, and click **Create Sandbox**. Enter a **Name**, pick a **Preset**, and click **Create**. **Network access** is prefilled with the platform's default rules, and [Credentials](#credentials) are optional. The sandbox starts right away unless you clear **Start the sandbox after creating it**.

The default presets run the same Debian image with Python 3, Node.js, git, and opencode. The terminal and SSH log in as `developer`, with the home directory `/workspace/home`; `pk sandbox exec` and the SDK run commands as `root`.

| Preset | Size |
|---|---|
| **Small** (`pk-default-small`, default) | 1 CPU, 2 GiB |
| **Medium** (`pk-default-medium`) | 2 CPU, 4 GiB |
| **Large** (`pk-default-large`) | 3 CPU, 6 GiB |

Each has a `-memory` variant, for example **Small, keeps memory** (`pk-default-small-memory`), that also keeps running processes across a suspend. Administrators can change the presets; `pk preset list` shows the presets of your platform.

## Suspend, Resume, and Persistence

**Suspend** saves the sandbox to a snapshot and frees its CPU and memory. **Resume** restores it. Commands, SSH connections, port forwarding, and file transfers resume a suspended sandbox automatically. Suspend sandboxes you are not using.

What survives a suspend depends on the preset:

- **Small, Medium, Large**: only `/workspace`. Processes restart, and changes outside `/workspace`, such as packages installed with `apt`, are gone. Keep code, virtual environments, and data in `/workspace`; the home directory is already there.
- **`-memory` variants**: `/workspace`, the memory, and running processes. A REPL, a server, or a tmux session continues where it stopped. Suspend and resume take longer the more memory is in use.

**Resize** switches a sandbox to another size of the same group, for example from Small to Large. `/workspace`, network access, and credentials stay; running processes restart. **Delete** removes the sandbox together with its `/workspace`.

## Network Access

New sandboxes get the platform's default rules: HTTPS to common model providers, package registries, and GitHub. The create dialog shows them as a **Custom allowlist**; they cover more hosts than the **Trusted catalog**. The options are:

- **No network access**: nothing is reachable.
- **Trusted catalog**: HTTPS to opencode, common package registries, and source hosts.
- **Custom allowlist**: HTTPS on port 443 to the hosts you list, one per line. `*.example.com` covers one subdomain level.
- **Full internet access**: every host over HTTPS on port 443 and HTTP on port 80.

To change the rules of an existing sandbox, open its **Network** tab and click **Edit**. New connections use the saved rules right away.

## Credentials

A sandbox can call an API with a key it never sees. The egress gateway replaces a request header with a value from a labelled Kubernetes Secret of the workspace. For example, for the OpenAI API:

1. Create and label the Secret:

   ```bash
   kubectl create secret generic openai -n <workspace> --from-literal=api-key=<your-api-key>
   kubectl label secret openai -n <workspace> prokube.ai/sandbox-credential=true
   ```

2. In the create dialog or on the **Network** tab, click **Add credential** and set **Host** `api.openai.com`, **Header** `Authorization`, **Prefix** `Bearer ` (with the trailing space), **Secret** `openai`, and **Key** `api-key`.
3. In the sandbox, let your tool send the header with any placeholder, for example `export OPENAI_API_KEY=placeholder`. The gateway inserts the real key on the way out.

The receiving API sees the real key, so add credentials only for hosts you trust.

## Terminal and Files

Besides **Overview** and **Network**, a sandbox's detail page has:

- **Terminal**: a shell as `developer` in `/workspace/home`, inside a tmux session. Closing the browser tab keeps the session; reconnecting attaches to it. For a suspended sandbox, click **Resume and connect**.
- **Files**: upload files into a folder under `/workspace`, or drag them in, and download a file by its full path. Up to 100 MiB per file.

The **Overview** tab shows ready-to-copy snippets for the `pk` CLI, SSH, and the Python SDK.

## Who Can Do What

Workspace editors and owners can create, change, and use sandboxes; viewers can only list them and see their settings, see [Access](../admin/sandboxes.md#access).

## Use the pk CLI

Install the CLI and log in as in the [Quickstart](#quickstart), then:

```bash
pk preset list                                       # presets, default marked
pk sandbox create agent --preset pk-default-small-memory
pk sandbox list
pk sandbox connect demo                              # SSH session
pk sandbox exec demo -- python3 -c 'print(6 * 7)'
pk sandbox cp train.py demo:/workspace/
pk sandbox cp demo:/workspace/model.pt .
pk sandbox resize demo --preset pk-default-large
pk sandbox suspend demo
pk sandbox resume demo
pk sandbox delete demo
```

### SSH and IDEs

Make a sandbox an SSH host for `ssh`, `scp`, VS Code Remote-SSH, or JetBrains Gateway:

```bash
pk sandbox ssh-config demo --install
ssh pk.<workspace>.demo
```

The CLI copies your public key into the sandbox through the platform API and pins the sandbox's host key.

### Reach a Server in a Sandbox

Forward a local port to a server in the sandbox, for example `opencode serve`, Jupyter, or a dev server:

```bash
pk sandbox connect demo                              # in the sandbox: opencode serve --port 4096
pk sandbox forward demo 4096                         # second terminal; Ctrl-C stops it
opencode attach http://localhost:4096                # third terminal
```

## Use the Python SDK

The SDK reuses the login from `pk login`:

```python
from prokube.sandbox import SandboxClient

with SandboxClient("https://<your-prokube-domain>", "<workspace>") as client:
    client.create("demo", preset="pk-default-small-memory")
    print(client.run("demo", "python3 -c 'print(6 * 7)'").stdout)
    client.write_file("demo", "/workspace/data.csv", "a,b\n1,2\n")
    print(client.read_file("demo", "/workspace/data.csv").decode())
    client.delete("demo")
```

`AsyncSandboxClient` offers the same methods for `asyncio`.

### From a Workspace Pod

Notebooks, pipeline steps, and agents in a workspace can use its sandboxes without a login. Select **Allow access to sandboxes** under **Configurations** when you launch a Lab, or add the label `access-sandboxes: "true"` to other pods. Install the SDK with `pip install 'prokube-sdk @ git+https://github.com/prokube/prokube-sdk.git'`, then:

```python
from prokube.sandbox import SandboxClient

with SandboxClient() as client:      # the pod's own workspace
    client.create("nb-demo")
    print(client.run("nb-demo", "uname -a").stdout)
```

The pod acts as the workspace's `default-editor` service account. It is an editor of its own workspace and has no access to other workspaces.

## Give Agents Sandbox Tools over MCP

`pk sandbox mcp` is an MCP server that gives agents tools to manage sandboxes, run commands, and read and write files. Locally it speaks stdio and uses your `pk login`. Add it to Claude Code:

```bash
claude mcp add sandbox -- pk sandbox mcp
```

Or to opencode, in `opencode.json`:

```json
{
  "mcp": {
    "sandbox": { "type": "local", "command": ["pk", "sandbox", "mcp"] }
  }
}
```

To offer the tools to agents in a workspace, run `pk sandbox mcp` there as an [MCP server](mcp_servers.md); the [`mcp-server` example](https://github.com/prokube/examples/tree/sandboxv3/main/sandboxes/mcp-server) has the manifest. Every caller then acts as the workspace, on its sandboxes only, and Agent Gateway decides who may call the server.

## Examples

The [sandbox examples](https://github.com/prokube/examples/tree/sandboxv3/main/sandboxes) in `prokube/examples`:

- [`parallel-sandboxes`](https://github.com/prokube/examples/tree/sandboxv3/main/sandboxes/parallel-sandboxes): run a test in 20 sandboxes at once.
- [`langgraph-data-analysis`](https://github.com/prokube/examples/tree/sandboxv3/main/sandboxes/langgraph-data-analysis): a LangGraph agent with sandbox tools built on the SDK.
- [`mcp-server`](https://github.com/prokube/examples/tree/sandboxv3/main/sandboxes/mcp-server): the same tools over MCP, in the workspace and on a laptop.
- [`claude-code-worker`](https://github.com/prokube/examples/tree/sandboxv3/main/sandboxes/claude-code-worker): Claude Code headless in a sandbox, with the API key injected at egress.
- [`opencode-server`](https://github.com/prokube/examples/tree/sandboxv3/main/sandboxes/opencode-server): an opencode server in a sandbox, attached from a laptop.

## Related Pages

- [Sandbox Administration](../admin/sandboxes.md)
- [Workspaces](../platform/workspaces.md)
- [Kubernetes Secrets](../platform/kubernetes.html#kubernetes-secrets)
- [MCP Servers](mcp_servers.md)
- [OpenCode](../labs/opencode.md)
- [prokube-sdk on GitHub](https://github.com/prokube/prokube-sdk)
