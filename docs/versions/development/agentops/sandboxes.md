# Sandboxes

::: info Upstream documentation
For Agent Substrate concepts that are not specific to prokube, use the upstream documentation:

- [Agent Substrate](https://github.com/agent-substrate/substrate)
- [Substrate documentation for the release prokube deploys](https://github.com/kagent-dev/substrate/tree/v0.6.0-alpha2/docs)
- [gVisor](https://gvisor.dev/)
:::

A sandbox is an isolated Linux environment in your workspace for running code and coding agents. It runs in gVisor, reaches only the network destinations you allow, and starts in well under a second. Suspend it when it is idle and resume it when you need it again.

Use a sandbox for agent-generated or untrusted code, for a coding agent that needs its own machine, or for short-lived environments that your code creates and deletes. Use [Labs](../labs/index.md) when you want an IDE or notebooks.

## How Sandboxes Work

- A sandbox belongs to a workspace. Your [workspace role](../platform/workspaces.md#access-levels) decides what you can do with it.
- Each sandbox starts from a **preset** that sets its size and what a suspend keeps.
- The default presets run the same image: Debian with Python 3, Node.js, git, opencode, tmux, ripgrep, and SSH. The terminal and SSH log in as `developer`, with the home directory `/workspace/home`.
- A sandbox reaches only the destinations its network rules allow. API keys are added outside the sandbox and never enter it.

Besides the prokube UI, you can create and use sandboxes with the `pk` CLI and the Python SDK.

## Create a Sandbox

Open **Sandboxes** under **AgentOps**, select the workspace, and click **Create Sandbox**. Enter a **Name**, pick a **Preset**, and click **Create**. **Network access** is prefilled with the platform's default rules, and [Credentials](#credentials) are optional. The sandbox starts right away unless you clear **Start the sandbox after creating it**.

The default presets:

| Preset | Size | A suspend keeps |
|---|---|---|
| **Small** (`pk-default-small`, default) | 1 CPU, 2 GiB | `/workspace` |
| **Medium** (`pk-default-medium`) | 2 CPU, 4 GiB | `/workspace` |
| **Large** (`pk-default-large`) | 3 CPU, 6 GiB | `/workspace` |
| **Small, keeps memory** (`pk-default-small-memory`) | 1 CPU, 2 GiB | `/workspace`, memory, running processes |
| **Medium, keeps memory** (`pk-default-medium-memory`) | 2 CPU, 4 GiB | `/workspace`, memory, running processes |
| **Large, keeps memory** (`pk-default-large-memory`) | 3 CPU, 6 GiB | `/workspace`, memory, running processes |

Administrators can change the presets. `pk preset list` shows the presets of your platform.

## Suspend, Resume, and Persistence

**Suspend** saves the sandbox to a snapshot and frees its CPU and memory. **Resume** restores it. Commands, SSH connections, port forwarding, and file transfers resume a suspended sandbox automatically. Suspend sandboxes you are not using.

What survives a suspend depends on the preset:

- **Small, Medium, Large**: only `/workspace`. Processes restart, and changes outside `/workspace`, such as packages installed with `apt`, are gone. Keep code, virtual environments, and data in `/workspace`; the home directory is already there.
- **Keeps memory** variants: `/workspace`, the memory, and running processes. A REPL, a server, or a tmux session continues where it stopped. Suspend and resume take longer the more memory is in use.

**Resize** switches a sandbox to another preset of the same group, for example from Small to Large. `/workspace`, network access, and credentials stay; running processes restart. **Delete** removes the sandbox together with its `/workspace`.

## Network Access

New sandboxes get the platform's default network rules, which allow common model providers, package registries, and GitHub. In the create dialog, **Network access** offers:

- **No network access**: nothing is reachable.
- **Trusted catalog**: HTTPS to opencode, common package registries, and source hosts.
- **Custom allowlist**: HTTPS on port 443 to the hosts you list, one per line. `*.example.com` covers one subdomain level.
- **Full internet access**: every host over HTTPS on port 443 and HTTP on port 80.

To change the rules of an existing sandbox, open its **Network** tab and click **Edit**. New connections use the saved rules right away.

## Credentials

A sandbox can call an API with a key it never sees. The egress gateway replaces a request header with a value from a Kubernetes Secret in the workspace. Only Secrets with the label `prokube.ai/sandbox-credential=true` can be used.

For example, to give a sandbox access to the OpenAI API:

1. Create and label the Secret:

   ```bash
   kubectl create secret generic openai -n <workspace> --from-literal=api-key=<your-api-key>
   kubectl label secret openai -n <workspace> prokube.ai/sandbox-credential=true
   ```

2. In the create dialog or on the **Network** tab, click **Add credential** and set **Host** `api.openai.com`, **Header** `Authorization`, **Prefix** `Bearer ` (with the trailing space), **Secret** `openai`, and **Key** `api-key`.
3. In the sandbox, let your tool send the header with any placeholder, for example `export OPENAI_API_KEY=placeholder`. The gateway inserts the real key on the way out.

The receiving API sees the real key, so add credentials only for hosts you trust.

## Terminal and Files

Open a sandbox from the list. Besides **Overview** and **Network**, the detail page has:

- **Terminal**: a shell as `developer` in `/workspace/home`, inside a tmux session. Closing the browser tab keeps the session; reconnecting attaches to it. For a suspended sandbox, click **Resume and connect**.
- **Files**: upload files into a folder under `/workspace`, or drag them in, and download a file by its full path. Up to 100 MiB per file.

The **Overview** tab shows ready-to-copy snippets for the `pk` CLI, SSH, and the Python SDK.

## Who Can Do What

| Action | Viewer | Editor or owner |
|---|---|---|
| List sandboxes, view details and network rules | Yes | Yes |
| Create, suspend, resume, resize, delete, change network rules | No | Yes |
| Terminal, Files, SSH, commands, file copy, port forwarding | No | Yes |

A change of your workspace role reaches sandboxes within about a minute.

## Use the pk CLI

Install the CLI and log in. `pk login` opens your browser for the platform login:

```bash
pip install 'prokube-sdk[cli] @ git+https://github.com/prokube/prokube-sdk.git'
pk login https://<your-prokube-domain> --workspace <workspace>
```

Work with sandboxes:

```bash
pk preset list                                       # presets, default marked
pk sandbox create demo --connect                     # create and open an SSH session
pk sandbox create agent --preset pk-default-small-memory
pk sandbox list
pk sandbox exec demo -- python3 -c 'print(6 * 7)'
pk sandbox cp train.py demo:/workspace/
pk sandbox cp demo:/workspace/model.pt .
pk sandbox resize demo --preset pk-default-large
pk sandbox suspend demo
pk sandbox resume demo
pk sandbox delete demo
```

`pk sandbox exec` and the SDK run commands as `root`.

### SSH and IDEs

Make a sandbox an SSH host for `ssh`, `scp`, VS Code Remote-SSH, or JetBrains Gateway:

```bash
pk sandbox ssh-config demo --install
ssh pk.<workspace>.demo
```

The CLI installs your public key in the sandbox and pins the sandbox's host key. No SSH port needs to be open: SSH travels over the platform's HTTPS endpoint.

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

The pod acts as the workspace's `default-editor` service account, which Labs and pipeline runs use. It is an editor of its own workspace and has no access to other workspaces.

## Related Pages

- [Sandbox Administration](../admin/sandboxes.md)
- [Workspaces](../platform/workspaces.md)
- [Kubernetes Secrets](../platform/kubernetes.html#kubernetes-secrets)
- [OpenCode](../labs/opencode.md)
- [prokube-sdk on GitHub](https://github.com/prokube/prokube-sdk)
