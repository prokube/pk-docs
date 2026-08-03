# MLOps

MLOps in prokube covers the operational path from interactive model development to repeatable training, experiment tracking, model registry workflows, and serving endpoints.

Use [Labs](../labs/index.md) for interactive work, then move repeatable or shared workloads into the MLOps services below.

## Main Workflows

| Workflow | Use |
|---|---|
| [Pipelines](pipelines.md) | Run reproducible, inspectable workflows with Kubeflow Pipelines. Use this when notebook work should become a cluster-executed workflow. |
| [Hparam Search](hyperparameter_tuning.md) | Run Katib experiments to compare parameter combinations and parallelize trials on cluster compute. |
| [MLflow](mlflow.md) | Track experiments, log artifacts, manage model registry entries, and issue credentials for notebooks, pipelines, and serving. |
| [Model Serving](model_serving.md) | Deploy trained models as KServe inference endpoints, including models from object storage or MLflow. |
| [Model Serving Autoscaling](model_serving_autoscaling.md) | Tune KServe autoscaling with KPA, HPA, and KEDA, including vLLM token-throughput metrics. |
| [Serverless](knative.md) | Run generic HTTP containers with Knative Serving when the workload is not a model-specific KServe deployment. |

## Typical Flow

1. Develop code and inspect data in a [JupyterLab](../labs/jupyterlab.md), [VS Code Lab](../labs/vscode.md), or [RStudio Lab](../labs/rstudio.md).
2. Track experiments and model artifacts in [MLflow](mlflow.md).
3. Convert repeatable training or evaluation steps into [Pipelines](pipelines.md).
4. Use [Hparam Search](hyperparameter_tuning.md) when parameters should be explored systematically across cluster resources.
5. Deploy the selected model through [Model Serving](model_serving.md).

## Foundation

MLOps workloads run on the shared prokube foundation: workspaces, Kubernetes namespaces, storage, identity, RBAC, and observability.

Start with these cross-cutting pages when you need platform behavior rather than tool-specific usage:

- [Workspaces](../platform/workspaces.md)
- [Kubernetes Resources](../platform/kubernetes.md)
- [Observability](../platform/observability.md)
- [API Keys](../platform/api_keys.md)
