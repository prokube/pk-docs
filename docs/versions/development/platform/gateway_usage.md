# Gateway Usage

**Gateway Usage** shows the calls that went through [Agent Gateway](agent_gateway.html) in the selected workspace: calls to models, MCP servers, memory stores, agents, and other gateway routes. Use it to find out who or what is calling a workspace service, which credential the calls used, how many failed, and what the LLM calls are estimated to cost.

Open **Gateway Usage** under **Monitoring** in the sidebar and select the workspace.

![Gateway Usage summary with tiles, the source table, and the call trend](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/platform/gateway-usage/gateway-usage-summary-framed.png)

Calls that bypass Agent Gateway, for example a workload calling a model's cluster-internal service address directly, are not counted. Prompts, responses, and tool arguments are never shown.

## Who Sees What

Any member of the workspace, including read-only members, can open the page. All members see external model grant calls, internal calls, token calls, and calls without valid credentials. For API key calls, regular users see only the keys they own; platform administrators see every key in the workspace.

## Sources

Every call belongs to exactly one source, based on how it was authenticated:

| Source | Calls |
|---|---|
| **API keys** | Calls made with an [API key](api_keys.html) of this workspace. |
| **External model grants** | Agents and workloads using an [external model](../admin/external_models.html) granted to the workspace. They use the workspace's built-in credential and need no API key. |
| **Internal calls** | Platform services calling each other inside the cluster without a key, for example an agent calling a self-hosted model, an MCP server, or another agent. See [Public vs. Internal Traffic](agent_gateway.html#public-vs-internal-traffic). |
| **Token calls** | Calls signed in with a user account, or with the token of a workspace notebook or pipeline, for example to sandboxes. A token call can still fail after sign-in, for example with `403`. |
| **Calls without valid credentials** | Calls with a missing, invalid, or revoked API key or token. Logs from older platform versions can also contain token calls that cannot be separated retroactively. |

## Read the Summary

Use the controls at the top of the page:

- **Source**: **All sources** or a single source.
- **Time window**: **Last hour**, **Last 24 hours** (default), **Last 7 days**, or **Max (N days)**. N is set by the platform administrator and defaults to 10 days.
- **Refresh**: reloads the numbers.

The summary has four tiles:

| Tile | Meaning |
|---|---|
| **Calls** | All calls through Agent Gateway in the window. The note shows how many of them were **LLM calls**: calls to language, embedding, and rerank models. |
| **Failed calls** | Calls that returned HTTP 400–599, with their share of all calls. Redirects count as successful. |
| **LLM tokens** | Input and output tokens of the LLM calls. |
| **Estimated cost** | Cost of the LLM calls at the model prices that were set when each call was made. **Some calls have no price set** means the total is partial. |

Below the tiles, the source table breaks the totals down by source, and the **Call trend** chart plots calls per interval. With **API keys** selected, you can show one key in the trend; with **External model grants** or **Internal calls**, one caller. The selection is part of the URL, so a link to the page keeps it.

If the gateway's retained logs start after the beginning of the window, the page notes **Logs start at …; numbers for this window are partial.** Usage history goes back only as far as the gateway keeps its access logs, 10 days by default.

## Break Down Usage

The tabs below the summary show the same calls from different angles. Source and tab are part of the URL, for example `?source=api-key&tab=keys`.

- **By caller**: one row per calling workload, with its sources, calls, tokens, and estimated cost. The caller is the workload's Kubernetes ServiceAccount, for example `my-agent`; hover to see the full identity, such as `cluster.local/ns/<workspace>/sa/my-agent`. Calls through the public endpoint show **Not recorded (public endpoint)**, because the gateway does not record which workload sent them; they can come from outside or inside the cluster.
- **By API key**: one row per API key, with its owner, calls, LLM calls, failures, tokens, estimated cost, and **Last active**. A deleted key that still has recorded calls shows as **Historical** and cannot open Activity. Under any source other than **API keys**, the tab shows **Show API keys** instead.
- **Details**: one row per credential, caller, and model or route, with the status of the calls.

Calls that platform controllers make on behalf of agents, such as kagent discovering MCP tools, are **background calls**. They are left out of the totals, the trend, and the source table. A line such as **3,153 background calls by kagent-controller · Show** reveals them in **By caller** and **Details**.

Tables can be sorted by any column. Above 10 rows a search field appears; above 100 rows, **Show 100 more** loads the next rows. Hover a status label such as **Unauthorized** to see the exact HTTP codes. Expand **How usage is counted** at the bottom of the page for the definitions of all labels.

## Inspect Individual Calls

Select **Activity** in a row to list the individual calls behind it:

- From **By API key** or **Details**, Activity lists the calls made with that credential. The same dialog opens from **API Keys > Actions > Activity**. See [API Keys: Request Activity](api_keys.html#request-activity).
- From **By caller**, Activity lists the calls that caller made in this workspace. The caller is fixed; the dialog shows its identity and source instead of a caller filter.

Both kinds of Activity offer the same time window, **HTTP status**, and **Request model** filters, paging with **Older** and **Newer**, and **Export CSV** for the current page.

## Traffic on Resource Pages

Resource detail pages show the calls a resource received, using the same sources and definitions:

| Page | Where |
|---|---|
| [LLM Serving](../agentops/llm_serving.html) and [Model Serving](../mlops/model_serving.html) models | **Traffic** tab |
| [MCP servers](../agentops/mcp_servers.html) | **Traffic** tab |
| [Memory stores](../agentops/memory_stores.html) | **Traffic** tab |
| [Agents](../agentops/agents.html) | **Overview** > **Traffic** (calls to the agent) and **Usage** (calls the agent made) |
| [External Models](../admin/external_models.html) grants and granted Model Configurations | **View Traffic** on the grant, or the Model Configuration's detail page |

An agent's **Usage** section counts the model and tool calls made by the agent's ServiceAccount. Agents that run as the same ServiceAccount share these totals. **Open Gateway Usage** opens this page for the workspace.

**Traffic telemetry unavailable** means the numbers could not be read; it does not mean that there were no calls.

## Reading the Numbers Correctly

- Counts, tokens, and costs come from Agent Gateway access logs. They are operational estimates, not billing records.
- A price applies only to calls made after it was set. See [Pricing and Historical Usage](../admin/llm_usage.html#pricing-and-historical-usage).
- Calls without an API key belong to the workspace named in the request path or, failing that, to the namespace of the calling workload. Calls that match no workspace appear only in the platform-wide views for administrators: [System Status](system_status.html#agent-gateway-traffic) and [LLM Usage and Cost](../admin/llm_usage.html).

## Related Pages

- [API Keys](api_keys.html)
- [Agent Gateway](agent_gateway.html)
- [LLM Usage and Cost](../admin/llm_usage.html)
- [System Status](system_status.html)
- [Auditing LLM Usage](../admin/operations_runbooks.html#auditing-llm-usage)
