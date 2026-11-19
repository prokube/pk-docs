# Sandboxes

::: info Upstream documentation
For Agent Substrate concepts that are not specific to prokube, use the upstream documentation:

- [Agent Substrate](https://github.com/kagent-dev/substrate)
- [Substrate documentation](https://github.com/kagent-dev/substrate/tree/main/docs)
- [gVisor](https://gvisor.dev/)
:::

A sandbox is an isolated Linux environment in your workspace for running code and coding agents. It runs in gVisor and reaches only the network destinations you allow. Creating a sandbox and resuming a suspended one typically take well under a second.

## When to Use Sandboxes

Use a sandbox for agent-generated or untrusted code, for a coding agent that needs its own machine, or for short-lived environments that your code creates and deletes. Use [Labs](../labs/index.html) when you want an IDE or notebooks.

Workspace owners and editors can create, change, and use sandboxes. Viewers can list them and see their settings. See [Access](../admin/sandboxes.html#access) for the full mapping.

## Quickstart

```bash
pip install 'prokube-sdk[cli] @ git+https://github.com/prokube/prokube-sdk.git@v1.0.0'
pk auth login https://<your-prokube-domain> --workspace <workspace>
pk sandbox create demo --connect
```

`pk auth login` opens your browser for the platform login. The last command creates the sandbox and opens an SSH session in it. To change the default workspace later, run `pk auth workspace set <workspace>`.

## Run the Examples

The [`prokube/examples`](https://github.com/prokube/examples/tree/main/sandboxes) repository has runnable sandbox examples. Managed Labs clone it into `~/examples`. The notebooks need a Lab with **Allow access to sandboxes** under **Configurations**.

| Example | Use when |
|---|---|
| [`parallel-sandboxes`](https://github.com/prokube/examples/tree/main/sandboxes/parallel-sandboxes) | You want to run many short jobs at once, such as an eval or a test matrix: 20 sandboxes created, used, and deleted in seconds. |
| [`langgraph-data-analysis`](https://github.com/prokube/examples/tree/main/sandboxes/langgraph-data-analysis) | You build an agent in your own code and want its tools to run code in a sandbox. Uses LangGraph; the tools are plain SDK functions. |
| [`mcp-server`](https://github.com/prokube/examples/tree/main/sandboxes/mcp-server) | You want to give agents sandbox tools over MCP, in the workspace or in Claude Code and opencode on a laptop. |
| [`claude-code-worker`](https://github.com/prokube/examples/tree/main/sandboxes/claude-code-worker) | You want to run a coding agent headless on a repository, with its API key injected at egress so it never enters the sandbox. |
| [`opencode-server`](https://github.com/prokube/examples/tree/main/sandboxes/opencode-server) | You want an agent to work in a sandbox while you follow and steer it from opencode on your laptop. |

## Create a Sandbox

Open **Sandboxes** under **AgentOps** in the prokube UI, select the workspace, and click **Create Sandbox**. Enter a **Name**, pick a **Preset**, and click **Create**.

**Network access** is prefilled with the platform's default rules; see [Network Access](#network-access). [Credentials](#credentials) are optional. The sandbox starts right away unless you clear **Start the sandbox after creating it**.

| Preset | Keeps memory across a suspend | CPU | Memory |
|---|---|---|---|
| **Small** (`pk-default-small`, default) | **Small, keeps memory** (`pk-default-small-memory`) | 1 | 2 GiB |
| **Medium** (`pk-default-medium`) | **Medium, keeps memory** (`pk-default-medium-memory`) | 2 | 4 GiB |
| **Large** (`pk-default-large`) | **Large, keeps memory** (`pk-default-large-memory`) | 3 | 6 GiB |

[Lifecycle](#lifecycle) explains what each variant keeps. Administrators can change the presets; `pk sandbox preset list` shows the presets of your platform.

### What Is in a Sandbox

The default presets run the same Debian image with Python 3, Node.js, git, opencode, and Claude Code.

- Everything runs as `root`: the terminal, SSH, `pk sandbox exec`, and the SDK. Install packages with `apt`, without `sudo`.
- Commands start in `/workspace`. The home directory is `/workspace/home`.
- Claude Code accepts `--dangerously-skip-permissions`, because the image sets `IS_SANDBOX=1`. Without the flag, it asks for permissions as usual. With it, the sandbox and its network rules are the isolation boundary, not Claude Code's permission prompts.

## Lifecycle

**Suspend** saves the sandbox to a snapshot and frees its CPU and memory. **Resume** restores it. Commands, port forwarding, file transfers, and the SDK resume a suspended sandbox automatically. SSH connections, including IDEs, do not by default, so an IDE that reconnects on its own does not keep waking the sandbox; see [SSH and IDEs](#ssh-and-ides). Suspend sandboxes you are not using.

What survives a suspend depends on the preset:

- **Small, Medium, Large**: only `/workspace`. Processes restart, and changes outside `/workspace`, such as packages installed with `apt`, are gone. Keep code, virtual environments, and data in `/workspace`; the home directory is already there.
- **Variants that keep memory**: `/workspace`, the memory, and running processes. A REPL, a server, or a tmux session continues where it stopped. Suspend and resume take longer the more memory is in use.

**Revert** brings back a crashed sandbox, for example after its node restarted. `pk sandbox revert <name>` or **Revert** in the prokube UI restores the last snapshot and leaves the sandbox suspended. Changes since that snapshot are lost.

**Resize** switches a sandbox to another preset with the same image and snapshot type, for example from **Small** to **Large**, or from **Small, keeps memory** to **Large, keeps memory**. `/workspace`, network access, and credentials stay; running processes restart.

**Delete** removes the sandbox together with its `/workspace`.

## Network Access

A sandbox reaches only the destinations its network rules allow. Connections to other hosts fail at DNS with `Could not resolve host`.

New sandboxes get the platform's default rules. On a default installation, these allow HTTPS to common model providers, Hugging Face, package registries, and GitHub, and HTTP to the Debian mirrors for `apt`. The create dialog shows them as a **Custom allowlist**.

| Option | Allows |
|---|---|
| **No network access** | Nothing. |
| **Trusted catalog** | HTTPS to opencode, common package registries, and GitHub. No other model providers, so tools such as Claude Code cannot reach their API. |
| **Custom allowlist** | HTTPS on port 443 to the hosts you list, one per line. `*.example.com` covers one subdomain level. |
| **Full internet access** | HTTPS on port 443 and HTTP on port 80 to every host. |

To change the rules of an existing sandbox, open its **Network** tab and click **Edit**. New connections use the saved rules right away.

The CLI and the SDK change rules differently:

- `pk sandbox network <name> --passthrough <host>` adds a host and keeps the other rules.
- `set_network` in the SDK replaces all rules, including the defaults.

## Credentials

A sandbox can call an API with a key it never sees. The egress gateway replaces a request header with a value from a labelled Kubernetes Secret of the workspace. For example, for the OpenAI API:

1. Create and label the Secret:

   ```bash
   kubectl create secret generic openai -n <workspace> --from-literal=api-key=<your-api-key>
   kubectl label secret openai -n <workspace> prokube.ai/sandbox-credential=true
   ```

2. In the create dialog or on the **Network** tab, click **Add credential** and set **Host** `api.openai.com`, **Header** `Authorization`, **Prefix** `Bearer ` (with the trailing space), **Secret** `openai`, and **Key** `api-key`. With the CLI, use `pk sandbox create demo --inject-bearer api.openai.com openai/api-key`, or `pk sandbox network` with the same option for an existing sandbox.
3. In the sandbox, let your tool send the header with any placeholder, for example `export OPENAI_API_KEY=placeholder`. The gateway replaces only a header that the request already sends; without it, nothing is injected.

A credential also allows its host; it needs no separate allowlist entry.

For hosts with credentials, the egress gateway terminates TLS. Tools trust its CA through `SSL_CERT_FILE`, `REQUESTS_CA_BUNDLE`, `CURL_CA_BUNDLE`, `GIT_SSL_CAINFO`, `PIP_CERT`, and `NODE_EXTRA_CA_CERTS`, which the default presets set. A tool that uses its own trust store fails on these hosts with a certificate error such as `self-signed certificate in certificate chain`.

The receiving API sees the real key, so add credentials only for hosts you trust.

## Terminal and Files

A sandbox's detail page has the tabs **Overview**, **Network**, **Terminal**, and **Files**:

- **Overview**: ready-to-copy snippets for the `pk` CLI, SSH, and the Python SDK.
- **Terminal**: a shell as `root` in `/workspace`, inside a tmux session. Closing the browser tab keeps the session; reconnecting attaches to it. For a suspended sandbox, click **Resume and connect**.
- **Files**: upload files into a folder under `/workspace`, or drag them in, and download a file by its full path. Up to 100 MiB per file.

## Use the pk CLI

Install the CLI and log in as in the [Quickstart](#quickstart), then:

```bash
pk sandbox preset list                               # presets, default marked
pk sandbox create agent --preset pk-default-small-memory
pk sandbox list
pk sandbox connect demo                              # SSH session
pk sandbox exec demo -- python3 -c 'print(6 * 7)'
pk sandbox cp train.py demo:/workspace/
pk sandbox cp demo:/workspace/model.pt .
pk sandbox network demo                              # show the network rules
pk sandbox network demo --passthrough example.com    # allow one more host
pk sandbox resize demo --preset pk-default-large
pk sandbox suspend demo
pk sandbox resume demo
pk sandbox revert demo                               # after a crash: back to the last snapshot
pk sandbox delete demo
```

### SSH and IDEs

Make a sandbox an SSH host for `ssh`, `scp`, VS Code Remote-SSH, or JetBrains Gateway:

```bash
pk sandbox ssh-config demo --install
ssh pk.<workspace>.demo
```

On first use, the CLI creates its own SSH key, `~/.config/prokube/ssh/id_ed25519`, copies the public key into the sandbox through the platform API, and pins the sandbox's host key. The host entry names that key, so `ssh` and IDEs use it too.

Every SSH connection goes through `pk`, which the host entry runs as `ProxyCommand`. By default, the entry refuses a suspended sandbox, so an IDE that reconnects on its own does not wake it. The connection fails with an error that tells you to run `pk sandbox resume demo`. To let SSH connections resume the sandbox, run `pk sandbox ssh-config demo --resume`.

### Claude Desktop App and opencode Desktop App

The Claude desktop app and the opencode desktop app can run their agent in a sandbox over SSH. Make the sandbox an SSH host first. `--resume` lets the apps wake a suspended sandbox when they reconnect:

```bash
pk sandbox ssh-config demo --install --resume
```

- **Claude desktop app**: start a new session, open the environment selector below the prompt box, select **New environment**, then **SSH** and **Add SSH connection**. Enter `pk.<workspace>.demo` as **SSH host** and choose a folder under `/workspace`.

  ![Claude desktop app: Add SSH connection with the sandbox as SSH host](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/agentops/sandboxes/claude-desktop-ssh-connection.webp)

- **opencode desktop app**: open **Settings**, then **Servers** and **Add server**, and enter `ssh pk.<workspace>.demo`.

  ![opencode desktop app: Add SSH server with the sandbox's SSH host](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/agentops/sandboxes/opencode-desktop-ssh-server.webp)

On the first connection, each app installs its own server in the sandbox under `/workspace/home` and talks to it over the SSH connection. Nothing in the sandbox listens on a network port. The agent's commands and its model requests run in the sandbox, under the sandbox's [network rules](#network-access).

If Claude Code asks you to log in, the sandbox must reach `console.anthropic.com` and `platform.claude.com`, which the default rules do not include:

```bash
pk sandbox network demo --passthrough console.anthropic.com --passthrough platform.claude.com
```

### Reach a Server in a Sandbox

Forward a local port to a server in the sandbox, such as `opencode serve`, Jupyter, or a dev server. For example, for opencode:

1. Start the server in the sandbox:

   ```bash
   pk sandbox connect demo
   OPENCODE_PASSWORD=<password> opencode serve --port 4096
   ```

2. In a second terminal on your machine, forward the port. Ctrl-C stops the forwarding.

   ```bash
   pk sandbox forward demo 4096
   ```

3. In a third terminal, connect to the server:

   ```bash
   OPENCODE_PASSWORD=<password> opencode --server http://localhost:4096
   ```

## Use the Python SDK

The SDK reuses the login from `pk auth login`:

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

`set_network` replaces all network rules of a sandbox. `passthrough` allows hosts, and `inject` adds a [credential](#credentials). `secret_uri` refers to a key of a labelled Secret in the workspace:

```python
from prokube.sandbox import SandboxClient, inject, passthrough

with SandboxClient("https://<your-prokube-domain>", "<workspace>") as client:
    key = client.secret_uri("openai", "api-key")
    client.set_network("demo", [
        inject("api.openai.com", "Authorization", key, prefix="Bearer "),
        passthrough("pypi.org", "files.pythonhosted.org"),
    ])
```

After this call, the sandbox reaches only the OpenAI API and PyPI.

## Access from Workspace Pods

Notebooks, pipeline steps, and agents in a workspace can use its sandboxes without a login. Select **Allow access to sandboxes** under **Configurations** when you launch a Lab, or add the label `sandbox.prokube.ai/access: "true"` to other pods.

Install the SDK with the CLI using the install command in [Quickstart](#quickstart).

The SDK finds the pod's workspace on its own:

```python
from prokube.sandbox import SandboxClient

with SandboxClient() as client:      # the pod's own workspace
    client.create("nb-demo")
    print(client.run("nb-demo", "uname -a").stdout)
```

The `pk` CLI also needs no login and uses the pod's workspace. Only the SSH commands `connect`, `forward`, and `ssh-config` need the platform URL:

```bash
pk sandbox list
export PROKUBE_URL=https://<your-prokube-domain>
pk sandbox connect nb-demo
```

The pod acts as the workspace's `default-editor` service account. It is an editor of its own workspace and has no access to other workspaces.

## External Access with API Keys

For CI jobs, servers, and agents outside the platform, create a key under [API Keys](../platform/api_keys.html) in the prokube UI. Select the workspace, the scope **All sandboxes**, and the format **Bearer**. The CLI and the SDK then need no login:

```bash
export PROKUBE_URL=https://<your-prokube-domain>
export PROKUBE_WORKSPACE=<workspace>
export PROKUBE_API_KEY=<key>
pk sandbox create ci-run
```

`SandboxClient()` reads the same variables, or takes `api_key=`. Sandboxes created with a key show the workspace's `pk-sandbox-api-key` service account as their creator. To revoke a key, disable or delete it under **API Keys**. Keys have the same power as a workspace editor; see [Security and Operations](#security-and-operations).

## Give Agents Sandbox Tools over MCP

`pk sandbox mcp` is an MCP server that gives agents tools to manage sandboxes, run commands, and read and write files. Locally, it speaks stdio and uses your `pk auth login`. Add it to Claude Code:

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

To offer the tools to agents in a workspace, run `pk sandbox mcp` there as an [MCP server](mcp_servers.html). The [`mcp-server` example](https://github.com/prokube/examples/tree/main/sandboxes/mcp-server) has the manifest.

The server acts as the workspace. Every agent that may call it can create, use, and delete the workspace's sandboxes, and can set network rules that use the workspace's credentials. Agent Gateway decides who may call the server.

## Security and Operations

- **Isolation**: sandboxes run in gVisor, separate from the node and from each other. Inside a sandbox, everything runs as `root`.
- **Network**: the default rules let code in a sandbox send data to model providers, package registries, and GitHub. For untrusted code, choose **No network access** or a narrow allowlist.
- **Credentials**: the key never enters the sandbox, but code in the sandbox can use it against the credential's host. Only label Secrets that sandboxes of the workspace may use with `prokube.ai/sandbox-credential=true`.
- **API keys** with the scope **All sandboxes** can do what a workspace editor can, in their workspace only. This includes network rules that inject the workspace's credentials, so keep these keys as safe as those Secrets.
- **Capacity**: running sandboxes hold CPU and memory on shared workers. Suspend sandboxes you are not using; when the workers are full, creating or resuming a sandbox fails.
- **Node restarts**: running sandboxes crash when their node restarts. Revert them to their last snapshot.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Could not resolve host` in the sandbox | The host is not in the [network rules](#network-access). Add it. |
| `self-signed certificate in certificate chain` for a host with a credential | The tool ignores the CA variables listed under [Credentials](#credentials). Point its trust store at `$SSL_CERT_FILE`. |
| The API rejects the request although a credential is set | The request does not send the header. Set the header with a placeholder value. |
| `ssh` or an IDE fails with `Run: pk sandbox resume <name>` | The sandbox is suspended. Resume it, or rerun `pk sandbox ssh-config <name> --resume`. |
| Claude Code cannot log in | Allow `console.anthropic.com` and `platform.claude.com`, as under [Claude Desktop App and opencode Desktop App](#claude-desktop-app-and-opencode-desktop-app). |
| Creating or resuming fails with HTTP 503 | The workers are full. Suspend or delete sandboxes you are not using, or ask an administrator for more [capacity](../admin/sandboxes.html#capacity). |
| A sandbox shows as crashed | Its node restarted. Run `pk sandbox revert <name>` or click **Revert**, then resume it. |
| `SSH to a sandbox needs the platform URL` in a workspace pod | Set `PROKUBE_URL`; see [Access from Workspace Pods](#access-from-workspace-pods). |
| `No login and no workload token`, or `No platform URL` from `pk`, in a workspace pod | The pod has no sandbox token. Launch the Lab with **Allow access to sandboxes**, or add the label `sandbox.prokube.ai/access: "true"`. If that does not help, ask an administrator to check [workspace pod access](../admin/sandboxes.html#access-from-workspace-pods). |

## Related Pages

- [Sandbox Administration](../admin/sandboxes.html)
- [API Keys](../platform/api_keys.html)
- [Workspaces](../platform/workspaces.html)
- [Kubernetes Secrets](../platform/kubernetes.html#kubernetes-secrets)
- [MCP Servers](mcp_servers.html)
- [OpenCode](../labs/opencode.html)
- [prokube-sdk on GitHub](https://github.com/prokube/prokube-sdk)
