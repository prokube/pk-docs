# Sandbox Administration

::: info Upstream documentation
For Agent Substrate concepts that are not specific to prokube, use the upstream documentation of the release prokube deploys:

- [Agent Substrate](https://github.com/agent-substrate/substrate)
- [Substrate documentation](https://github.com/kagent-dev/substrate/tree/v0.6.0-alpha2/docs), including [authorization](https://github.com/kagent-dev/substrate/blob/v0.6.0-alpha2/docs/authorization.md) and [egress credential injection](https://github.com/kagent-dev/substrate/blob/v0.6.0-alpha2/docs/egress-credential-injection.md)
- [`kubectl ate` reference](https://github.com/kagent-dev/substrate/blob/v0.6.0-alpha2/cmd/kubectl-ate/README.md)
:::

[Sandboxes](../agentops/sandboxes.md) run on Agent Substrate. Administrators decide how much capacity sandboxes get, which presets users can pick, and which network destinations new sandboxes reach. Workspace editors manage the sandboxes of their workspace; platform administrators can suspend, resume, and delete sandboxes in every workspace.

## Requirements

- The Kubernetes APIs `ClusterTrustBundle` and `PodCertificateRequest` (`certificates.k8s.io/v1beta1`). They are beta and off by default in Kubernetes 1.35. Check with `kubectl api-resources --api-group=certificates.k8s.io`.
- A publicly trusted TLS certificate for the platform domain. Substrate fetches the login provider's signing keys over the public URL.
- Outbound HTTPS from the nodes to `storage.googleapis.com`, where the gVisor runtime is downloaded.
- Room in the platform MinIO for snapshots, see [Snapshots](#snapshots).

## Components

| Namespace | What runs there |
|---|---|
| `ate-system` | Substrate API, controller, router, egress gateway, `atelet` on every node, and its PostgreSQL database |
| `ate-workers` | Worker pods that host the sandboxes |
| `pk-sandbox` | Policy sync and data-plane check |

Sandboxes, templates, and access policies live in Substrate's database, not in Kubernetes. Use `kubectl ate` to inspect them, see [Operate Without the UI](#operate-without-the-ui). The Grafana dashboard **Agent Substrate** shows workers, resume latency, and lifecycle operations.

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

The defaults fit a single-node installation: two workers hold eight Small sandboxes at a time. Building a preset's snapshot also takes a slot for a few seconds.

- **More sandboxes**: raise `replicas` or the per-worker limits.
- **Dedicated nodes**: label the nodes, set the label as `template.nodeSelector`, and taint the nodes with `ate.dev/sandboxClass=gvisor:NoSchedule`. Workers tolerate this taint.
- **Workers of another size or on other nodes**: add another `WorkerPool` with its own `prokube.ai/sandbox-pool` label, and set that label as `pool` of the sizes that should run there.

Changing a pool's `template` replaces all its workers, and lowering `replicas` removes some. Sandboxes on a removed worker must be suspended within 30 minutes, or they lose their state since the last snapshot. Suspend them before the change.

## Sizes and Presets

Users pick a preset; a preset has a size and a snapshot type. The defaults are listed on the [Sandboxes](../agentops/sandboxes.md#create-a-sandbox) page.

| What | File in the GitOps branch | Argo CD Application |
|---|---|---|
| Sizes: CPU, memory, and pool of each size | `paas/substrate/base/gateway/sizes.json` | `substrate-gateway` |
| Preset list shown to users, and the default network rules | `paas/substrate/base/gateway/presets.json` | `substrate-gateway` |
| One Substrate template per preset | `paas/substrate/base/templates/<template>.yaml` | `substrate-templates` |

Every size must fit the per-worker limits of its pool, or its sandboxes never start. Changing a size does not change existing sandboxes.

Templates are immutable, and sandboxes keep the template they were created from. To change a preset, add a new version of its template, for example `pk-default-small-v2.yaml`, list it in `paas/substrate/base/templates/kustomization.yaml` instead of the old file, point the preset's `template` in `presets.json` at it, and sync both Applications. The policy sync creates the new template, and Substrate boots it once to take the snapshot that new sandboxes start from. Delete the old template once no sandbox uses it:

```bash
kubectl ate delete actor-template pk-default-small-v1 -a sandbox-templates
```

After a gVisor version change, existing snapshots may not restore. Publish new template versions so that presets get new snapshots.

### Default Network Rules

The top-level `network` object in `presets.json` holds the rules every new sandbox gets: HTTPS to common model providers, package registries, and code hosts, and HTTP to the Debian package mirrors. Edit it to allow or remove destinations for sandboxes created afterwards; existing sandboxes keep their rules.

## Access

The policy sync turns workspace roles from Keycloak into Substrate access policies, every 30 seconds:

| Workspace role | Substrate role in the workspace's Atespace |
|---|---|
| Owner or editor | `editor` |
| Viewer | `viewer` |
| Pods running as the workspace's `default-editor` service account | `editor` |

Every workspace member is also a `viewer` of the Atespace `sandbox-templates`, which holds the presets' templates. The policy sync overwrites manual changes to workspace Atespaces; grant additional access through the global access policy.

Sandboxes can use only the Secrets of their own workspace that carry the label `prokube.ai/sandbox-credential=true`.

## Admin View

Open **Sandboxes** under **Admin**. The page needs the Keycloak `realm-admin` role and, for its data and actions, the Substrate global `owner` role, see [Grant Platform Admins Access](#grant-platform-admins-access).

- **Worker capacity**: for each pool, replicas, resources per worker, sandboxes per worker, and workers by state: **Idle**, **Partial**, **At capacity**, **Unschedulable**. A table lists each worker's CPU and memory use and its sandboxes. **Workers over time (UTC)** charts the states from Prometheus.
- **Sandbox usage**: running, suspended, and other sandboxes per workspace and per template.
- **All sandboxes**: every sandbox of every workspace, filterable by workspace, state, and template, with **Suspend**, **Resume**, and **Delete**.

Capacity is not changed on this page; edit the [GitOps configuration](#capacity) instead. Sessions that kagent runs in Substrate are listed as read-only.

## Grant Platform Admins Access

Substrate does not know Keycloak's `realm-admin` role. Add each platform admin to Substrate's global access policy as `owner`. This is a manual step for now; it takes effect on the admin's next request.

1. Copy the admin's user ID from the Keycloak admin console (realm `prokube`, **Users**).
2. Compute the subject that the platform login puts into the admin's token:

   ```bash
   python3 -c 'import base64, sys; i = sys.argv[1].encode(); print(base64.urlsafe_b64encode(b"\n" + bytes([len(i)]) + i + b"\x12\x08keycloak").rstrip(b"=").decode())' <keycloak-user-id>
   ```

3. Create the global access policy with that subject:

   ```bash
   export ATE_CLIENT_SERVICE_ACCOUNT=substrate-operator
   cat > global-policy.yaml <<'EOF'
   metadata:
     name: default
   bindings:
   - role: owner
     members:
     - user:<subject from step 2>
   EOF
   kubectl ate create access-policy --global -f global-policy.yaml
   ```

   If the policy exists already, get it with `kubectl ate get access-policy --global -o yaml`, add the member, and apply it with `kubectl ate update access-policy --global -f global-policy.yaml`.

## Operate Without the UI

Everything works without the prokube UI. Users keep the `pk` CLI and the SDK. Administrators use the `kubectl ate` plugin of the deployed Substrate release:

```bash
ATE_ASSET=kubectl-ate-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed -e 's/x86_64/amd64/' -e 's/aarch64/arm64/')
curl -fsSLO "https://github.com/kagent-dev/substrate/releases/download/v0.6.0-alpha2/$ATE_ASSET"
shasum -a 256 "$ATE_ASSET"     # compare with the digest on the release page
install -m 0755 "$ATE_ASSET" ~/.local/bin/kubectl-ate && rm "$ATE_ASSET"
```

`kubectl ate` port-forwards to the Substrate API with your kubeconfig. Act as the operator service account, which is a global owner:

```bash
export ATE_CLIENT_SERVICE_ACCOUNT=substrate-operator
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

## Snapshots

Snapshots are stored in the platform MinIO, bucket `ate-snapshots`. Each suspended sandbox and each preset holds one snapshot. A snapshot of a memory preset contains the sandbox's memory, up to its memory limit, so several GB per sandbox is normal. The MinIO tenant is shared with pipelines, MLflow, and workspace buckets. Grow its volume before relying on memory presets ([Tenant Resize](./operations_runbooks.html#tenant-resize-or-storageclass-migration)), and consider a bucket quota for `ate-snapshots`.

Nodes also keep snapshot files under `/var/lib/ate`, so node disks need room for the sandboxes they run.

## Related Pages

- [Sandboxes](../agentops/sandboxes.md)
- [User Management](./user_management.html)
- [Operations Runbooks](./operations_runbooks.html)
