# Operations Runbooks

This page collects operational procedures that are useful for administrators running prokube deployments. Treat these as runbooks, not as normal user workflows.

Run these procedures only when you understand the deployment topology, GitOps setup, and backup state. Several steps are destructive if applied to the wrong namespace, tenant, or cluster.

## Object Storage

Deployment profiles, credentials and IAM, buckets, quotas, lifecycle rules, volume sizing, backup, and troubleshooting for the platform object store are on [Object Storage](object_storage.md). User-facing file operations happen through [File Storage](../platform/file_storage.md).

### Large Uploads and 413 Errors

Browser uploads can fail with `413 Request Entity Too Large` when an ingress or gateway request-body limit is lower than the object size.

Prefer S3 clients such as `rclone` or SDKs for large files. If browser uploads must support larger files, adjust the request-body limit in the ingress or gateway used by the deployment. For ingress-nginx deployments, the relevant annotation is commonly:

```yaml
nginx.ingress.kubernetes.io/proxy-body-size: "500m"
```

Use the mechanism that matches the actual gateway in your cluster; not every prokube deployment uses ingress-nginx.

## Keycloak Bootstrap and Advanced IAM

Normal user, workspace, and group management should happen through [User Management](user_management.md). Use the Keycloak admin console only for bootstrap, external identity-provider setup, authentication-flow changes, or other advanced IAM tasks.

The Keycloak admin console is commonly exposed under:

```text
https://<your-prokube-domain>/auth
```

Use trusted TLS and an administrator account protected by your organization's required controls.

On fresh installations, the bootstrap admin password is stored in the `iam` namespace:

```bash
kubectl get secret keycloak-secrets -n iam \
  -o jsonpath='{.data.keycloak_admin_password}' \
  | base64 --decode
echo
```

After first login:

1. Create a named master administrator account.
2. Require password update and MFA setup where supported by the identity policy.
3. Assign the Keycloak master `admin` role to the named administrator.
4. Verify that the named administrator can log in and administer the realm.
5. Remove or disable temporary bootstrap credentials according to the deployment policy.

To grant prokube platform administration rights, assign the user to the `pk-admin` group in the prokube realm or use the prokube UI when it exposes the needed flow. Do not use the Keycloak master admin account for routine platform administration.

### Login 502 from Large Response Headers

A `502` during login can happen before the request reaches the application if the ingress cannot buffer large response headers, such as large cookies or identity-provider tokens. In ingress-nginx logs this commonly appears as `upstream sent too big header`.

Check the ingress controller logs first:

```bash
kubectl logs -n ingress-nginx deploy/ingress-nginx-controller
```

If the deployment uses ingress-nginx, increase the proxy buffer size on the affected ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: main
  namespace: istio-system
  annotations:
    nginx.ingress.kubernetes.io/proxy-buffer-size: "32k"
```

Use the mechanism that matches the actual gateway in your cluster. Not every prokube deployment uses ingress-nginx, and gateway-specific buffer settings belong in the deployment configuration rather than one-off live patches when GitOps manages the cluster.

## MicroK8s Certificate Maintenance

MicroK8s is one option for very small self-managed prokube deployments. On long-running MicroK8s clusters, include certificate checks in the maintenance calendar. Expired internal certificates can break `kubectl`, web access through cluster components, and node-to-control-plane communication.

Check certificate validity on a MicroK8s node:

```bash
sudo microk8s.refresh-certs -c
```

Renew the API server and front-proxy client certificates:

```bash
sudo microk8s.refresh-certs -e server.crt
sudo microk8s.refresh-certs -e front-proxy-client.crt
```

In multi-node MicroK8s clusters, run the required renewal on each affected node and plan a short maintenance window. After renewal, restart MicroK8s if components do not recover cleanly:

```bash
sudo microk8s stop
sudo microk8s start
```

If the deployment uses a self-signed or private TLS certificate for the Kubernetes API or authentication integration, update the corresponding platform secret as part of certificate rotation. In deployments that use the legacy `k8s-cert` secret for authservice trust, recreate it with the renewed certificate and restart authservice:

```bash
kubectl delete secret k8s-cert -n istio-system
kubectl create secret generic k8s-cert \
  --from-file=k8s.crt=<your-tls-cert> \
  -n istio-system
kubectl rollout restart statefulset/authservice -n istio-system
```

Verify the exact secret name and namespace in the target deployment before applying this step; newer deployments may use a different trust distribution mechanism.

## Workspace Defaults and Image Pull Secrets

prokube workspaces are Kubernetes namespaces with platform-managed defaults. Two defaults are especially important for administrators: shared registry credentials and workspace resource quotas.

### Global Registry Credentials

prokube includes a secret propagation operator for shared image pull credentials. It watches registry credential secrets in the `ops` namespace whose names start with `regcred` and copies them into active namespaces.

During reconciliation, the operator:

- copies managed `regcred*` secrets from `ops` into other active namespaces;
- removes propagated copies when the source secret is removed from `ops`;
- patches `default*` service accounts, including `default`, `default-editor`, and `default-viewer`, so their `imagePullSecrets` include the managed registry credentials;
- preserves non-`regcred*` image pull secrets already present on those service accounts.

Use this mechanism for cluster-wide registry credentials that many workspaces need. For credentials intended for one workspace only, use the user-facing **Registry Credentials** flow instead; see [Kubernetes Resources](../platform/kubernetes.md#registry-credentials).

To inspect the current global credentials:

```bash
kubectl get secrets -n ops 'regcred*'
```

To verify propagation into a workspace:

```bash
kubectl get secrets -n <workspace> 'regcred*'
kubectl get serviceaccount default-editor -n <workspace> -o yaml
```

Treat global registry credentials as shared infrastructure secrets. Rotate them deliberately, verify affected workloads after rotation, and avoid using personal registry tokens for cluster-wide pulls.

### Workspace Resource Quotas

New workspaces receive a default `Profile` resource quota. The current platform patch sets a default pod limit of 100 pods per workspace:

```yaml
spec:
  resourceQuotaSpec:
    hard:
      count/pods: "100"
```

This prevents a single workspace from creating an unbounded number of pods and exhausting cluster capacity. Large pipeline runs, Katib experiments, distributed training jobs, and scale-out serving workloads can hit this limit quickly.

Users can see pod quota pressure in [System Status](../platform/system_status.md) and through quota warnings in the prokube UI. Administrators can inspect the live quota directly:

```bash
kubectl get resourcequota -n <workspace>
kubectl describe resourcequota -n <workspace>
```

To change quota for one workspace, edit the corresponding Kubeflow `Profile` or the generated `ResourceQuota`, depending on the deployment's reconciliation model. Prefer editing the authoritative `Profile` when the profile controller owns quota generation.

Example profile-level quota shape:

```yaml
apiVersion: kubeflow.org/v1
kind: Profile
metadata:
  name: <workspace>
spec:
  resourceQuotaSpec:
    hard:
      count/pods: "100"
      persistentvolumeclaims: "2"
      <storage-class>.storageclass.storage.k8s.io/requests.storage: 10Gi
```

To change defaults for future workspaces, update the profile patch used by the `pk-user-management-operator` in the deployment repository and roll it out through the normal GitOps or release process. In current platform configuration, that patch is maintained under the user-management operator profile patches, but deployments may carry environment-specific overlays. Do not patch generated resources by hand when GitOps or an operator will overwrite them.

Quota changes are capacity decisions. Before increasing limits, check node capacity, autoscaler behavior, storage class capacity, GPU availability, and expected concurrency for the workload class.

## Prometheus, Grafana, and Loki

prokube deployments commonly expose observability tools under these paths:

- Grafana: `/grafana`
- Prometheus: `/prometheus`
- Loki: through Grafana Explore or platform log tooling

Use [System Status](../platform/system_status.md) for quick platform health checks and [Observability](../platform/observability.md) for user-facing log search. Use Grafana, Prometheus, and Loki directly for administrator troubleshooting, capacity analysis, and advanced queries.

### Grafana

Grafana provides dashboards for cluster resources, GPU usage, object storage, vLLM, and other platform components when those dashboards are installed.

Dashboards created interactively in the Grafana UI may be stored only in Grafana's internal database, depending on the deployment. For persistent dashboards, export JSON and provision it through Kubernetes ConfigMaps or the deployment's GitOps repository. See the upstream [Grafana dashboard provisioning documentation](https://grafana.com/docs/grafana/latest/administration/provisioning/#dashboards).

### Prometheus

Prometheus stores platform and workload metrics. Prefer Grafana dashboards for normal inspection. Use Prometheus or Grafana Explore when you need direct PromQL queries and have the required access.

Example vLLM metric query:

```text
sum(rate(vllm:generation_tokens_total{namespace="<workspace>",model_name="<model>"}[5m]))
```

### Loki

Loki stores container logs and can be queried through Grafana Explore when direct access is enabled.

Example namespace and app-label query:

```text
{namespace="<workspace>", app=~"my-app-prefix.*"}
```

Use `.*` in regular expressions. A bare `*` is not a valid replacement for regex wildcard matching.

Be careful with shared dashboards and broad Explore access. Depending on permissions, a Grafana dashboard or Loki query can expose logs from multiple namespaces. Do not publish log dashboards broadly unless namespace scoping and access controls have been verified.

### Alertmanager

Alertmanager handles alert notification routing. In prokube deployments that use `kube-prometheus-stack`, Prometheus alerting rules are usually defined with `PrometheusRule` resources, while notification routing is defined with `AlertmanagerConfig` resources.

Use upstream references for the full API surface:

- [Alertmanager documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [PrometheusRule API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule)
- [AlertmanagerConfig API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1beta1.AlertmanagerConfig)

List existing rules and routing configs:

```bash
kubectl get prometheusrules -A
kubectl get alertmanagerconfigs -A
```

To route critical alerts to Microsoft Teams, create a Teams Workflow that accepts webhook alerts, store the webhook URL in a Kubernetes Secret, and reference it from an `AlertmanagerConfig` using `msteamsv2Configs`.

Microsoft is retiring older Microsoft 365 connector workflows. Use Teams Workflows / Power Automate based incoming webhooks with `msteamsv2Configs`, not the older Teams connector configuration.

Create the webhook secret in the namespace selected by the Alertmanager configuration:

```bash
kubectl create secret generic msteams-webhook-secret \
  -n monitoring \
  --from-literal=webhook-url='<teams-workflow-webhook-url>'
```

Example route for alerts labeled `severity="critical"`:

```yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: critical-alerts-to-teams
  namespace: monitoring
spec:
  receivers:
    - name: teams-critical
      msteamsv2Configs:
        - sendResolved: true
          title: '[prokube] {{ template "msteamsv2.default.title" . }}'
          webhookURL:
            name: msteams-webhook-secret
            key: webhook-url
  route:
    receiver: teams-critical
    matchers:
      - name: severity
        matchType: =
        value: critical
```

Example `PrometheusRule` for pods that remain in `CrashLoopBackOff`:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: workspace-crashloop-alerts
  namespace: monitoring
  labels:
    role: alert-rules
spec:
  groups:
    - name: workspace-crashloop
      rules:
        - alert: PodCrashLooping
          expr: >
            max_over_time(
              kube_pod_container_status_waiting_reason{
                job="kube-state-metrics",
                namespace="<workspace>",
                reason="CrashLoopBackOff"
              }[3m]
            ) >= 1
          for: 3m
          labels:
            severity: critical
          annotations:
            summary: Pod in {{ $labels.namespace }} is crash looping.
            description: >
              Pod {{ $labels.namespace }}/{{ $labels.pod }} container
              {{ $labels.container }} has been waiting with reason
              CrashLoopBackOff for more than 3 minutes.
```

### KServe and Knative Service Alerts

Alerting on KServe/Knative service health requires the relevant Knative custom-resource metrics to be exported by kube-state-metrics. Verify the metric names and labels in Prometheus before deploying production alert rules.

This pattern applies to default serverless KServe deployments that use Knative Revisions. It does not apply to every deployment mode.

If kube-state-metrics is configured to expose Knative `Revision` readiness, a rule can alert when no revision for a service is ready. Example expression shape:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: knative-service-revision-alerts
  namespace: monitoring
  labels:
    role: alert-rules
spec:
  groups:
    - name: knative-revision-alerts
      rules:
        - alert: KnativeServiceCompletelyDown
          expr: |
            label_replace(
              kube_customresource_knative_revision{type="Ready"} == 0,
              "service_name", "$1", "name", "^(.*)-[0-9]+$"
            )
            unless on(namespace, service_name)
            label_replace(
              kube_customresource_knative_revision{type="Ready"} == 1,
              "service_name", "$1", "name", "^(.*)-[0-9]+$"
            )
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: Knative service {{ $labels.service_name }} is completely down.
            description: No ready revision exists for {{ $labels.namespace }}/{{ $labels.service_name }}.
```

Treat this as a starting point. Confirm the metric name, labels, revision naming convention, and namespace selection in the installed kube-state-metrics configuration before enabling paging alerts.

### Katib Suggestion Controller OOM

Large Katib experiments, especially Bayesian optimization workloads, can exhaust the suggestion controller's memory. Symptoms include new trials no longer being created and `OOMKilled` restarts on Katib suggestion-controller pods.

Inspect the controller state:

```bash
kubectl get pods -n kubeflow | grep katib
kubectl describe pod <katib-suggestion-pod> -n kubeflow
kubectl logs <katib-suggestion-pod> -n kubeflow --previous
```

Increase suggestion-controller CPU and memory in the authoritative Katib configuration for the deployment, commonly the `katib-config` ConfigMap or Helm/Kustomize values that render it. In GitOps-managed clusters, update the deployment repository instead of live-editing generated resources.

After rollout, verify that the suggestion pod stays running and that experiments create new trials again. If OOMs continue, reduce experiment parallelism or search-space size, or choose a lighter suggestion algorithm.

## Related Pages

- [Admin Overview](index.md)
- [User Management](user_management.md)
- [File Storage](../platform/file_storage.md)
- [Platform Databases](../platform/databases.md)
- [Observability](../platform/observability.md)
- [Model Serving Autoscaling](../mlops/model_serving_autoscaling.md)
