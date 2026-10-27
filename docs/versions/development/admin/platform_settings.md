# Platform Settings

Use **Admin > Platform Settings** to choose which deployment-enabled features appear in the prokube portal. Access requires the Keycloak `realm-admin` realm role; workspace administrator access alone is not sufficient.

These are deployment-wide settings for all users and workspaces, not personal preferences. They persist across pod restarts.

## Feature Visibility

The **Shown in portal** section has **MLOps** and **AgentOps** suite controls above the individual feature switches. Only features enabled in the deployment appear; unavailable features do not affect suite counts or checkbox state.

![Shown in portal settings with MLOps and AgentOps suite controls and individual feature switches](https://storage.googleapis.com/prokube-docs-pictures/pk-docs/screenshots/admin/platform-settings-shown-in-portal.png)

| Membership | Features |
|---|---|
| MLOps only | Labs, Hparam Search, MLflow, Pipelines, Volumes |
| AgentOps only | LLM Serving, MCP Servers, Agents, Memory, Sandboxes |
| Shared by both | Models, Serverless, API Keys, Object Storage, AI Gateway |

Suite controls reflect the current feature selection:

- **Checked**: all deployment-enabled members are shown.
- **Mixed**: some members are hidden, but the suite is still active. Selecting the mixed control shows all its members; it does not turn the suite off.
- **Unchecked / off**: no members are shown, or all deployment-enabled exclusive features are hidden. Shared features can still be shown through the other active suite, as explained by the status text.

Clearing a checked suite hides its exclusive features but keeps shared features shown while the other suite is active. Turning both suites off hides their shared features too. Selecting an unchecked suite shows all its deployment-enabled members.

Use individual switches for finer control. Hiding a shared feature can make both active suites mixed. When both suites have exclusive features and are off, hidden shared switches are disabled until a suite is turned on. If a suite has only shared features in this deployment, its suite control is disabled and those features remain individually editable.

**Logs** and **User Management** cannot be hidden when deployment-enabled; User Management still requires administrator authorization. **Platform Settings** and **System Status** also remain available as recovery surfaces.

## Save Changes

1. Adjust the suite controls or individual switches under **Shown in portal**.
2. Select **Save settings**. Toggling a control only changes the draft; it does not save immediately.
3. Wait for the success message. The current portal's navigation and pages refresh without a redeploy. Reload other open sessions to pick up the saved presentation; reload this page if it reports **Settings saved; refresh needed**.

If another administrator saved first, use **Review latest changes**, compare the latest revision with your preserved draft, and save again only after reviewing it.

## Scope And Limits

Visibility changes presentation only. They do not install or uninstall components, enable deployment-disabled capabilities, disable backend APIs, or replace RBAC and other security controls. Use deployment configuration and backend authorization to disable or restrict functionality.

Hidden features disappear from navigation and their portal routes show an unavailable page. Hiding **MLflow** also removes **Import from MLflow** and its picker from the **Models** create flow; MLflow's backend APIs and access controls are unchanged.

**Reset to deployment defaults** requires confirmation and shows all deployment-enabled features again. It also clears runtime branding overrides and the uploaded logo, so do not use it as a visibility-only reset.

## Related Pages

- [User Management](./user_management.html)
- [System Status](../platform/system_status.html)
