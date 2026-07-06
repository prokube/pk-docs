# API Keys

API keys provide scoped programmatic access to services exposed through Agent Gateway. Use them for SDKs, automation, CI jobs, and external clients that need to call prokube services without a browser session.

API keys are managed per workspace. A key belongs to the workspace that was selected when it was created, and its scopes are evaluated within that workspace.

## Manage Keys in the UI

Open **API Keys** from the sidebar under **AI Gateway**. Select the workspace you want to manage before creating or editing keys.

The page shows the keys available to you in the selected workspace. Administrators can see all keys in the workspace; regular users see the keys they created.

<!-- Screenshot placeholder: API Keys list page with workspace selector, filters, and keys table. -->

## Create a Key

Click **Create API Key** and fill in the fields:

- **Name**: a short, descriptive name such as `ci-sandbox-client`.
- **Description**: optional context for who or what uses the key.
- **Expiration Date**: optional. Leave it empty only for long-lived keys that have an explicit rotation plan.
- **Access Scope**: choose what the key can access.

<!-- Screenshot placeholder: Create API Key dialog showing name, description, expiration date, and access scope. -->

### Scope Types

Choose the narrowest scope that supports your client.

| Scope | Use When | Access |
|---|---|---|
| **Workspace Access** | The client needs broad access across services in one workspace. | All Agent Gateway-protected services in the selected workspace. |
| **Specific Services** | The client only needs one or more known services. | Only the selected models, MCP servers, memory stores, or Knative services. |

Specific-service scopes are built from the services currently available in the selected workspace. The UI can include:

- **Models**: model-serving endpoints.
- **MCP servers**: AgentOps tools exposed through MCP.
- **Memory stores**: memory store MCP endpoints.
- **Knative services**: workspace services exposed through Agent Gateway.

<!-- Screenshot placeholder: Specific Services selector showing available models, MCP servers, memory stores, and Knative services. -->

After creation, the full key value is shown once. Copy it immediately and store it in your secret manager. It will not be displayed again.

<!-- Screenshot placeholder: API Key Created dialog showing the one-time key value, copy button, and scope summary. -->

## Use a Key

For Agent Gateway service routes, send the key as `x-api-key`:

```bash
curl "https://<your-domain>/sandbox/<workspace>/sandboxes" \
  -H "x-api-key: <api-key>"
```

The prokube TypeScript SDK sends API keys as `x-api-key`. Current Python SDK versions support `x-api-key` through `PROKUBE_API_KEY_HEADER=x-api-key`; check the SDK documentation for your installed version.

Some OpenAI-compatible model clients expect bearer authentication. For those clients, use the model-serving example shown on the model page, typically:

```bash
Authorization: Bearer <api-key>
```

Use the service documentation for the exact route, request body, and expected authentication header.

## Manage Existing Keys

From the API Keys page you can:

- **Search and filter** keys by name, prefix, status, expiration, and scope type.
- **Edit** the name, description, expiration date, enabled state, or scopes.
- **Disable** a key to temporarily revoke access without deleting it.
- **Rotate** a key to generate a new value for the same key record. The previous value stops working immediately, and the new value is shown once.
- **Delete** a key permanently. Deletion cannot be undone.

<!-- Screenshot placeholder: Edit API Key dialog with metadata, enabled state, expiration, and scopes. -->

## Security Guidance

- Prefer specific-service scopes over workspace access.
- Set an expiration date for automation keys whenever possible.
- Store keys in a secret manager, not in source code, notebooks, or shell history.
- Rotate keys when ownership changes, a client is redeployed, or a key may have been exposed.
- Disable a key first if you need to test impact before deleting it.
- Delete keys that are no longer used.

## Related Pages

- [API Access](api_access.html)
- [Agent Gateway](../agentops/agent_gateway.html)
- [Sandboxes](../agentops/sandboxes.html)
- [MCP Servers](../agentops/mcp_servers.html)
- [Model Serving](../mlops/model_serving.html)
