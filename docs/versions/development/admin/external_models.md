# External Models

The **AI Gateway** admin page connects centrally managed model providers to prokube. Administrators can add provider credentials once, register models from those providers, and grant specific workspaces access to specific models.

Use this workflow when you need to:

- offer Mistral AI, Azure OpenAI, or a custom OpenAI-compatible endpoint;
- share a centrally managed provider credential without copying it into workspace Secrets;
- control which workspaces can use each external model.

For OpenAI, Anthropic, or Gemini, workspace users can instead create their own Model Configuration backed by a workspace Kubernetes Secret. See [Agents](../agentops/agents.html#_2-choose-or-create-a-model-configuration).

![AI Gateway catalog with Anthropic, OpenAI, Mistral AI, Azure OpenAI, and custom OpenAI-compatible providers](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/admin/external-models/ai-gateway-provider-catalog-framed.png)

## Provider Options

The admin-managed provider catalog supports:

- Anthropic;
- OpenAI;
- Mistral AI;
- Azure OpenAI;
- custom OpenAI-compatible endpoints.

Anthropic uses its native protocol. The other provider types use an OpenAI-compatible protocol. Custom and Azure OpenAI providers require an upstream host; the path prefix selects the API path on that host.

## Connect a Provider

Open **AI Gateway** under **Admin**, then select **Add Provider**. Configure:

- **Provider**: select an entry from the provider catalog.
- **Provider name**: unique name for the provider connection.
- **Provider API key**: credential stored centrally by prokube.
- **Upstream host** and **Path prefix**: configure the endpoint for custom and Azure OpenAI providers. The host is required; Azure defaults to `/openai/v1` for the path prefix.
- **Models**: discover model IDs or add them manually. Add at least one model before saving.

Provider API keys are write-only. To rotate one later, edit the provider and enter a **Replacement API key**.

### Azure OpenAI

Enter your Azure resource host in **Upstream host**. **Path prefix** defaults to `/openai/v1`. Authentication uses the resource API key.

Only the Azure OpenAI v1 API is supported. Classic deployment URLs with an `api-version` parameter and Microsoft Entra ID sign-in aren't supported.

Add models manually using **Deployment name**: enter the deployment name from your Azure resource, not the underlying model ID. Discovery cannot enumerate deployment names.

### Custom Endpoint Discovery and Testing

For **Custom OpenAI-compatible**, **Discover models** requires HTTPS and a public DNS host. **Test model access** also permits private DNS hosts explicitly allowed by the platform administrator. Neither supports raw IP addresses, localhost, HTTP endpoints, or cluster-internal hosts.

**Test model access** sends a minimal request for one chosen model and capability, which may incur a provider charge. It doesn't test every selected model or evaluate output quality.

For an endpoint that cannot be tested, add model IDs manually. Select **Add Provider**, review the warning, then explicitly select **Add without successful test**. This saves the provider without verifying runtime connectivity or model access. Discovery alone doesn't verify model access either.

## Add Models

Open a provider and switch to its **Models** tab. Models can be added in two ways:

- **Discover models** queries the provider and lets you select one or more returned model IDs.
- **Add manually** registers a model ID directly.

The main **Models** table shows each model's provider, API protocol, workspace-access count, and base URL. A model cannot be deleted while a workspace grant still references it, including an orphaned grant. When deletion is blocked, the dialog lists each blocking workspace, ModelConfig, and grant health. Select **Open Workspace Access to revoke these grants**, revoke the listed grants, then retry deletion.

## Grant Workspace Access

Select **Grant Workspace Access**, then choose:

- **Workspace**: the workspace that should receive the model.
- **Route ID / ModelConfig name**: the name shown in that workspace's Model Configurations.
- **Resource**: the provider model to grant.

The grant creates a Model Configuration in the target workspace. It appears automatically on the workspace's **Agents** page, tagged **AI Gateway** as its origin. Users can select it when creating an agent without creating their own provider Secret.

![Workspace Access table with an external model grant](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/admin/external-models/grant-workspace-access.png)

![Granted external model shown as an AI Gateway Model Configuration](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/admin/external-models/grant-workspace-access-agents-tab.png)

The central provider credential is not exposed to the workspace. Revoke the grant from **Workspace Access** when the workspace should no longer use the model.

### Workspace Access Health

The health shown in **Workspace Access** describes the grant's resources, not the status of a grant or revoke operation:

| Health | Meaning |
|---|---|
| **Healthy** | All expected grant resources are present. |
| **Degraded** | Some grant resources are missing or inconsistent. |
| **Orphaned** | The workspace ModelConfig is missing, but the grant remains and still blocks model deletion. Revoke access to remove it. |
| **Unknown** | Grant health could not be determined. Managed access can still be revoked. |

You can revoke orphaned grants as well as grants with unknown health; neither requires a healthy ModelConfig first.

### Grant and Revoke Status

Saving a grant or revoke records the change first. The Agent Gateway controller then creates or removes the workspace's gateway access, which can take a few seconds. The page shows the progress of each operation:

| State | Meaning |
|---|---|
| **Applying** | The request was accepted and is waiting for reconciliation. Access is not confirmed yet. |
| **Applied** | Workspace access was granted or revoked. |
| **Failed** | The change could not be applied. If the operation was accepted, resolve the blockers shown, then select **Check again**. |
| **Unknown** | The status could not be read, for example while the controller is unavailable. This is not a success. Select **Check again** if it is offered; otherwise inspect **Workspace Access** before making another change. |

**Check again** only reads the status of the accepted operation; it never repeats the grant or revoke. After an unknown or failed outcome, review the refreshed **Workspace Access** table and select **Acknowledge and continue**.

If a workspace was deleted, its grants stay listed until you revoke them. Revoking succeeds once Kubernetes has removed the workspace's resources; until then, the revoke is rejected and can be retried.

Agents in the workspace use the granted model through its generated Model Configuration. External clients can call it through Agent Gateway at `/svc/ai/<workspace>/models/<route-id>/v1/...`, using the route ID chosen in the grant.

Granted models are not listed as individual services on the **API Keys** page. An external client needs a Bearer-format key with **All external AI models**, **All AI models**, or **Full workspace access**, which covers every granted model in the workspace. A key cannot be limited to one granted model. See [API Keys](../platform/api_keys.html#create-a-key).

## Usage and Cost

The **Usage and Cost** panel shows authenticated Agent Gateway traffic across all workspaces. Select Last hour, Last 24 hours, Last 7 days, or Last 30 days to view:

- total, successful, and failed requests;
- request trends;
- LLM input and output tokens;
- estimated LLM cost.

These figures are observability estimates, not billing records. Use the workspace [API Key Usage Dashboard](../platform/api_keys.html#usage-dashboard) to inspect usage attributed to visible keys in one workspace. Platform-wide in-cluster traffic and requests without a valid key are shown under [System Status](../platform/system_status.html#ai-gateway-traffic).

Agent Gateway computes the cost of each LLM request from its model price catalog when the request is served. Models without a price, such as self-hosted models, show no cost; the panel then reports **Partial pricing coverage** or **Model pricing unavailable**. Add the missing prices under [Model Pricing](#model-pricing). Prices apply only to new requests; see [Pricing and Historical Usage](#pricing-and-historical-usage).

## Model Pricing

Agent Gateway ships with built-in prices for common hosted models. Use the **Model pricing** panel on the **AI Gateway** admin page to price models it does not know, such as self-hosted models, or to set negotiated prices.

![Model pricing panel with a custom price for one model](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/admin/external-models/model-pricing-panel-framed.png)

### Add or Edit a Price

1. Select **Add price**, or select **Edit price** in a row's menu. Models listed under **Used in the last 24 hours without a price** have their own **Add price** button that pre-fills the provider and model.
2. Enter **Provider** and **Model** as the gateway logs them:
   - **Provider** is the logged provider name. Self-hosted and custom OpenAI-compatible providers usually log `custom`.
   - **Model** is the model ID returned in the response, or the requested model if the response names none.

   Both are catalog keys. They are not necessarily the provider connection name or the route ID of a workspace grant.
3. Enter rates in USD per million tokens: **Input**, **Output**, **Cache read**, **Cache write**, and **Reasoning**. Fill in at least one. An empty field keeps the gateway's built-in price for that rate. Values allow up to 6 decimal places; more precise values are rejected, not rounded.
4. Select **Save price**.

New requests use the price within a few minutes, without a gateway restart. **Delete price** removes your custom rates; the gateway then falls back to its built-in price for that model, if it has one.

If another administrator changed pricing at the same time, saving fails with a conflict message and keeps your draft. Cancel, select **Reload pricing**, review the current values, and save again.

![Add model price dialog with provider, model, and token rates](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/admin/external-models/model-pricing-add-price-framed.png)

### Start from Default Prices

Select **Show default prices** to browse the built-in prices of the deployed Agent Gateway release. The view shows the **Release version** and when the snapshot was generated (**Snapshot generated**), and can be searched by provider or model.

- Prices are flat token rates in USD per million tokens. Context tiers, audio, and per-page pricing are not shown. A dash means the catalog lists no rate, not that usage is free.
- The snapshot is published with the platform release. It is not read from the running gateway.
- Models you have priced are marked **Overridden**. Select **Edit price** to change your price, or **Override price** on another model to open the editor pre-filled with its default rates.

Saving an override changes only your custom prices; the default prices stay unchanged. If the platform does not publish a snapshot, the view shows **Default prices are not published by the platform.**

![Default model prices with release version and snapshot date, filtered by a search](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/admin/external-models/model-pricing-default-prices-framed.png)

### Pricing and Historical Usage

The gateway records a request's cost when it serves the request. A new or changed price is not applied retroactively:

- Requests served before the price took effect stay unpriced. Saving a price does not turn **Unavailable** into a historical estimate; cost appears once new requests for the model are served and Prometheus records them.
- In a window that mixes old and new traffic, request and token totals include all requests, but the cost covers only requests that were priced when served. For example, with 100 requests before pricing and 10 after, the totals cover 110 requests and the cost covers 10.
- Pricing coverage is evaluated per model, not per request. Once a model reports costs, the coverage warning can disappear even though earlier requests for that model in the selected window are unpriced. Do not read the displayed amount as complete historical cost.

### Manage Prices with GitOps

The panel stores prices in the ConfigMap `agentgateway-model-catalog` in the `agentgateway-system` namespace, key `catalog.json`. The platform does not ship this ConfigMap; the first save in the panel creates it. Prices are merged over the built-in catalog:

```json
{"providers":{"custom":{"models":{"my-model":{"rates":{"input":"0.50","output":"1.50"}}}}}}
```

- Rates are decimal strings in USD per million tokens. `cacheRead`, `cacheWrite`, and `reasoning` are optional.
- The catalog can hold up to 500 provider and model pairs and 256 KiB.
- If the file is not valid JSON, the gateway keeps the last valid prices. Requests are not affected.

Use either GitOps or the panel to manage this ConfigMap, not both. The panel keeps content it does not manage and rejects stale changes, but a GitOps tool restores its own version on the next sync.

To verify a price, send a new request to the model, then check the cost under **API Keys > Usage**, or search the gateway logs for `agw.ai.usage.cost.total`. See [Auditing LLM Usage](operations_runbooks.html#auditing-llm-usage).

## Related Pages

- [Agents](../agentops/agents.html)
- [Agent Gateway](../agentops/agent_gateway.html)
- [API Keys](../platform/api_keys.html)
- [LLM Serving](../agentops/llm_serving.html)
