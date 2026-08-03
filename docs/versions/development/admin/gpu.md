# GPU Administration

prokube deployments that include GPUs commonly use the [NVIDIA GPU Operator](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/index.html) to install and manage drivers, device plugins, monitoring, and related components.

GPU availability is deployment-specific. Users request GPUs from Labs, Pipelines, model-serving workloads, and custom Kubernetes resources, but administrators are responsible for node preparation, operator configuration, quota, monitoring, and capacity planning.

## User Workload Requests

Kubernetes workloads request GPUs with the `nvidia.com/gpu` resource:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test
spec:
  containers:
    - name: cuda
      image: nvidia/cuda:12.4.1-base-ubuntu22.04
      command: ["nvidia-smi"]
      resources:
        limits:
          nvidia.com/gpu: 1
```

The selected image still needs compatible user-space libraries for the workload. The GPU Operator mounts host driver components into the container; it does not make every framework version compatible automatically.

## Timeslicing and MIG

GPU sharing strategy is a platform capacity decision.

**Timeslicing** exposes multiple logical GPUs on one physical GPU. Multiple pods can request `nvidia.com/gpu: 1` and share the same card. Compute is shared opportunistically, and memory is not strongly isolated: one workload can still consume enough memory to disrupt others.

**MIG** partitions supported GPUs at the hardware level. Each MIG instance has dedicated memory and compute slices, which gives stronger isolation and more predictable behavior. MIG is supported only on specific NVIDIA GPUs and requires planned node configuration.

Use NVIDIA's upstream documentation for supported devices and exact operator settings:

- [GPU Operator with MIG](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-mig.html)
- [GPU Operator time-slicing](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html)

## Admin Configuration

GPU sharing is normally configured through the NVIDIA `ClusterPolicy` and, for MIG, node labels such as `nvidia.com/mig.config`. In GitOps-managed deployments, update the authoritative deployment configuration rather than editing generated live resources.

Useful inspection commands:

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,GPUS:.status.allocatable.nvidia\.com/gpu
kubectl describe node <gpu-node-name>
kubectl get pods -A -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,GPUS:.spec.containers[*].resources.limits.nvidia\.com/gpu
kubectl get clusterpolicy -A
```

Changing sharing strategy can evict workloads, reconfigure devices, and temporarily remove GPU capacity from the scheduler. Drain or stop affected workloads first and plan a maintenance window.

## Monitoring

GPU-enabled deployments usually expose GPU metrics through the NVIDIA DCGM exporter and Grafana dashboards. Monitor at least:

- allocated versus allocatable GPUs by node;
- GPU memory usage;
- utilization and throttling;
- unhealthy devices;
- model-serving or notebook pods that reserve GPUs but remain idle.

GPU metrics can expose workload names and resource usage across namespaces. Scope dashboards and Grafana permissions accordingly.

## Troubleshooting

| Symptom | Check |
|---|---|
| Pod remains pending | Confirm allocatable GPUs, workspace quota, node selectors, tolerations, and whether all GPU nodes are already full. |
| Pod starts but framework cannot see a GPU | Check `nvidia-smi` in the container, image CUDA/framework compatibility, and GPU Operator pod health. |
| Timesliced workloads interfere with each other | Reduce concurrency, use larger nodes, or move isolation-sensitive workloads to MIG-capable nodes. |
| MIG configuration does not apply | Check GPU support, node labels, GPU Operator logs, and whether existing workloads must be stopped before repartitioning. |

## Related Pages

- [Labs](../labs/index.md)
- [Pipelines](../mlops/pipelines.md)
- [Model Serving](../mlops/model_serving.md)
- [Operations Runbooks](operations_runbooks.md)
