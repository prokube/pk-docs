# Platform Settings

Use **Admin > Platform Settings** to choose which features appear in the prokube portal. The settings apply to all users and workspaces. Access requires the Keycloak `realm-admin` role.

## Choose Visible Features

Under **Shown in portal**, switch individual features on or off, or use the **MLOps** and **AgentOps** suite controls to switch a whole group. Only features installed in the deployment are listed.

![Shown in portal settings with MLOps and AgentOps suite controls and individual feature switches](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/admin/platform-settings-shown-in-portal-framed.png)

| Suite | Features |
|---|---|
| MLOps | Labs, Hparam Search, MLflow, Pipelines, Volumes |
| AgentOps | LLM Serving, MCP Servers, Agents, Memory, Sandboxes |
| Both | Models, Serverless, API Keys, Object Storage, AI Gateway |

Features in both suites stay visible while either suite is on. For example, turning off **AgentOps** hides Agents and Memory, but Models and API Keys stay visible because **MLOps** is still on. When both suites are off, these shared features are hidden and can't be switched on individually.

A suite control is shown as mixed when only some of its features are visible. Selecting it shows all of them again.

**Logs**, **User Management**, **Platform Settings**, and **System Status** can't be hidden.

## Save Changes

Changes take effect only after you select **Save settings**. Your portal updates right away, without a redeploy; other users see the change after reloading. If the page shows **Settings saved; refresh needed**, reload it.

If another administrator saved in the meantime, select **Review latest changes**, compare their version with your draft, and save again.

## What Hiding Does

Hiding a feature removes it from navigation, and its pages show as unavailable. Hiding doesn't uninstall components, disable backend APIs, or change permissions, so users can still reach a hidden feature through its API. To restrict access, use RBAC or the deployment configuration.

Hiding **MLflow** also removes **Import from MLflow** from the **Models** create flow.

::: warning Reset also clears branding
**Reset to deployment defaults** shows all features again, but also removes custom branding and the uploaded logo.
:::

## Related Pages

- [User Management](./user_management.html)
- [System Status](../platform/system_status.html)
