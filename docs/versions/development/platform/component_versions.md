# Component Versions

prokube bundles several upstream components. Use this page to find the versions running in your deployment and to choose matching upstream documentation, SDKs, and examples.

Do not assume that every prokube deployment runs the same component versions. Managed, self-managed, staging, and customer-specific deployments can differ.

## Check the Platform Version

Many deployments expose the installed platform version through a `paas-version` ConfigMap:

```bash
kubectl get configmap paas-version -n prokube -o yaml
```

If the namespace or ConfigMap is not present, ask your administrator for the deployment's release metadata. The source of truth is the deployment configuration and release artifacts used for that environment.

## Check Component Versions

Useful inspection commands:

```bash
kubectl get deployments,statefulsets -A
kubectl get pods -A -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,IMAGE:.spec.containers[*].image
kubectl get inferenceservices -A
kubectl get clusterstoragecontainers
```

For KServe serving runtimes, inspect the runtime or the model pod image:

```bash
kubectl get servingruntime,clusterservingruntime -A
kubectl get pod <model-pod> -n <workspace> -o jsonpath='{.spec.containers[*].image}{"\n"}'
```

For Kubeflow Pipelines, use the backend version when choosing a KFP SDK. KFP SDK and backend versions should be compatible; examples written for a newer SDK can fail against an older backend.

## Why Versions Matter

| Area | Why it matters |
|---|---|
| Kubeflow Pipelines | SDK DSL features, compiled YAML format, and `kfp-kubernetes` helpers depend on backend compatibility. |
| KServe | InferenceService fields, storage initializers, local model cache, and autoscaling annotations vary by version. |
| MLflow | Client API behavior, model registry features, and authentication plugin behavior vary by version. |
| Knative | Autoscaling, revisions, and routing behavior affect KServe serverless deployments. |
| Kubernetes | API versions, Pod Security behavior, CSI features, and resource semantics depend on cluster version. |

When debugging, include both the prokube version and the relevant upstream component versions in support requests.

## Related Pages

- [Pipelines](../mlops/pipelines.md)
- [Model Serving](../mlops/model_serving.md)
- [MLflow](../mlops/mlflow.md)
