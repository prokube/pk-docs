# LLM Usage and Cost

The **LLM Usage and Cost** admin page shows LLM calls through Agent Gateway across all workspaces, for external and self-hosted models alike, and is where administrators set model prices. Open it under **Admin** in the sidebar. Only platform administrators can open it.

Use this page to answer platform-wide questions, such as which workspaces spend the most or which models are used without a price. For one workspace, including MCP, agent, and other non-LLM calls, use [Gateway Usage](../platform/gateway_usage.html). For external providers only, use the usage card on [External Models](external_models.html#external-model-usage).

## Usage and Cost

![Usage and Cost with LLM call, token, and cost totals, the trend, and breakdowns by source and workspace](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/admin/llm-usage/llm-usage-and-cost-card.png)

Select a time window: **Last hour**, **Last 24 hours** (default), **Last 7 days**, or **Max (N days)**. N defaults to 10 and is limited by how long the gateway keeps its access logs.

The card shows:

- **LLM calls**: calls to language, embedding, and rerank models.
- **Input tokens** and **Output tokens**.
- **Estimated LLM cost**: **Some calls have no price set** means the total is partial.
- **LLM call trend**: LLM calls per interval.
- **By source**: the same five sources as on [Gateway Usage](../platform/gateway_usage.html#sources): API keys, External model grants, Internal calls, Token calls, and Calls without valid credentials.
- **By workspace**: LLM calls, tokens, and cost per workspace. Calls that cannot be attributed to a workspace are listed as **No workspace**.

Calls that bypass Agent Gateway are not included. These figures are estimates for observability, not billing records.

## Model Pricing

Agent Gateway calculates the cost of each LLM call from its model price catalog. It ships with built-in prices for common hosted models. Use **Model pricing** to price models it does not know, such as self-hosted models, or to set negotiated prices.

![Model pricing panel with a custom price and a model used without a price](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/admin/llm-usage/llm-usage-model-pricing-panel.png)

**Used in the last 24 hours without a price** lists models that received calls but have neither a built-in nor a custom price. Their calls show tokens but no cost.

### Add or Edit a Price

1. Select **Add price**, or **Edit price** in a row's menu. A model under **Used in the last 24 hours without a price** has its own **Add price** button that pre-fills the provider and model.
2. Enter **Provider** and **Model** as the gateway logs them:
   - **Provider** is the logged provider name. Self-hosted and custom OpenAI-compatible providers usually log `custom`.
   - **Model** is the model ID returned in the response, or the requested model if the response names none.

   Both are catalog keys. They are not necessarily the provider connection name or the route ID of a workspace grant.
3. Enter rates in USD per million tokens: **Input**, **Output**, **Cache read**, **Cache write**, and **Reasoning**. Fill in at least one. An empty field keeps the gateway's built-in price for that rate. Values allow up to 6 decimal places; more precise values are rejected, not rounded.
4. Select **Save price**.

<img src="https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/admin/llm-usage/llm-usage-add-price-dialog.png" alt="Add model price dialog pre-filled for a self-hosted model" style="max-width: 672px; width: 100%; height: auto;">

New calls use the price within a few minutes, without a gateway restart. **Delete price** removes your custom rates; the gateway then falls back to its built-in price for that model, if it has one.

If another administrator changed pricing at the same time, saving fails with a conflict message and keeps your draft. Cancel, select **Reload pricing**, review the current values, and save again.

### Start from Default Prices

Select **Show default prices** to browse the built-in prices of the deployed Agent Gateway release. The view shows the **Release version** and when the snapshot was generated (**Snapshot generated**), and can be searched by provider or model.

- Prices are flat token rates in USD per million tokens. Tiered, audio, and per-page prices are not shown. A dash means the catalog lists no flat rate, not that usage is free.
- The snapshot is published with the platform release. It is not read from the running gateway, and current provider prices may differ.
- Models you have priced are marked **Overridden**. Select **Edit price** to change your price, or **Override price** on another model to open the editor pre-filled with its default rates.

Saving an override changes only your custom prices; the default prices stay unchanged. If the platform does not publish a snapshot, the view shows **Default prices are not published by the platform.**

![Default model prices with release version and snapshot date, filtered by a search](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/admin/llm-usage/llm-usage-default-prices-dialog.png)

### Pricing and Historical Usage

The gateway records a call's cost when it serves the call. A new or changed price is not applied retroactively:

- Calls served before the price took effect stay unpriced and show **No price set**. Cost appears for calls made after the price takes effect.
- In a window that mixes old and new traffic, call and token totals include all calls, but the cost covers only calls that were priced when served. For example, with 100 calls before pricing and 10 after, the totals cover 110 calls and the cost covers 10.
- Do not read the displayed amount as complete historical cost for windows that include calls from before the price was set.

### Manage Prices with GitOps

The panel stores prices in the ConfigMap `agentgateway-model-catalog` in the `agentgateway-system` namespace, key `catalog.json`. The platform does not ship this ConfigMap; the first save in the panel creates it. Prices are merged over the built-in catalog:

```json
{"providers":{"custom":{"models":{"my-model":{"rates":{"input":"0.50","output":"1.50"}}}}}}
```

- Rates are decimal strings in USD per million tokens. `cacheRead`, `cacheWrite`, and `reasoning` are optional.
- The catalog can hold up to 500 provider and model pairs and 256 KiB.
- If the file is not valid JSON, the gateway keeps the last valid prices. Calls are not affected.

Use either GitOps or the panel to manage this ConfigMap, not both. The panel keeps content it does not manage and rejects stale changes, but a GitOps tool restores its own version on the next sync.

To verify a price, send a new call to the model, then check its cost in the key's [Request Activity](../platform/api_keys.html#request-activity) or on [Gateway Usage](../platform/gateway_usage.html), or search the gateway logs for `agw.ai.usage.cost.total`. See [Auditing LLM Usage](operations_runbooks.html#auditing-llm-usage).

## Related Pages

- [External Models](external_models.html)
- [Gateway Usage](../platform/gateway_usage.html)
- [System Status](../platform/system_status.html#agent-gateway-traffic)
- [Auditing LLM Usage](operations_runbooks.html#auditing-llm-usage)
