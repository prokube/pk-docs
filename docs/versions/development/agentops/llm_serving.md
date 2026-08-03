# LLM Serving

LLM Serving deploys self-hosted models — text generation, embedding, reranking, text-to-speech, and speech-to-text — as OpenAI-compatible inference endpoints on KServe. It is the in-cluster counterpart to connecting an external provider: use it when you want to host the model yourself instead of calling OpenAI, Anthropic, or Gemini.

LLM Serving is an AgentOps capability. For classic (non-LLM) model serving — scikit-learn, PyTorch, and similar predictors — see [Model Serving](../mlops/model_serving.html) instead; the two use the same KServe foundation but different deployment forms and endpoints.

## When to Use LLM Serving

- Host an open-weight model (Llama, Mistral, Qwen, Gemma, and similar) in-cluster instead of calling an external API.
- Serve embedding or reranking models for retrieval workloads.
- Serve text-to-speech or speech-to-text models.
- Provide an in-cluster model for a kagent [Agent](agents.html) via an **Internal** Model Configuration, with or without tool calling.
- Keep model traffic and data inside the cluster instead of sending it to an external provider.

If you only need OpenAI, Anthropic, or Gemini, create a Model Configuration directly instead. See [Agents: Choose or Create a Model Configuration](agents.html#_2-choose-or-create-a-model-configuration).

## Deploy a Model

Open **LLM Serving** in the sidebar. The page lists deployed models for the selected workspace, filterable by type (**All / Text Generation / Embedding / Reranking**), with columns for name, status, model ID, type, runtime, and age.

Screenshot placeholder:

```text
docs/_static/screenshots/agentops/llm-serving/llm-serving-list.png
```

Click **Deploy Model** to deploy from a **preset** (a curated, pre-filled configuration — searchable and filterable by GPU count, task type, and verification status) or **Deploy Custom Model** to configure from scratch. Both open the same form:

- **Deployment Name**: unique name in the workspace.
- **Model Type**: Text Generation, Embedding, Reranking, Text to Speech, or Speech to Text. Typing a HuggingFace-style model ID (`org/model`) auto-detects the type.
- **Model ID**: a HuggingFace model ID, for example `meta-llama/Llama-2-7b-chat-hf`. HuggingFace is the only model source available in the form; use the YAML editor for other storage URIs.
- **Runtime**: filtered to runtimes that support the selected type — HuggingFace (recommended, covers text generation and embeddings), TEI (CPU-optimized embeddings), vLLM (requires a custom ClusterServingRuntime), vLLM Omni (audio models), or faster-whisper (CPU speech-to-text).

Screenshot placeholder:

```text
docs/_static/screenshots/agentops/llm-serving/deploy-model-form.png
```

If the model is gated on HuggingFace, the form warns you before deploying: accept the license on huggingface.co, create an access token, and store it as a Kubernetes Secret named `storage-config` with key `HF_TOKEN` in the workspace (see [Kubernetes Secrets](../platform/kubernetes.html#kubernetes-secrets)). Deployment fails without it.

A **"Or edit YAML manifest directly"** link is available if the form doesn't cover a setting you need (custom storage URI, extra container args, and so on).

## Advanced Configuration

The **Advanced Configuration** section (collapsed by default) covers:

- **Deployment Mode**: **Serverless (Knative)** (default, supports scale-to-zero) or **Raw Deployment** (a plain Kubernetes Deployment, for clusters without Knative or when using KEDA; minimum replicas is forced to 1).
- **Quantization** and **Data Type (dtype)** — vLLM-only (HuggingFace runtime runs on vLLM internally, so this also applies to it): AWQ, GPTQ, FP8, BitsAndBytes, SqueezeLLM, Marlin, GGUF for quantization; Float16, BFloat16, or Float32 for dtype.
- **Automatic tool calling** — see [Enable Tool Calling for Agents](#enable-tool-calling-for-agents) below.
- **Resource Requests**: CPU, memory, and GPU count/type (GPU options are discovered from the cluster). Optional separate resource limits; if left blank, CPU limit defaults to 2× the request and memory limit matches the request.
- **Auto-Scaling**: min/max replicas (1–10). Set min replicas to 0 for scale-to-zero — only available in Serverless mode.
- **Autoscaler Mode** (Raw Deployment only): **HPA** for CPU/memory-based scaling, or **KEDA** for custom Prometheus-metric scaling (for example vLLM token throughput). KEDA mode requires a PromQL query and a scale threshold that you calibrate against observed traffic — see [Serving Autoscaling](../mlops/model_serving_autoscaling.html) for the general KEDA pattern in prokube.

## Enable Tool Calling for Agents

Not every runtime supports OpenAI-style tool calling. The **"Enable automatic tool calling"** option only appears for the **vLLM** and **HuggingFace** runtimes, and only when Model Type is **Text Generation** — it is not available for TEI, vLLM Omni, faster-whisper, or non-text-generation tasks.

If you plan to attach MCP tools to a kagent agent that uses this model (an **Internal** Model Configuration), turn this on and select a **Tool-call parser** matching the model's tool-call format:

| Parser | Matches |
|---|---|
| Hermes | Qwen 2.5, QwQ, and Nous Hermes formats |
| Qwen3 XML | Qwen3-Coder tool-call format |
| Llama 3 JSON | Llama models using JSON tool calls |
| Pythonic | Llama models using Python-style tool calls |
| Mistral | Mistral tool-call format |
| DeepSeek V3 | DeepSeek V3 format |
| DeepSeek V3.1 | DeepSeek V3.1 format |

This list matches the parsers built into the platform's currently deployed vLLM runtime and may change as that runtime is upgraded; use YAML editing for a parser or chat template not listed here. Without a matching parser, an agent's tool calls against this model will not work reliably even though the Model Configuration and deployment are otherwise valid.

## Test a Deployed Model

Open a **Ready** model from the list. Text-generation models get a **Chat** tab — a built-in streaming chat tester. Embedding, reranking, and audio models get an **API** tab (or **Test** for text-to-speech/speech-to-text) showing the endpoint path and a ready-to-run `curl` example for each supported operation (chat completions, completions, embeddings, rerank, speech, or transcription).

The Configuration tab also shows Basic Information, Resources, Scaling, and API Endpoints for the model, alongside Metrics, Logs, and Conditions tabs for troubleshooting. While model weights are downloading, a storage panel shows progress (queued, preparing, downloading, or failed) instead of the usual tabs.

## Edit a Model

From the model list or detail page, **Edit** lets you change Model Type, Quantization, Data Type, tool-calling settings, resource requests/limits, and auto-scaling. Model ID, runtime, and deployment mode are fixed after creation — change them by deleting and redeploying, or through the **YAML** tab.

## External Access

Endpoints shown on the model's detail/API tabs are the workspace-internal serving URL, useful for testing from inside the platform. For external clients (SDKs, CI jobs, applications outside the cluster), call the model through [Agent Gateway](agent_gateway.html) instead, using the `/ai/<workspace>/models/<route-id>/v1/...` path family and an API key scoped to the model. See [API Keys](../platform/api_keys.html). This is the same path family used by models granted through [External Models](../admin/external_models.html).

To use a deployed model from a kagent agent instead of an external client, create an **Internal - OpenAI-compatible** Model Configuration and pick this model from the **LLM Serving model** dropdown. See [Agents](agents.html#_2-choose-or-create-a-model-configuration).

## Related Pages

- [Agents](agents.html)
- [Agent Gateway](agent_gateway.html)
- [API Keys](../platform/api_keys.html)
- [Model Serving](../mlops/model_serving.html)
- [Serving Autoscaling](../mlops/model_serving_autoscaling.html)
