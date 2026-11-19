# Upgrading

Upgrade prokube with the release-specific instructions for the target version. Do not use backup and restore as a version-upgrade mechanism unless a release explicitly documents that path.

## Before Upgrading

Prepare the upgrade as an operational change:

- read the release notes and migration notes for every skipped version;
- verify the target Kubernetes version and component compatibility;
- confirm a recent successful backup and restore procedure;
- check cluster health, node capacity, and storage capacity;
- pause or drain user workloads where required by the release notes;
- identify the GitOps repository, branch, and Argo CD applications that control the deployment.

## GitOps-Managed Deployments

In GitOps-managed deployments, upgrade by changing the authoritative deployment configuration, not by patching live resources manually.

Typical flow:

1. Create an upgrade branch from the deployment repository.
2. Apply the release-specific changes.
3. Review generated manifests and environment overlays.
4. Merge or push through the deployment's normal approval path.
5. Refresh and sync the affected Argo CD applications.
6. Watch reconciliation, pods, jobs, and application health until the platform is stable.

Avoid force pushes and live hotfixes unless the deployment runbook explicitly requires them and the rollback path is clear.

## Kubernetes and Node Upgrades

Kubernetes or node upgrades can affect stateful workloads and `ReadWriteOnce` volumes. Before draining nodes, check for Labs, database pods, MinIO pods, MLflow components, and model-serving workloads with local or node-bound storage.

If a pod cannot move during a drain, inspect:

- PVC access mode and topology;
- pod disruption budgets;
- node selectors and affinities;
- GPU or local-storage constraints;
- controller reconciliation status.

Do not delete stuck stateful pods or volumes to force progress unless the storage and application recovery implications are understood.

## After Upgrading

Validate user-facing and admin paths:

- login and workspace selection;
- Labs start/stop and volume mounting;
- file storage browser and S3 access;
- Pipelines submission and run logs;
- MLflow login, tracking, and artifact access;
- Model Serving deployment and endpoint testing;
- System Status, Grafana, Prometheus, Loki, and Alertmanager;
- backup jobs and monitoring alerts.

## Upgrading to prokube 1.10

Check the following when upgrading from prokube 1.9 or earlier.

### Prefixed MCP Tool Names

From prokube 1.10, federated MCP tool and prompt names always carry the MCP server's name as a prefix, also in workspaces with a single MCP server. See [MCP Federation and Tool Selection](../agentops/agent_gateway.html#mcp-federation-and-tool-selection). prokube 1.9 and earlier exposed bare tool names in workspaces with a single MCP server. Before upgrading:

- confirm that the installed Agent Gateway CRDs and runtime are version 1.4 or newer;
- schedule the upgrade with the owners of Agents, prompts, and clients that reference tools by bare name, so they can switch to the prefixed names;
- plan rollbacks with the same owners: a rollback restores bare names in workspaces with a single MCP server, so their references must be changed back.

### ToolHive Metrics for Existing MCP Servers

From prokube 1.10, the prokube UI labels the MCP servers it deploys with `prokube.ai/mcp-metrics`, and labelled servers report [ToolHive metrics](../agentops/mcp_servers.html#server-metrics-and-traffic). Servers deployed through the UI in prokube 1.9 and earlier have no ToolHive metrics until they are labelled. Adding the label restarts the server's proxy once, which drops open MCP sessions.

To label all servers that reference the prokube-managed `pkui-mcp-telemetry` config:

```bash
kubectl get mcpservers.toolhive.stacklok.dev -A -o json |
  jq -r '.items[] | select(.spec.telemetryConfigRef.name == "pkui-mcp-telemetry") | [.metadata.namespace, .metadata.name] | @tsv' |
  while IFS=$'\t' read -r namespace name; do
    kubectl patch mcpservers.toolhive.stacklok.dev "$name" -n "$namespace" \
      --type merge \
      -p '{"spec":{"resourceOverrides":{"proxyDeployment":{"podTemplateMetadataOverrides":{"labels":{"prokube.ai/mcp-metrics":"true"}}}}}}'
  done
```

### Gateway Usage Right After Upgrading

Gateway access logs written before the upgrade to prokube 1.10 do not separate token calls from calls without valid credentials. Until those logs age out, 10 days after the upgrade by default, [Gateway Usage](../platform/gateway_usage.html#sources) can count some token calls as **Calls without valid credentials**.

## Related Pages

- [Backup and Restore](backup_restore.md)
- [Installation Planning](installation.md)
- [Operations Runbooks](operations_runbooks.md)
