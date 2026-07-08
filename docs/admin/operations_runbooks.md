# Operations Runbooks

This page collects operational procedures that are useful for administrators running prokube deployments. Treat these as runbooks, not as normal user workflows.

Run these procedures only when you understand the deployment topology, GitOps setup, and backup state. Several steps are destructive if applied to the wrong namespace, tenant, or cluster.

## MinIO Administration

For MinIO concepts and API details, use the upstream [MinIO documentation](https://docs.min.io/community/minio-object-store/). In prokube, user-facing object operations normally happen through the [Object Storage](../platform/object_storage.md) page. Use the MinIO Console for administration tasks that the prokube UI does not expose.

The MinIO Console is commonly exposed under:

```text
https://<your-prokube-domain>/minio/
```

Sign in through SSO. Administrative actions require the relevant platform and MinIO permissions, commonly through `pk-admin` and MinIO policy mappings.

### Buckets and Policies

Use buckets with descriptive names and sensible quotas. Quotas and lifecycle rules make recovery easier when a tenant approaches its storage limit.

To grant access to a bucket:

1. Create a MinIO policy that grants only the required bucket and object actions.
2. Bind access through the identity setup used by the deployment.
3. Prefer group-based access for teams instead of one-off user assignments.

Example MinIO policy for read/write access to one bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketLocation",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::example-bucket"
      ]
    },
    {
      "Sid": "ObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::example-bucket/*"
      ]
    }
  ]
}
```

Changing MinIO policies can affect notebooks, pipelines, model serving, and external S3 clients. Verify affected workspaces after a policy change.

### Lifecycle Rules

MinIO lifecycle rules can expire old objects automatically. They are useful for intermediate artifacts, old pipeline outputs, temporary exports, and other data with a known retention period.

Configure lifecycle rules per bucket in the MinIO Console or with `mc`. Do not apply expiration rules to buckets that contain records, models, or audit-relevant artifacts unless the retention policy explicitly permits deletion.

Typical workflow:

1. Identify buckets that contain disposable artifacts.
2. Define the retention period with the data owner.
3. Add an expiration lifecycle rule for the relevant prefix or bucket.
4. Monitor object count and bucket size after the first expiration cycle.

### Large Uploads and 413 Errors

Browser uploads can fail with `413 Request Entity Too Large` when an ingress or gateway request-body limit is lower than the object size.

Prefer S3 clients such as `mc`, `rclone`, or SDKs for large files. If browser uploads must support larger files, adjust the request-body limit in the ingress or gateway used by the deployment. For ingress-nginx deployments, the relevant annotation is commonly:

```yaml
nginx.ingress.kubernetes.io/proxy-body-size: "500m"
```

Use the mechanism that matches the actual gateway in your cluster; not every prokube deployment uses ingress-nginx.

### Tenant Resize or StorageClass Migration

Resizing or migrating the MinIO tenant is a maintenance operation. Take a backup first and schedule downtime. Many tenant volumes use `ReadWriteOnce`, so the tenant must be stopped before mounting the data into a migration pod.

Before starting:

- confirm whether the current StorageClass supports online expansion;
- confirm whether GitOps reconciles the MinIO tenant manifests;
- record the current tenant, StatefulSet, PVC, PV, and StorageClass names;
- verify that you can restore from backup;
- stop writes to MinIO during migration.

Useful inspection commands:

```bash
kubectl get tenant -n minio
kubectl get statefulset,pvc,pv -n minio
kubectl get pvc 0-defaulttenant-ss-0-0 -n minio -o jsonpath='{.spec.storageClassName}{"\n"}'
```

For a StorageClass migration using an intermediate PVC:

1. Scale the tenant StatefulSet down to zero.

```bash
kubectl scale statefulset defaulttenant-ss-0 -n minio --replicas=0
```

2. Create an intermediate PVC with the target StorageClass and a temporary migrator pod that mounts the old and new PVCs.

```bash
export STORAGE_CLASS="<target-storage-class>"

kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: tenant-migrate-pvc
  namespace: minio
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 200Gi
  storageClassName: ${STORAGE_CLASS}
---
apiVersion: v1
kind: Pod
metadata:
  name: data-migrator
  namespace: minio
spec:
  containers:
    - name: migrator
      image: alpine
      command: ["/bin/sh", "-c", "sleep 3600"]
      volumeMounts:
        - name: old
          mountPath: /mnt/old
        - name: new
          mountPath: /mnt/new
  volumes:
    - name: old
      persistentVolumeClaim:
        claimName: 0-defaulttenant-ss-0-0
    - name: new
      persistentVolumeClaim:
        claimName: tenant-migrate-pvc
EOF
```

3. Copy and verify the data inside the migrator pod.

```bash
kubectl exec -it data-migrator -n minio -- /bin/sh
cp -a /mnt/old/. /mnt/new/
find /mnt/old -type f | wc -l
find /mnt/new -type f | wc -l
du -sh /mnt/old /mnt/new
```

For critical migrations, compare checksums before deleting the old volume. This can take a long time on large tenants.

4. Update the tenant manifest to use the target StorageClass, if the new tenant PVC should not use the cluster default.

```yaml
spec:
  pools:
    - volumeClaimTemplate:
        spec:
          storageClassName: <target-storage-class>
```

5. Recreate the tenant through the deployment's normal mechanism. In GitOps-managed deployments, pause or adjust reconciliation before deleting resources, then re-enable it after the manifest is updated. In manually managed deployments, reapply the MinIO tenant kustomization used by the installation.

6. Scale the recreated tenant down, copy data from the intermediate PVC into the new tenant PVC with a second migrator pod, verify counts and sizes, then scale the tenant back up.

7. Confirm that the MinIO Console opens, buckets are listed, and representative objects can be read before deleting the intermediate PVC.

This runbook intentionally avoids hard-coding repository-relative apply paths. Use the path and branch that are authoritative for the deployed cluster.

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

Grafana provides dashboards for cluster resources, GPU usage, MinIO, vLLM, and other platform components when those dashboards are installed.

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

## Related Pages

- [Admin Overview](index.md)
- [User Management](user_management.md)
- [Object Storage](../platform/object_storage.md)
- [Observability](../platform/observability.md)
- [Model Serving Autoscaling](../mlops/model_serving_autoscaling.md)
