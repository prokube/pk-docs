# Agent Tracing

Agent tracing records what an agent does in each conversation: model calls, tool calls, timings, and errors. Traces go to your workspace's [MLflow](../mlops/mlflow.md), to any OTLP endpoint such as Grafana Tempo, Langfuse, or Phoenix, or to both.

Nothing is exported by default. You set up trace export once per workspace and then turn it on per agent.

## Set Up Trace Export

1. On the **Agents** page, open **Trace export** and click **Set up trace export**.
2. Choose one or more destinations:
   - **MLflow in this workspace:** enter the **experiment ID** (shown in the experiment's URL in MLflow), the **MLflow user**, and select the Secret and key that hold that user's MLflow token. Create the token in MLflow under **Permissions** → **Tokens**; the user needs write access to the experiment.
   - **OTLP endpoint:** enter a name and the receiver's base URL; `/v1/traces` is appended. If the receiver needs a credential, turn on **Send a credential header** and select the header, prefix, and the Secret and key with the value.
3. Choose whether to **Record prompts and answers**. When off, traces show steps, timings, and tool arguments, but not the messages exchanged with the model.

prokube then runs a small collector in the workspace. It forwards the traces with the credentials from your Secrets. Agents never see these credentials.

## Turn Tracing On for an Agent

Turn on **Export traces** in the agent's **Capabilities**, when you create the agent or later under **Configuration**. This starts a new revision of the agent; running conversations are not affected.

Tracing is available for agents on the `default` runtime.

## What a Trace Shows

Each conversation turn is one trace. It starts with an `invoke_agent <agent>` span, with `generate_content <model>` spans for model calls and `execute_tool <tool>` spans for tool calls below it. Internal request spans of kagent are filtered out.

Tool arguments and results are part of the trace even when prompts and answers are not recorded. Do not turn on tracing for agents whose tool arguments must not leave the agent.

## Behavior and Limits

- Export is best effort: if the collector or a destination is down, the agent still answers and that trace is lost.
- Changing destinations only restarts the collector; agents keep running.
- The collector runs in the workspace namespace, so the workspace's [egress profile](../admin/network_policies.md) applies to its connections to external endpoints.
- Agents in other workspaces cannot send traces to your collector.
- **Remove** is refused while agents still export traces; turn it off for them first.
- Creating a new MLflow token invalidates the previous one. After rotating it, update the Secret and save the trace export again so the collector restarts with the new token.

## Related Pages

- [Agents](agents.md)
- [MLflow](../mlops/mlflow.md)
- [Observability](../platform/observability.md)
