# Admin Documentation

::: info Documentation in progress
This page is an early outline. Full admin, operator, and installer documentation is still being written and will be added here. Detailed admin documentation is still available at [docs.prokube.ai](https://docs.prokube.ai/).
:::

Admin documentation covers installation, configuration, user and workspace administration, operations, upgrades, and troubleshooting.

The future structure should make it clear which parts are shared platform foundation and which parts belong to optional product tracks.

## Track-Oriented Installation

The installer should eventually support different installation profiles, for example:

- Full platform
- MLOps-focused setup
- AgentOps-focused setup
- Sandbox-focused setup

The exact scope of these profiles still needs to be defined.

## Current State

Detailed admin documentation is still available at [docs.prokube.ai](https://docs.prokube.ai/). New operator and installer documentation will be added here over time.

## Available Pages

| Page | Use it for |
|---|---|
| [User Management](./user_management.html) | Managing users, workspaces, groups, workspace access, and workspace security policy settings. |
| [Network Policies](./network_policies.html) | Defining reusable egress profiles and assigning outbound network restrictions to workspaces. |
| [System Status](../platform/system_status.html) | Checking administrator-only backend component health and backend metadata; the same page also shows workspace pod quota to all users. |

Platform-wide metrics, dashboards, alerts, and log-retention configuration remain administrator/operator topics. Use [System Status](../platform/system_status.html) for quick backend health checks, then use the deployment's Grafana, Prometheus, Alertmanager, and Loki tools for detailed monitoring.
