# External Models

The **External Models** admin page connects centrally managed model providers to prokube. Administrators can add provider credentials once, register models from those providers, and grant specific workspaces access to specific models.

Use this workflow when you need to:

- offer Mistral AI, Azure OpenAI, or a custom OpenAI-compatible endpoint;
- share a centrally managed provider credential without copying it into workspace Secrets;
- control which workspaces can use each external model.

For OpenAI, Anthropic, or Gemini, workspace users can instead create their own Model Configuration backed by a workspace Kubernetes Secret. See [Agents](../agentops/agents.html#_2-choose-or-create-a-model-configuration).

![External Models page with the provider catalog for Anthropic, OpenAI, Mistral AI, Azure OpenAI, and custom OpenAI-compatible endpoints](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/admin/external-models/external-models-provider-catalog.png)

Usage across all models and model pricing are on [LLM Usage and Cost](llm_usage.html).

## Provider Options

The admin-managed provider catalog supports:

- Anthropic;
- OpenAI;
- Mistral AI;
- Azure OpenAI;
- custom OpenAI-compatible endpoints.

Anthropic uses its native protocol. The other provider types use an OpenAI-compatible protocol. Custom and Azure OpenAI providers require an upstream host; the path prefix selects the API path on that host.

## Connect a Provider

Open **External Models** under **Admin**, then select **Add Provider**. Configure:

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

The grant creates a Model Configuration in the target workspace. It appears automatically on the workspace's **Agents** page with the source **External model grant**. Users can select it when creating an agent without creating their own provider Secret.

![Workspace Access table with a healthy grant and its View Traffic and Revoke Access actions](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/admin/external-models/external-models-workspace-access-view-traffic-framed.png)

![Granted external model listed under Model Configurations with the source External model grant](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/admin/external-models/agents-model-configurations-external-grant-framed.png)

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

### Traffic for a Grant

Select **View Traffic** in a grant's row menu to see the calls that reached the granted model in that workspace: calls, failures, LLM tokens, estimated cost, the breakdown by source, and a call trend. The same view appears on the granted Model Configuration's detail page under **Agents**.

Traffic is shown only to members of the workspace. For a workspace you don't belong to, **View Traffic** is disabled; use [LLM Usage and Cost](llm_usage.html) for platform-wide numbers instead.

## External Model Usage

The **External model usage** card shows LLM calls to the configured external providers, both through workspace grants and directly. Select **Last hour**, **Last 24 hours**, **Last 7 days**, or **Max (N days)**.

![External model usage card with totals, trend, and breakdowns by source, provider, gateway model, and workspace](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/admin/external-models/external-models-usage-card-framed.png)

Besides the LLM call, token, and estimated cost totals and the trend, the card breaks the calls down **By source**, **By provider**, **By gateway model**, and **By grant / workspace**.

The card counts only routes whose backends are currently configured external providers. Self-hosted models are excluded even if they share a provider type or model name, and calls to a provider that has since been removed no longer appear here. Use **LLM Usage and Cost — all models** for all LLM calls, including self-hosted models and removed providers, and **Set prices** to open [Model Pricing](llm_usage.html#model-pricing).

Costs are estimates at the prices that were set when each call was made, not billing records. A model without a price shows tokens but no cost.

## Related Pages

- [LLM Usage and Cost](llm_usage.html)
- [Agents](../agentops/agents.html)
- [Agent Gateway](../agentops/agent_gateway.html)
- [API Keys](../platform/api_keys.html)
- [LLM Serving](../agentops/llm_serving.html)
