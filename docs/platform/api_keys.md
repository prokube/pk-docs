# API Keys

API keys provide scoped programmatic access to platform resources through the Agent Gateway. They are managed per workspace and can be used with both AgentOps and MLOps endpoints.

## Manage Keys in the UI

Open the **API Keys** page from the sidebar (under AI Gateway). Select your workspace; the selected workspace determines which services are available for scoping and which namespace the key belongs to.

<!-- TODO: add screenshot -- API Keys list page with search, filter chips, and keys table -->

### Create a Key

Click **Create API Key** and fill in the fields:

- **Name** – a human-readable identifier for the key.
- **Description** – optional, for additional context.
- **Expiration Date** – optional; keys with no expiration date do not expire.
- **Access Scope** – choose between:
  - **Workspace Access** – the key can access all services in the selected workspace.
  - **Specific Services** – select individual models, MCP servers, or memory stores.

<!-- TODO: add screenshot -- Create API Key modal with scope selection -->

After creation the full key value is shown once. Copy it immediately — it will not be displayed again. Key values start with `pk_live_`.

<!-- TODO: add screenshot -- Key Created dialog showing the full key value with copy button and scope summary -->

### Authentication Header

Include the API key in requests to external endpoints:

```
Authorization: Bearer <api-key>
```

Some services also accept the key as the `x-api-key` header.

### Manage Existing Keys

From the API Keys list you can:

- **Edit** – change name, description, expiration, or scopes.
- **Enable / Disable** – temporarily revoke access without deleting the key.
- **Rotate** – generate a new key value while keeping the same metadata. The old value stops working immediately; the new value is shown once.
- **Delete** – permanently remove the key. This cannot be undone.

<!-- TODO: add screenshot -- Edit API Key modal with name, description, expiration, and scope fields -->

## Usage

Once you have an API key, use it to call model serving endpoints, sandbox APIs, MCP servers, and other Agent Gateway-protected routes. See the relevant service page for the exact URL pattern and request format.

## Related Pages

- [API Access](api_access.html)
- [Model Serving](../mlops/model_serving.html)
- [Agent Gateway](../agentops/agent_gateway.html)
