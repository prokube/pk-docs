# API Keys

API keys provide scoped programmatic access to selected prokube services without a browser session. Use them wherever a script, CI job, or external client calls a prokube service.

Each key can be scoped to specific services/workloads instead of the whole workspace, sent with either of two client authentication headers, and given an optional expiration date.

A key belongs to the workspace that was selected when it was created. prokube routes public API traffic through [Agent Gateway](agent_gateway.html), the shared routing and policy layer for API clients, but you do not need to configure Agent Gateway to create a key.

Use API keys when a workload or external client needs repeatable access without an interactive login. For browser-based work in the prokube UI, use your normal user session instead.

## Manage Keys in the UI

Open **API Keys** from the sidebar under **Serving**. Select the workspace before creating or editing keys.

Regular users see only their own keys in the selected workspace. Administrators can see and manage all keys in the workspace.

![API Keys list with owner, scopes, rate limit, and last activity per key](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/platform/api-keys/api-keys-list-last-active-framed.png)

The table shows each key's metadata, such as owner, status, scopes, client authentication, creation and expiration date, but never the full key value. The key prefix helps identify which key a client is using without exposing the secret. **Rate Limit** appears only when the platform enforces [request limits](#request-limits).

**Last active** shows when the key was last used, looking back over the longest usage window (10 days by default):

- a relative time, such as **about 2 hours ago**;
- **No calls in N days**: the whole window is covered by logs and the key made no calls;
- **No calls logged**: no calls were found, but the gateway logs start later than the window, so older calls are unknown;
- **—**: usage data or log coverage is unknown.

**View usage** opens [Gateway Usage](gateway_usage.html) with the per-key breakdown.

## Ownership and Workspace Scope

API keys are scoped by both workspace and owner:

- A key can only grant access inside the workspace where it was created.
- Regular users can list, edit, rotate, disable, and delete only their own keys.
- Administrators can list and manage all keys in the selected workspace.

For shared automation, avoid personal long-lived keys where possible. Prefer a key created by the user or service account that owns the automation, and document where the secret is stored.

## Create a Key

Click **Create Key** and fill in the form:

- **Name**: a descriptive name for the key.
- **Description**: optional context for who or what uses the key.
- **Expiration Date**: optional. Use expirations for automation keys unless there is a clear rotation process.
- **Requests Per Minute**: optional, shown only when the platform enforces [request limits](#request-limits). Leave it empty for unlimited.
- **Client Authentication**: choose how clients send the key.
- **Select Services**: choose the services this key may access.

![Create API Key dialog with client authentication and service selection](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/platform/api-keys/create-key-ui.png)

The service list is built from services available in the selected workspace. It can include:

- **Models** for KServe and LLM endpoints.
- **MCP servers** for tool access.
- **Memory stores** exposed through MCP-compatible routes.
- **A2A agents** for kagent agent-to-agent access.
- **Knative services** exposed through gateway routes.

Besides individual services, you can select aggregate scopes such as **All MCP servers** or **All AI models**. They also cover matching services created later. **Full workspace access** covers every service in the workspace. Keys with **All AI models**, **All external AI models**, or **Full workspace access** must use the Bearer format.

**All sandboxes** lets the `pk` CLI and the Python SDK manage and use the workspace's [sandboxes](../agentops/sandboxes.html#external-access-with-api-keys). Such keys must use the Bearer format; **Full workspace access** does not include sandboxes.

Admin-granted [external models](../admin/external_models.html) are not listed as individual services. To reach them, use a Bearer-format key with **All external AI models**, **All AI models**, or **Full workspace access**. These scopes cover every granted model in the workspace; a key cannot be limited to one granted model.

Select only the services the client needs. If no services are available, deploy or expose the service first, then create the key.

Service-specific scopes are the default choice for production clients. They reduce blast radius if a key is exposed and make it clear which integration depends on which platform service.

## Client Authentication

Choose the authentication format expected by the client:

| Format | Use when |
|---|---|
| `Authorization: Bearer <key>` | The client is OpenAI-compatible or expects bearer authentication. This is the recommended format for LLM clients. |
| `x-api-key: <key>` | The client cannot set an `Authorization` header, or an existing integration already sends `x-api-key`. Not available for keys with **All AI models**, **All external AI models**, **All sandboxes**, or **Full workspace access**. |

Use the service page for the exact URL and request body. Examples:

OpenAI-compatible model clients commonly use bearer authentication. For a model deployed through [LLM Serving](../agentops/llm_serving.html), `<route-id>` is the deployment name; for an admin-granted [external model](../admin/external_models.html), it is the route ID chosen in the grant:

```bash
curl "https://<your-prokube-domain>/svc/ai/<workspace>/models/<route-id>/v1/chat/completions" \
  -H "Authorization: Bearer <api-key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"<model>","messages":[{"role":"user","content":"Hello"}]}'
```

MCP clients take the key in their server configuration. The MCP server's **Overview** tab in the prokube UI shows a ready-to-copy configuration:

```json
{
  "mcpServers": {
    "<server>": {
      "type": "http",
      "url": "https://<your-prokube-domain>/svc/mcp/<workspace>/<server>",
      "headers": {
        "Authorization": "Bearer <api-key>"
      }
    }
  }
}
```

## Copy the Key Value

prokube shows the full key value only after creation or rotation. Copy it immediately and store it in your secret manager.

If you close the dialog without copying the key, create a new key or rotate the existing key. The old full value cannot be recovered from the UI.

![One-time API key display with copy action and client example](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/platform/api-keys/api-key-shown-once.png)

## Manage Existing Keys

From the API Keys page you can:

- search keys by name or prefix;
- filter by status, expiration, and scope type;
- edit metadata, expiration, request limit, enabled state, and service scopes;
- open a key's [Request Activity](#request-activity);
- disable, rotate, or delete keys.

Disable a key when you need temporary revocation or want to test whether a client still depends on it. Delete a key when it is no longer needed.

Rotating a key invalidates the old value immediately. Update every client or secret that uses the key before relying on the rotated value.

<img src="https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/platform/api-keys/api-key-actions-menu-activity-framed.png" alt="API key action menu with Activity, Edit, Disable, Rotate key value, and Delete" style="max-width: 360px; width: 100%; height: auto;">

## Request Limits

Per-key request limits are an optional platform feature and are disabled by default. A platform administrator can enable them; see [API Key Request Limits](../admin/operations_runbooks.html#api-key-request-limits). While they are disabled, the **Requests Per Minute** field and the **Rate Limit** column are hidden, and keys are not limited.

When limits are enabled, set **Requests Per Minute** when creating or editing a key: a whole number from 1 to 4,294,967,295, or empty for unlimited. To remove a limit, clear the field in **Edit**.

![Create API Key dialog with a Requests Per Minute limit of 60](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/platform/api-keys/api-key-create-rpm-limit-framed.png)

A client that exceeds the limit receives HTTP `429 Too Many Requests`. The limit works as follows:

- Every request attempt counts, including failed ones, across all services the key can reach.
- Requests are counted in fixed one-minute windows, so a client can briefly send about twice the limit around a minute boundary.
- A new or changed limit takes effect asynchronously.
- If the rate-limit service is unavailable, requests are allowed. A request limit is a protection against runaway clients, not a billing or usage quota.

The **Rate Limit** column shows `Unlimited` or the limit, such as `60 / min`, with a status:

| Status | Meaning |
|---|---|
| **Propagated** | Every route the key can use carries the limit. No over-limit rejection in the last hour. |
| **Limited recently** | Agent Gateway rejected requests over the limit within the last hour. This does not confirm that the limiter is reachable right now. |
| **Pending** | Not every route the key can use carries the limit yet. |
| **Not enforced** (grey) | No gateway policy carries the limit, for example because platform rate limiting is turned off. |
| **Not enforced** (red) | The stored limit is invalid. Edit the key and set a valid limit, or select **remove the stored limit**. |
| **Status unknown** | The gateway policy state could not be read. |

## Key Usage

Usage of all keys in the workspace is shown on [Gateway Usage](gateway_usage.html), together with model grants, internal calls, and other traffic. Select **View usage** on the API Keys page to open it on the **By API key** tab, which lists calls, LLM calls, failures, tokens, estimated cost, and last activity per key. Regular users see their own keys; platform administrators see all keys in the workspace.

### Request Activity

Select **Actions** > **Activity** on a key, or **Activity** in the key's row on Gateway Usage, to list the individual requests that Agent Gateway authenticated with that key. Regular users can open Activity for their own keys; administrators for any current key in the workspace. Deleted keys cannot open Activity.

![Request Activity for an API key with the call trend, filters, and individual calls](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/platform/gateway-usage/gateway-usage-credential-activity-framed.png)

The **Call trend** at the top shows the key's calls over the selected window. Use **Split by** **Model** or **Route** to see which models or services the key used.

Narrow the list with:

- **Time window**: Last hour, Last 24 hours, Last 7 days, or Max (10 days by default).
- **HTTP status**: one status code, for example `429`. Leave it empty for all statuses.
- **Request model**: the model ID the client requested.
- **Caller**: the full ID of the calling workload, for example `cluster.local/ns/<workspace>/sa/my-agent`, or `none` for calls through the public endpoint. A short name such as `my-agent` is rejected.

Select **Apply filters** to load the filtered list and **Refresh** to reload it. Use **Older** and **Newer** to page through the results. A page can contain fewer rows than usual, because requests with the same timestamp are always kept on one page.

Each row shows the time (UTC), HTTP status, caller, the call with its method, path, and path family (for MCP traffic, also the MCP method and tool), the requested and responding model, input and output tokens, estimated cost in USD, and duration. Fields that do not apply, such as tokens for MCP calls, show a dash.

**Export CSV** downloads the current page with the active filters, not the full history.

Activity is built from Agent Gateway access logs, which are kept for 10 days by default. It is an operational view, not a durable audit or billing record. It shows request metadata only: prompts, responses, tool arguments, and credentials are not logged. If the logs cannot be read, the view shows **Activity unavailable** with a **Retry** action.

## Security Guidance

- Prefer service-specific keys over broad workspace access.
- Set an expiration date for automation keys where possible.
- Store keys in a secret manager, not in source code, notebooks, screenshots, shell history, or issues.
- Rotate keys when ownership changes, a client is redeployed, or a key may have been exposed.
- Disable a key first if you need to test impact before deleting it.
- Delete keys that are no longer used.

## Troubleshooting

| Symptom | Check |
|---|---|
| No services are available when creating a key | Confirm the target service exists in the selected workspace and is exposed through Agent Gateway-supported routes. |
| A key is not visible to another user in the same workspace | Regular users only see keys they created. Ask an administrator if shared visibility or management is required. |
| Client receives `401` or `403` | Confirm the key is enabled, not expired, sent with the selected authentication header, and scoped to the target service. |
| Client can call one service but not another | The key is scoped to selected services. Edit the key or create a new key for the additional service. |
| Client stopped working after rotation | The old key value stopped working immediately. Update the client secret or environment variable with the new value. |
| Client receives `429` | The key exceeded its [request limit](#request-limits). Slow the client down or raise the limit. Check the key's [Request Activity](#request-activity) for status `429`. |

## Related Pages

- [Gateway Usage](gateway_usage.html)
- [Agent Gateway](agent_gateway.html)
- [MCP Servers](../agentops/mcp_servers.html)
- [Model Serving](../mlops/model_serving.html)
- [Serverless](../mlops/knative.html)
