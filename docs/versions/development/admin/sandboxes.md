# Sandbox Administration

[Sandboxes](../agentops/sandboxes.html) run on [Agent Substrate](https://github.com/kagent-dev/substrate). Administrators decide how much capacity sandboxes get, which presets users can pick, and which network destinations new sandboxes reach.

## Requirements

- The Kubernetes APIs `ClusterTrustBundle` and `PodCertificateRequest` (`certificates.k8s.io/v1beta1`). They are beta and off by default in Kubernetes 1.35; new prokube installations switch them on. Check with `kubectl api-resources --api-group=certificates.k8s.io`.
- A publicly trusted TLS certificate for the platform domain. Substrate fetches the login provider's signing keys over the public URL.
- Outbound HTTPS from the nodes to `storage.googleapis.com`, where the gVisor runtime is downloaded.
- Room in the platform MinIO for snapshots; see [Snapshots](#snapshots).

## Install kubectl ate

Administrators manage sandboxes with the `kubectl ate` plugin. Its release must match the deployed Substrate. The commands read the deployed release from the image tag of `ate-api-server` and install the matching plugin:

```bash
ATE_VERSION=$(kubectl get deployment ate-api-server -n ate-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}' | sed -e 's/@.*//' -e 's/.*://')
ATE_ASSET=kubectl-ate-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed -e 's/x86_64/amd64/' -e 's/aarch64/arm64/')
curl -fsSLO "https://github.com/kagent-dev/substrate/releases/download/$ATE_VERSION/$ATE_ASSET"
shasum -a 256 "$ATE_ASSET"     # compare with the digest on the release page of $ATE_VERSION
install -m 0755 "$ATE_ASSET" ~/.local/bin/kubectl-ate && rm "$ATE_ASSET"
export ATE_CLIENT_SERVICE_ACCOUNT=substrate-operator
kubectl ate --version
```

Upstream documentation on GitHub follows Substrate's `main` branch. For the docs of your release, select the tag `$ATE_VERSION` on GitHub.

With `ATE_CLIENT_SERVICE_ACCOUNT`, `kubectl ate` uses your kubeconfig to act as the operator service account, a Substrate global owner. All `kubectl ate` commands on this page assume it.

## Terminology

`kubectl ate`, logs, and the Grafana dashboard use Substrate's names:

| prokube | Substrate |
|---|---|
| Sandbox `demo` | Actor `sbx-demo` |
| Workspace | Atespace with the same name |
| Preset | Actor template in the Atespace `sandbox-templates`, for example `pk-default-small-v5` |
| Network rules | Egress policy of the actor |
| Worker | Pod of a `WorkerPool` in `ate-workers` that hosts sandboxes |

Two prokube services connect Substrate to the platform:

- The **policy sync** turns workspace roles and platform admins into Substrate access policies; see [Access](#access).
- The **data-plane check** authorizes every request to a running sandbox, such as commands, files, the terminal, SSH, and port forwarding.

## Components

| Namespace | What runs there |
|---|---|
| `ate-system` | Substrate API, controller, router, egress gateway, `atelet` on every node, and its PostgreSQL database |
| `ate-workers` | Worker pods that host the sandboxes |
| `pk-sandbox` | Policy sync and data-plane check |

Sandboxes, templates, and access policies live in Substrate's database, not in Kubernetes. Inspect them with [`kubectl ate`](#use-kubectl-ate). The Grafana dashboard **Agent Substrate** shows workers, resume latency, and lifecycle operations.

## Change Sandbox Configuration

Sandbox settings are files in the deployment's GitOps branch. To change one, edit the file, commit, push, and sync its Argo CD Application:

| What | File | Argo CD Application |
|---|---|---|
| Workers and their resources | `paas/pk-sandbox/workers/capacity.yaml` | `pk-sandbox-workers` |
| Sizes: CPU, memory, and pool of each size | `paas/pk-sandbox/gateway/sizes.json` | `pk-sandbox-gateway` |
| Preset list shown to users, and the default network rules (`network`) | `paas/pk-sandbox/gateway/presets.json` | `pk-sandbox-gateway` |
| One Substrate template per preset | `paas/pk-sandbox/templates/<template>.yaml` | `pk-sandbox-templates` |

::: warning A redeploy drops these edits
A later deploy renders the GitOps branch anew and drops edits made there. Repeat them after each redeploy.
:::

## Capacity

Sandboxes run on worker pods of a Substrate `WorkerPool`. A worker's resource limits are a budget that its sandboxes share. Substrate places a sandbox only on a worker with enough budget left.

The pool is defined in `paas/pk-sandbox/workers/capacity.yaml`:

```yaml
apiVersion: ate.dev/v1
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
        memory: 8256Mi                 # 8Gi for sandboxes plus the 64Mi Substrate keeps
      requests:                        # what Kubernetes reserves per worker
        cpu: 250m
        memory: 1Gi
```

The defaults fit a single-node installation: two workers hold eight Small, four Medium, or two Large sandboxes at a time. Substrate keeps 64Mi of each worker's memory for itself, so give a worker the memory of the sandboxes it should hold plus 64Mi.

- **More sandboxes**: raise `replicas`; see [When capacity runs short](#when-capacity-runs-short).
- **Larger sandboxes**: raise the per-worker limits. This only helps for sizes that do not fit the current limits, and it replaces all workers.
- **Dedicated nodes**: label the nodes, set the label as `template.nodeSelector`, and taint the nodes with `ate.dev/sandboxClass=gvisor:NoSchedule`. Workers tolerate this taint.
- **Workers of another size or on other nodes**: add another `WorkerPool` with its own `prokube.ai/sandbox-pool` label, and set that label as `pool` of the sizes that should run there.

Changing a pool's `template` replaces all its workers, and lowering `replicas` removes some. A removed worker gives its sandboxes 30 minutes to be suspended. Substrate does not suspend them: a sandbox that still runs after that crashes and loses its changes since the last snapshot. Suspend the sandboxes before the change, in the [admin view](#admin-view) or with [`kubectl ate suspend`](#use-kubectl-ate).

### When capacity runs short

When no worker has room for a sandbox, creating or resuming it fails with HTTP 503. The data-plane check `pk-sandbox/dataplane-check` logs `RESOURCE_EXHAUSTED no worker has room for the actor`.

To see where capacity goes:

- **Worker capacity** in the [admin view](#admin-view) shows each worker's reserved CPU and memory against its budget.
- The panel **Scheduling outcomes** of the Grafana dashboard **Agent Substrate** counts resumes that ended in `no_capacity`.

To free or add capacity:

1. **Free capacity**: suspend sandboxes that run but are not in use, in the admin view or with [`kubectl ate suspend`](#use-kubectl-ate). A suspended sandbox holds no CPU or memory on a worker, and its user resumes it later. Delete sandboxes nobody needs.
2. **Add workers**: raise `replicas` in `capacity.yaml`. New workers join, and running sandboxes stay where they are. Kubernetes reserves only a worker's request, 1Gi, but its sandboxes can use memory up to the worker's limit. Make sure the nodes have allocatable memory for `replicas` times the per-worker memory limit.
3. **Add nodes** when the nodes are full, or move the workers to dedicated sandbox nodes as described above.

## Snapshots

Snapshots are stored in the platform MinIO, bucket `ate-snapshots`. Each suspended sandbox and each preset holds one snapshot. A snapshot of a preset that keeps memory contains the sandbox's memory, up to its memory limit, so several GB per sandbox is normal.

The MinIO tenant is shared with pipelines, MLflow, and workspace buckets. Grow its volume before relying on presets that keep memory ([Tenant Resize](./operations_runbooks.html#tenant-resize-or-storageclass-migration)), and consider a bucket quota for `ate-snapshots`.

Nodes also keep snapshot files under `/var/lib/ate`, so node disks need room for the sandboxes they run.

## Sizes and Presets

Users pick a preset; a preset has a size and a snapshot type. The defaults are listed on the [Sandboxes](../agentops/sandboxes.html#create-a-sandbox) page. Sizes and presets are defined in `sizes.json` and `presets.json`; see [Change Sandbox Configuration](#change-sandbox-configuration).

```json
{
  "default": "small",
  "sizes": [
    {"name": "small",  "cpu": "1", "memory": "2Gi", "pool": "default"},
    {"name": "medium", "cpu": "2", "memory": "4Gi", "pool": "default"},
    {"name": "large",  "cpu": "3", "memory": "6Gi", "pool": "default"}
  ]
}
```

A preset in `presets.json` names its template, size, and snapshot type (`fidelity`: `VOLUMES` keeps `/workspace`, `MEMORY` also keeps memory and processes). A shortened entry:

```json
{
  "name": "pk-default-small",
  "template": "pk-default-small-v5",
  "title": "Small",
  "size": "small",
  "fidelity": "VOLUMES"
}
```

The `network` field of `presets.json` holds the [default network rules](../agentops/sandboxes.html#network-access), as JSON of Substrate egress rules, in the format that `pk sandbox network <name>` prints. Changes to them apply to sandboxes created afterwards.

Every size must fit the per-worker limits of its pool, or its sandboxes never start. A preset's template carries its size, so changing a size that a preset uses also needs a new template version.

Templates are immutable, and sandboxes keep the template they were created from. To change a preset:

1. Add the next version of its template, for example `pk-default-small-v6.yaml` next to `pk-default-small-v5.yaml`.
2. List it in `paas/pk-sandbox/templates/kustomization.yaml` instead of the old file, and point the preset's `template` in `presets.json` at it.
3. Sync `pk-sandbox-templates` and `pk-sandbox-gateway`. The policy sync creates the template, and Substrate boots it once to take the snapshot that new sandboxes start from.
4. Delete the old template once no sandbox uses it: `kubectl ate delete actor-template pk-default-small-v5 -a sandbox-templates`.

## Access

The policy sync gives each workspace one Atespace and turns workspace roles and platform admins into Substrate access policies. It reads the roles from the Kubeflow Profiles and Contributors, and the platform admins from the ConfigMap `iam/platform-admins`. The Keycloak event listener keeps that ConfigMap in step with Keycloak, so a role change applies within about a second.

| Who | Substrate role |
|---|---|
| Workspace owner (`pk:<workspace>`) or editor (`pk:edit:<workspace>`) | `editor` of the workspace's Atespace: create, change, and use sandboxes |
| Workspace viewer (`pk:view:<workspace>`) | `viewer` of the workspace's Atespace: list sandboxes and see their settings |
| Pods running as the workspace's `default-editor` service account | `editor` of the workspace's Atespace |
| [API keys](../agentops/sandboxes.html#external-access-with-api-keys) with the scope **All sandboxes**, acting as the service account `<workspace>/pk-sandbox-api-key` | `editor` of the workspace's Atespace |
| Platform admins: members of the Keycloak group `pk-admin` | global `owner`: every sandbox of every workspace |

Every workspace member is also a `viewer` of the Atespace `sandbox-templates`, which holds the presets' templates.

To make someone a platform admin, add them to `pk-admin` on the [User Management](./user_management.html) page. Users who leave the group or are deleted lose the role again.

The policy sync overwrites manual changes to workspace Atespaces. In the global access policy, it manages only `pk-admin` members and leaves other entries alone. Grant global access to service accounts, users of other login connectors, or global `viewer`s by hand:

```bash
kubectl ate get access-policy --global -o yaml > global-policy.yaml
# edit global-policy.yaml
kubectl ate update access-policy --global -f global-policy.yaml
```

Besides reacting to changes, the policy sync checks everything every 5 minutes. It logs each correction from that check as a `WARNING` in `pk-sandbox/policy-sync`: a missed update or a manual change in Substrate.

### Access from Workspace Pods

Workspace pods with the label `sandbox.prokube.ai/access: "true"` get a sandbox token from the PodDefault `access-sandboxes`. The user-management operator creates this PodDefault when a workspace namespace is created. Workspaces that existed before sandboxes were installed need it once:

```bash
kubectl annotate profiles --all user-management-operator.prokube.ai/reconcile=true
kubectl get poddefaults -A --field-selector metadata.name=access-sandboxes
```

## Admin View

Platform admins open **Sandboxes** under **Admin** in the prokube UI. The view shows worker capacity and the sandbox history as panels of the Grafana dashboard **Agent Substrate**. From there, admins can suspend, resume, revert, or delete sandboxes of every workspace.

## Use kubectl ate

Sandboxes do not depend on the prokube UI. Manage them with `kubectl ate`, installed as in [Install kubectl ate](#install-kubectl-ate). `kubectl ate --help` documents the installed release; the [`kubectl ate` reference](https://github.com/kagent-dev/substrate/blob/main/docs/reference/kubectl-ate.md) covers the latest one. A sandbox `demo` is the actor `sbx-demo`:

```bash
kubectl ate get atespaces                                  # one per workspace, plus sandbox-templates
kubectl ate get actors -A                                  # all sandboxes
kubectl ate get workers
kubectl ate suspend actor sbx-demo -a <workspace>
kubectl ate resume actor sbx-demo -a <workspace>
kubectl ate revert actor sbx-demo -a <workspace>           # a crashed sandbox back to its last snapshot
kubectl ate delete actor sbx-demo -a <workspace>
kubectl ate get egress-policy sbx-demo -a <workspace> -o yaml
kubectl ate logs actor sbx-demo -a <workspace>
kubectl ate get actor-templates -a sandbox-templates       # presets' templates, each with a golden tag
```

## Security

- **Global owner tokens**: anyone who may create tokens for the ServiceAccounts `ate-system/substrate-operator` or `pk-sandbox/policy-sync` is a Substrate global owner. Restrict `serviceaccounts/token` in these namespaces accordingly.
- **Data-plane check tokens**: `pk-sandbox/dataplane-check` may create tokens for `pk-sandbox-api-key` only. ValidatingAdmissionPolicies limit it to workspace namespaces and to Substrate tokens of at most one hour.
- **Credentials**: sandboxes can use only the Secrets of their own workspace that carry the label `prokube.ai/sandbox-credential=true`. Any workspace editor, workspace pod, or API key with **All sandboxes** can set network rules that use these Secrets.
- **API keys**: a key with **All sandboxes** can do what a workspace editor can, in its workspace only. Treat such keys like the workspace's credential Secrets.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Creating or resuming fails with HTTP 503 | No worker has room; see [When capacity runs short](#when-capacity-runs-short). |
| Sandboxes are crashed after a node restart | Running sandboxes crash when their node restarts. Users bring them back with `pk sandbox revert` or **Revert** in the prokube UI; admins with `kubectl ate revert`. |
| Workspace pods fail with `No login and no workload token` | The workspace has no PodDefault `access-sandboxes`; see [Access from Workspace Pods](#access-from-workspace-pods). |
| `WARNING` entries in `pk-sandbox/policy-sync` | The 5-minute check corrected a missed update or a manual change in Substrate; see [Access](#access). |

## Related Pages

- [Sandboxes](../agentops/sandboxes.html)
- [API Keys](../platform/api_keys.html)
- [User Management](./user_management.html)
- [Operations Runbooks](./operations_runbooks.html)
