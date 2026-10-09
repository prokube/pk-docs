# Component Versions

prokube bundles several upstream components. Use this page to find the versions running in your deployment and to choose matching upstream documentation, SDKs, and examples.

Do not assume that every prokube deployment runs the same component versions. Managed, self-managed, staging, and customer-specific deployments can differ.

## Release Defaults

Component versions shipped with prokube 1.9:

| Component | Version |
|---|---|
| [Kubeflow Manifests](https://github.com/kubeflow/manifests/releases) | 26.03.1 |
| [Kubeflow Pipelines](https://www.kubeflow.org/docs/components/pipelines/) backend | 2.16.1 |
| [KFP SDK](https://kubeflow-pipelines.readthedocs.io/) (recommended) | 2.15.0 |
| [KServe](https://kserve.github.io/website/) | v0.18.0 |
| [MLflow](https://mlflow.org/docs/latest/) | 3.10.0 |

Each component name links to its upstream documentation.

The recommended KFP SDK version is pinned in the prokube notebook images. If you install a different version, make sure it is compatible with the KFP backend.

These are release defaults. A deployment can differ, for example after an administrator switches the KServe source or upgrades a component separately. For releases before 1.9, see the [legacy component version matrix](https://docs.prokube.ai/latest/user_docs/component_versions/).

## Check Your Deployment

The prokube version is shown at the bottom of the pkui sidebar.

The `paas-version` ConfigMap in the `prokube` namespace records the release defaults of the installed version. Reading it requires access to the `prokube` namespace, which usually only administrators have:

```bash
kubectl get configmap paas-version -n prokube -o yaml
```

The prokube version is stored under `paasVersion`. The component keys match the table above, for example `kfpBackendVersion` and `kserveVersion`. If you cannot read the ConfigMap, ask your administrator.

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
