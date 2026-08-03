# Model Serving Autoscaling

KServe supports several autoscaling modes for inference workloads. The right choice depends on what actually limits the model: request concurrency, request rate, CPU or memory use, GPU cache pressure, queue depth, or generated-token throughput.

::: info Upstream documentation
Use the upstream KServe documentation for the full autoscaling API reference:

- [KServe autoscaling](https://kserve.github.io/website/docs/model-serving/predictive-inference/autoscaling/)
- [Knative Pod Autoscaler](https://kserve.github.io/website/docs/model-serving/predictive-inference/autoscaling/kpa-autoscaler/)
- [Kubernetes HPA](https://kserve.github.io/website/docs/model-serving/predictive-inference/autoscaling/hpa-autoscaler/)
- [KEDA autoscaler](https://kserve.github.io/website/docs/model-serving/predictive-inference/autoscaling/keda-autoscaler/)
:::

## Autoscaling Modes

KServe workloads in prokube commonly use one of these modes:

- **Knative Pod Autoscaler (KPA)**: default for Knative-backed InferenceServices. Use it for request-concurrency or QPS based scaling and scale-to-zero.
- **Kubernetes HPA**: use it for CPU or memory based scaling.
- **KEDA**: use it for custom metrics from Prometheus, especially LLM-serving metrics such as vLLM token throughput, queue depth, or GPU cache usage.

Do not let KPA and KEDA control the same workload. If you create a KEDA `ScaledObject` manually, run the InferenceService in RawDeployment mode so KServe creates a normal Kubernetes `Deployment` instead of a Knative Revision.

## KPA Walkthrough

KPA is the default autoscaler for many KServe deployments. It works well when concurrent request count or QPS is a useful proxy for load.

The example below deploys a small Hugging Face model and scales on request concurrency. Run it from a Lab terminal or from a local terminal with a kubeconfig for the target workspace.

```bash
export NAMESPACE="<workspace>"
export ISVC_NAME="distilbert-cpu"
export MODEL_NAME="distilbert"

kubectl apply -n "${NAMESPACE}" -f - <<EOF
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: ${ISVC_NAME}
spec:
  predictor:
    scaleTarget: 1
    scaleMetric: concurrency
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=${MODEL_NAME}
        - --model_id=distilbert-base-uncased-finetuned-sst-2-english
      resources:
        requests:
          cpu: "2"
          memory: 4Gi
        limits:
          cpu: "4"
          memory: 8Gi
EOF
```

Wait until the InferenceService is ready:

```bash
kubectl get isvc "${ISVC_NAME}" -n "${NAMESPACE}"
```

Use the endpoint URL from the model detail page or from the resource status:

```bash
export MODEL_URL="$(kubectl get isvc "${ISVC_NAME}" -n "${NAMESPACE}" -o jsonpath='{.status.url}')"
```

Generate concurrent requests with a load-testing tool such as [`hey`](https://github.com/rakyll/hey). Use a prokube API key for external endpoint calls:

```bash
export API_KEY="<api-key>"

hey -z 30s -c 5 \
  -m POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{"instances":["MLOps is useful."]}' \
  "${MODEL_URL}/v1/models/${MODEL_NAME}:predict"
```

With `scaleMetric: concurrency` and `scaleTarget: 1`, KPA tries to keep roughly one in-flight request per replica. Cold starts can temporarily create more replicas than the visible concurrency level because requests accumulate while new pods pull images, download models, and become ready. This is expected for bursty traffic and large models.

To scale on request rate instead, set `scaleMetric: qps`. QPS scaling reacts over a time window, so it stabilizes more slowly than direct concurrency scaling.

Common KPA knobs:

```yaml
spec:
  predictor:
    scaleMetric: concurrency
    scaleTarget: 1
    containerConcurrency: 10
    minReplicas: 0
    maxReplicas: 10
```

Advanced Knative autoscaling behavior can be controlled with Knative annotations when the deployment policy allows it:

```yaml
spec:
  predictor:
    annotations:
      autoscaling.knative.dev/class: "kpa.autoscaling.knative.dev"
      autoscaling.knative.dev/metric: "concurrency"
      autoscaling.knative.dev/target-utilization-percentage: "70"
```

Use the model detail page, [Logs](../platform/observability.md#logs-browser), and Grafana dashboards when available to inspect startup latency, replica count, and request behavior.

## KEDA for vLLM

LLM serving often needs a different scaling signal than request count. Two requests can have very different cost depending on prompt length, generated tokens, batching, and KV-cache pressure.

For vLLM workloads, useful scaling signals include:

- prompt plus generation token throughput;
- GPU KV-cache utilization;
- queued requests, for latency-sensitive APIs;
- time to first token, primarily for monitoring and alerting.

Avoid using time to first token as the first autoscaling trigger without testing. It can drop sharply after a replica is added, which may cause scale-up and scale-down oscillation. Token throughput is usually a safer starting point because it remains high while sustained demand remains high.

### Prerequisites

KEDA must be installed by an administrator. The manual pattern below also assumes Prometheus can scrape vLLM metrics and KEDA can reach the Prometheus endpoint.

prokube platform configuration includes a cluster-wide vLLM `PodMonitor` in the monitoring stack. It selects KServe InferenceService pods and scrapes the `user-port` endpoint. Because of that, declare the predictor container port explicitly when using RawDeployment mode.

### 1. Deploy a RawDeployment InferenceService

```bash
export NAMESPACE="<workspace>"

kubectl apply -n "${NAMESPACE}" -f - <<EOF
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: opt-125m
  annotations:
    serving.kserve.io/deploymentMode: "RawDeployment"
    serving.kserve.io/autoscalerClass: "external"
spec:
  predictor:
    minReplicas: 1
    maxReplicas: 3
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=opt-125m
        - --model_id=facebook/opt-125m
        - --backend=vllm
        - --dtype=float32
        - --max-model-len=512
      ports:
        - name: user-port
          containerPort: 8080
          protocol: TCP
      resources:
        requests:
          cpu: "2"
          memory: 4Gi
        limits:
          cpu: "4"
          memory: 8Gi
EOF
```

Wait for readiness:

```bash
kubectl get isvc opt-125m -n "${NAMESPACE}" -w
```

In RawDeployment mode, KServe creates a Deployment named `<inference-service-name>-predictor`. The example above creates `opt-125m-predictor`; the KEDA `ScaledObject` must point to that Deployment.

### 2. Check vLLM Metrics

After the predictor pod is running, confirm that Prometheus has vLLM metrics. From inside the cluster, or through a controlled port-forward for administrators:

```bash
curl -s --get \
  --data-urlencode "query=vllm:prompt_tokens_total{namespace=\"${NAMESPACE}\"}" \
  http://kube-prometheus-stack-prometheus.monitoring.svc:9090/prometheus/api/v1/query
```

The vLLM metric names contain colons, for example `vllm:prompt_tokens_total`. KEDA's Prometheus trigger accepts that syntax directly. In other PromQL contexts, `{"__name__"="vllm:prompt_tokens_total"}` may be useful.

### 3. Create a KEDA ScaledObject

This example scales on combined prompt and generated token throughput. The threshold is intentionally small for the `opt-125m` CPU example; tune it for your model and hardware.

```bash
kubectl apply -n "${NAMESPACE}" -f - <<EOF
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: opt-125m-scaledobject
spec:
  scaleTargetRef:
    name: opt-125m-predictor
  minReplicaCount: 1
  maxReplicaCount: 3
  pollingInterval: 15
  cooldownPeriod: 120
  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleUp:
          stabilizationWindowSeconds: 0
        scaleDown:
          stabilizationWindowSeconds: 120
          policies:
            - type: Pods
              value: 1
              periodSeconds: 60
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090/prometheus
        query: >-
          sum(rate(vllm:prompt_tokens_total{namespace="${NAMESPACE}",model_name="opt-125m"}[2m]))
          + sum(rate(vllm:generation_tokens_total{namespace="${NAMESPACE}",model_name="opt-125m"}[2m]))
        metricType: AverageValue
        threshold: "5"
EOF
```

With `AverageValue`, KEDA treats the query result as a total and computes a per-replica average. A threshold of `5` means scale up when each replica handles more than roughly five tokens per second on average. The effective desired replica count is approximately `ceil(total_tokens_per_second / threshold)`, capped by `maxReplicaCount`.

### 4. Load Test and Calibrate

Use the [`serving/kserve-keda-autoscaling`](https://github.com/prokube/examples/tree/main/serving/kserve-keda-autoscaling) example for a complete load generator and calibration workflow.

For production, do not reuse the demo threshold blindly. Measure the per-replica throughput where latency begins to degrade, then set the KEDA threshold below that point with enough headroom for bursty traffic. The [`kserve-keda-autoscaling` calibration workflow](https://github.com/prokube/examples/tree/main/serving/kserve-keda-autoscaling#calibrating-the-threshold) provides a concrete starting point.

### Metric Choices

| Metric | Use when | Watch out |
|---|---|---|
| Token throughput | You need a stable default signal for sustained LLM demand. | Threshold depends on model, hardware, batching, and prompt mix. |
| GPU KV-cache utilization | Long-context requests fill GPU memory before token throughput looks high. | Requires GPU deployment and exported vLLM cache metrics. |
| Waiting requests | Latency-sensitive APIs need fast reaction to queued work. | Can be noisy under bursts. |
| Time to first token | You need user-visible latency monitoring. | Can cause autoscaling feedback loops if used directly as a trigger. |

Multiple KEDA triggers can be used together. KEDA scales up when any trigger is active:

```yaml
triggers:
  - type: prometheus
    metadata:
      serverAddress: http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090/prometheus
      query: >-
        sum(rate(vllm:prompt_tokens_total{namespace="my-workspace",model_name="my-model"}[5m]))
        + sum(rate(vllm:generation_tokens_total{namespace="my-workspace",model_name="my-model"}[5m]))
      metricType: AverageValue
      threshold: "2500"
  - type: prometheus
    metadata:
      serverAddress: http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090/prometheus
      query: >-
        avg(vllm:gpu_cache_usage_perc{namespace="my-workspace",model_name="my-model"})
      metricType: AverageValue
      threshold: "0.75"
```

For GPU-backed deployments, use slower scale-down than scale-up. Removing a warm GPU replica may force a full model download and cold start during the next burst:

```yaml
advanced:
  horizontalPodAutoscalerConfig:
    behavior:
      scaleUp:
        stabilizationWindowSeconds: 0
      scaleDown:
        stabilizationWindowSeconds: 900
        policies:
          - type: Pods
            value: 1
            periodSeconds: 300
```

## Related Pages

- [KEDA autoscaling example](https://github.com/prokube/examples/tree/main/serving/kserve-keda-autoscaling)
- [Model Serving](model_serving.md)
- [Observability](../platform/observability.md)
- [API Keys](../platform/api_keys.md)
