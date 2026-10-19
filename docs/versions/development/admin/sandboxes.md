# Sandbox Administration

[Sandboxes](../agentops/sandboxes.md) run on [Agent Substrate](https://github.com/kagent-dev/substrate/tree/v0.6.0-alpha2), release `v0.6.0-alpha2`. Administrators decide how much capacity sandboxes get, which presets users can pick, and which network destinations new sandboxes reach.

## Requirements

- The Kubernetes APIs `ClusterTrustBundle` and `PodCertificateRequest` (`certificates.k8s.io/v1beta1`). They are beta and off by default in Kubernetes 1.35. Check with `kubectl api-resources --api-group=certificates.k8s.io`.
- A publicly trusted TLS certificate for the platform domain. Substrate fetches the login provider's signing keys over the public URL.
- Outbound HTTPS from the nodes to `storage.googleapis.com`, where the gVisor runtime is downloaded.
- Room in the platform MinIO for snapshots, see [Snapshots](#snapshots).
- The `kubectl ate` plugin of the deployed release on your machine:

  ```bash
  ATE_ASSET=kubectl-ate-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed -e 's/x86_64/amd64/' -e 's/aarch64/arm64/')
  curl -fsSLO "https://github.com/kagent-dev/substrate/releases/download/v0.6.0-alpha2/$ATE_ASSET"
  shasum -a 256 "$ATE_ASSET"     # compare with the digest on the release page
  install -m 0755 "$ATE_ASSET" ~/.local/bin/kubectl-ate && rm "$ATE_ASSET"
  export ATE_CLIENT_SERVICE_ACCOUNT=substrate-operator
  ```

  With `ATE_CLIENT_SERVICE_ACCOUNT`, `kubectl ate` uses your kubeconfig to act as the operator service account, a Substrate global owner. All `kubectl ate` commands on this page assume it.

## Components

| Namespace | What runs there |
|---|---|
| `ate-system` | Substrate API, controller, router, egress gateway, `atelet` on every node, and its PostgreSQL database |
| `ate-workers` | Worker pods that host the sandboxes |
| `pk-sandbox` | Policy sync and data-plane check |

Sandboxes, templates, and access policies live in Substrate's database, not in Kubernetes; inspect them with [`kubectl ate`](#use-kubectl-ate). The Grafana dashboard **Agent Substrate** shows workers, resume latency, and lifecycle operations.

## Capacity

Sandboxes run on worker pods of a Substrate `WorkerPool`. A worker's resource limits are a budget that its sandboxes share; Substrate places a sandbox only on a worker with enough budget left.

All capacity settings are in `paas/substrate/base/workers/capacity.yaml`. To change them, edit the file in the deployment's GitOps branch, commit, push, and sync the Argo CD Application `substrate-workers`.

```yaml
apiVersion: ate.dev/v1alpha1
kind: WorkerPool
metadata:
  name: default
  namespace: ate-workers
  labels:
    prokube.ai/sandbox-pool: default   # sizes select their pool by this label
spec:
  replicas: 2                          # number of workers
  template:
    resources:
      limits:                          # budget per worker
        cpu: "4"
        memory: 8Gi
      requests:                        # what Kubernetes reserves per worker
        cpu: 250m
        memory: 1Gi
```

The defaults fit a single-node installation: two workers hold eight Small sandboxes at a time.

- **More sandboxes**: raise `replicas` or the per-worker limits.
- **Dedicated nodes**: label the nodes, set the label as `template.nodeSelector`, and taint the nodes with `ate.dev/sandboxClass=gvisor:NoSchedule`. Workers tolerate this taint.
- **Workers of another size or on other nodes**: add another `WorkerPool` with its own `prokube.ai/sandbox-pool` label, and set that label as `pool` of the sizes that should run there.

Changing a pool's `template` replaces all its workers, and lowering `replicas` removes some. Sandboxes on a removed worker must be suspended within 30 minutes, or they lose their state since the last snapshot. Suspend them before the change.

## Snapshots

Snapshots are stored in the platform MinIO, bucket `ate-snapshots`. Each suspended sandbox and each preset holds one snapshot. A snapshot of a `-memory` preset contains the sandbox's memory, up to its memory limit, so several GB per sandbox is normal. The MinIO tenant is shared with pipelines, MLflow, and workspace buckets. Grow its volume before relying on memory presets ([Tenant Resize](./operations_runbooks.html#tenant-resize-or-storageclass-migration)), and consider a bucket quota for `ate-snapshots`.

Nodes also keep snapshot files under `/var/lib/ate`, so node disks need room for the sandboxes they run.

## Sizes and Presets

Users pick a preset; a preset has a size and a snapshot type. The defaults are listed on the [Sandboxes](../agentops/sandboxes.md#create-a-sandbox) page.

| What | File in the GitOps branch | Argo CD Application |
|---|---|---|
| Sizes: CPU, memory, and pool of each size | `paas/substrate/base/gateway/sizes.json` | `substrate-gateway` |
| Preset list shown to users, and the [default network rules](../agentops/sandboxes.md#network-access) (`network`) | `paas/substrate/base/gateway/presets.json` | `substrate-gateway` |
| One Substrate template per preset | `paas/substrate/base/templates/<template>.yaml` | `substrate-templates` |

Every size must fit the per-worker limits of its pool, or its sandboxes never start. A preset's template carries its size, so changing a size that a preset uses also needs a new template version, see below. Changes to the default network rules apply to sandboxes created afterwards.

Templates are immutable, and sandboxes keep the template they were created from. To change a preset:

1. Add a new version of its template, for example `pk-default-small-v2.yaml`.
2. List it in `paas/substrate/base/templates/kustomization.yaml` instead of the old file, and point the preset's `template` in `presets.json` at it.
3. Sync `substrate-templates` and `substrate-gateway`. The policy sync creates the template, and Substrate boots it once to take the snapshot that new sandboxes start from.
4. Delete the old template once no sandbox uses it: `kubectl ate delete actor-template pk-default-small-v1 -a sandbox-templates`.


## Access

The policy sync turns workspace roles and platform admins into Substrate access policies, with one Atespace per workspace. It reads them from the Kubeflow Profiles and Contributors and the ConfigMap `iam/platform-admins`, which the Keycloak event listener keeps in step with Keycloak, so a role change applies within about a second:

| Who | Substrate role |
|---|---|
| Workspace owner (`pk:<workspace>`) or editor (`pk:edit:<workspace>`) | `editor` of the workspace's Atespace: create, change, and use sandboxes |
| Workspace viewer (`pk:view:<workspace>`) | `viewer` of the workspace's Atespace: list sandboxes and see their settings |
| Pods running as the workspace's `default-editor` service account | `editor` of the workspace's Atespace |
| Platform admins: Keycloak role `realm-admin`, which the group `pk-admin` grants | global `owner`: every sandbox of every workspace |

To make someone a platform admin, add them to `pk-admin` on the [User Management](./user_management.html) page. Users who lose the role or are deleted are removed again. The sync leaves other members of the global access policy alone, so grant service accounts, users of other login connectors, or global `viewer` access by hand with `kubectl ate get access-policy --global -o yaml` and `kubectl ate update access-policy --global -f <file>`.

Every workspace member is also a `viewer` of the Atespace `sandbox-templates`, which holds the presets' templates. The policy sync overwrites manual changes to workspace Atespaces.

Sandboxes can use only the Secrets of their own workspace that carry the label `prokube.ai/sandbox-credential=true`.

## Admin View

Platform admins open **Sandboxes** under **Admin** to see worker capacity and usage and to suspend, resume, or delete sandboxes of every workspace.

## Use kubectl ate

Sandboxes do not depend on the prokube UI. Administrators manage them with [`kubectl ate`](https://github.com/kagent-dev/substrate/blob/v0.6.0-alpha2/cmd/kubectl-ate/README.md), set up as in [Requirements](#requirements):

```bash
kubectl ate get atespaces                                  # one per workspace, plus sandbox-templates
kubectl ate get actors -A                                  # all sandboxes; sandbox demo is actor sbx-demo
kubectl ate get workers
kubectl ate suspend actor sbx-demo -a <workspace>
kubectl ate resume actor sbx-demo -a <workspace>
kubectl ate delete actor sbx-demo -a <workspace> --any-state
kubectl ate get egress-policy sbx-demo -a <workspace> -o yaml
kubectl ate logs actor sbx-demo -a <workspace>
kubectl ate get actor-templates -a sandbox-templates       # presets' templates, each with a golden tag
```

Anyone who may create tokens for the ServiceAccounts `ate-system/substrate-operator` or `pk-sandbox/policy-sync` is a Substrate global owner. Restrict `serviceaccounts/token` in these namespaces accordingly.

## Related Pages

- [Sandboxes](../agentops/sandboxes.md)
- [User Management](./user_management.html)
- [Operations Runbooks](./operations_runbooks.html)
