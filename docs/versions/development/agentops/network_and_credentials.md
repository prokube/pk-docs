# Network and Credentials for Agents

An agent reaches its model and its connected tools (MCP servers) without further setup. To let it call other HTTP(S) APIs, you allow those hosts on the agent. For an API that needs a key, the egress gateway puts the key into a request header on the way out. The agent, and the code it runs, never see the key.

The same rules apply to code the agent runs in its sandboxes (see [Run code](#run-code)).

## Allow Hosts

Open the agent on the **Agents** page, go to **Overview**, and click **Edit** in **Network & credentials**. Enter one host per line:

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

2. In **Network & credentials**, click **Add credential** and set **Host** (for example `tickets.example.com`), **Header** (`Authorization`), **Prefix** (`Bearer `, with the trailing space), **Secret**, and **Key**.
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

**Run code** in the agent form lets the agent create sandboxes and run code in them. prokube adds a sandbox template named `<agent>-code` with a Python image. Its sandboxes get the agent's network and credential settings. Code runs only in these sandboxes, not in the agent itself.

## Shared Policies

Each agent's settings are stored as a kagent `EgressPolicy` named `<agent>-network`. To share hosts between several agents or sandbox templates, create an `EgressPolicy` under **Advanced** > **Egress policies** and reference it in the agent's or template's YAML (`spec.egressPolicyRefs`). See the [kagent egress policy reference](https://github.com/kagent-dev/kagent/blob/main/docs/architecture/egress-policies.md).

## Workspace Egress Profiles

An administrator can restrict outbound access for a whole workspace with an [egress profile](../admin/network_policies.md). Agents do not run in the workspace namespace, so the profile does not restrict them: their own network settings apply. Plan agent network access with this in mind.

## Related Pages

- [Agents](agents.md)
- [Sandboxes](sandboxes.md)
- [MCP Servers](mcp_servers.md)
- [Network Policies](../admin/network_policies.md)
