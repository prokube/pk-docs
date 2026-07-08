# Deployment Options

prokube can run on different Kubernetes distributions. The supported deployment option for a customer environment depends on scale, availability requirements, cloud/on-premise constraints, storage, GPU needs, and operational ownership.

::: info Documentation in progress
This page is a high-level orientation. Detailed installation and upgrade procedures are still maintained separately and should be validated against the target release before use.
:::

## Managed Kubernetes

For production deployments, managed Kubernetes services are usually preferred when they are available. Examples include GKE, EKS, and AKS.

Managed Kubernetes is usually the right choice when you need:

- cloud-managed control plane availability;
- integration with cloud load balancers, DNS, IAM, and storage;
- simpler node lifecycle management;
- easier scaling across node pools and GPU instance types.

## MicroK8s

MicroK8s is one option for very small self-managed deployments, proof-of-concept environments, edge-style installations, or constrained on-premise setups where a managed Kubernetes service is not available.

Use MicroK8s only when the operational tradeoffs are acceptable:

- the deployment is small and self-managed;
- the team can operate Kubernetes nodes, networking, storage, TLS, and backups;
- high availability and disaster recovery expectations are modest and explicitly documented;
- the environment does not need the scale or managed integrations of a cloud Kubernetes service.

MicroK8s uses Calico for in-cluster networking and can run with high availability on multi-node clusters. External load balancing, DNS, TLS, storage classes, GPU support, and backups still need to be designed and operated for the deployment.

Common MicroK8s setup areas include:

- enabling DNS, RBAC, metrics, ingress, and GPU support when required;
- configuring upstream DNS and proxy settings;
- ensuring firewall rules allow Calico interfaces and pod networking;
- choosing storage classes appropriate for the durability requirements;
- providing a load balancer such as an existing network load balancer or MetalLB.

Do not treat MicroK8s as the default recommendation for larger production clusters. For larger on-premise deployments, consider a full Kubernetes distribution and storage stack with a documented support model.

## Storage and GPUs

Deployment choice affects storage and GPU behavior. For example, single-node storage can be simple but has limited failure tolerance; distributed storage can improve availability but needs careful capacity and failure-domain planning. GPU scheduling, MIG, and time-slicing also depend on the node setup and NVIDIA operator configuration.

Document the selected deployment profile for each cluster, including supported storage classes, GPU node pools, backup policy, and upgrade process.

## Related Pages

- [Operations Runbooks](operations_runbooks.md)
- [Kubernetes Resources](../platform/kubernetes.md)
- [Object Storage](../platform/object_storage.md)
