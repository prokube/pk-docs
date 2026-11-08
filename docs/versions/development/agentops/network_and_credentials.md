# Network and Credentials for Agents

An agent reaches its model and its connected tools (MCP servers) without further setup. To let it call other HTTP(S) APIs, you allow those hosts on the agent. For an API that needs a key, the egress gateway puts the key into a request header on the way out. The agent, and the code it runs, never see the key.

The same rules apply to code the agent runs in its sandboxes (see [Run code](#run-code)).

The example [`github-agent`](https://github.com/prokube/examples/tree/kagentv1/main/kagent/github-agent) sets this up for an agent that calls the GitHub API with a token it never sees and installs packages from PyPI.

## Allow Hosts

Set this in the **Network and credentials** card when you create the agent, or later on the agent's **Configuration** tab with **Edit**. Enter one host per line:

| Entry | Allows |
|---|---|
| `pypi.org` | HTTPS on port 443 |
| `*.example.com` | HTTPS to one subdomain level, for example `api.example.com`, but not `example.com` |
| `api.example.com:8443` | HTTPS on port 8443 |
| `http://reports.my-workspace.svc.cluster.local:8080` | Plain HTTP, for services in the cluster |

Paths, IP addresses, and protocols other than HTTP and HTTPS are not accepted. Redirects to other hosts need their own entry.

## Add a Credential

1. Create a Secret in the workspace and release it for credentials, either under **Credentials** in the dialog or with `kubectl`:

   ```bash
   kubectl create secret generic tickets-api -n <workspace> --from-literal=token=<your-token>
   kubectl label secret tickets-api -n <workspace> prokube.ai/sandbox-credential=true
   ```

2. In **Network and credentials**, click **Add credential** and set **Host** (for example `tickets.example.com`), **Header** (`Authorization`), **Prefix** (`Bearer `, with the trailing space), **Secret**, and **Key**.
3. Let the agent's tool or code send the header with any placeholder, for example `Authorization: Bearer placeholder`. The gateway replaces the value; it does not add a missing header.

A credential needs an exact host, not a wildcard. The receiving API sees the real key, so add credentials only for hosts you trust.

::: warning HTTPS and the gateway certificate
To insert a header into an HTTPS request, the gateway terminates TLS with its own certificate authority. The client must trust that certificate authority, otherwise the request fails with a certificate error.
:::

## Databases and Other Protocols

Only HTTP and HTTPS can be allowed. An agent cannot open a database connection (PostgreSQL, MySQL, and similar) directly. Instead:

- run an MCP server for the database in the workspace, with its own credentials Secret, and connect it to the agent (see [MCP Servers](mcp_servers.md)); or
- put an HTTP API in front of the database and add a credential for it as above.

## Run Code

Agents have no shell of their own. **Run code** in the agent's **Capabilities** lets the agent create sandboxes and run code in them. prokube adds a sandbox template named `<agent>-code` with a Python image. Its sandboxes get the agent's network and credential settings, so `pip install` works once `pypi.org` and `files.pythonhosted.org` are allowed.

## Shared Policies

Each agent's settings are stored as a kagent `EgressPolicy` named `<agent>-network`. To share hosts and credentials between several agents, create an egress policy on the **Egress policies** tab of the **Agents** page and attach it under **Shared policies** in the agent's **Network and credentials**. The tab shows which agents use each policy. See the [kagent egress policy reference](https://github.com/kagent-dev/kagent/blob/main/docs/architecture/egress-policies.md).

## Workspace Egress Profiles

An administrator can restrict outbound access for a whole workspace with an [egress profile](../admin/network_policies.md). Agents do not run in the workspace namespace, so the profile does not restrict them: their own network settings apply. Plan agent network access with this in mind.

## Related Pages

- [Agents](agents.md)
- [Sandboxes](sandboxes.md)
- [MCP Servers](mcp_servers.md)
- [Network Policies](../admin/network_policies.md)
