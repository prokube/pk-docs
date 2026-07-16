# Identity Providers

prokube uses Keycloak as the platform identity broker. External identity providers connect corporate login systems to prokube while Keycloak remains the integration point for platform groups, application clients, and tokens.

Use the Keycloak admin console only for connecting to external identity-providers such as Azure AD / Entra ID for an enterprise wide SSO setup and advanced IAM operations. Routine user, workspace, and group administration should use [User Management](user_management.md) when the required flow is available there.

## Planning

Before adding an external provider, decide:

- which realm is used for prokube users;
- which external domains are allowed to sign in;
- which external groups or claims should map to prokube groups;
- whether MFA is enforced by the external provider, Keycloak, or both;
- who owns client-secret rotation and login monitoring.

All redirect URIs must use HTTPS in production. Keep client secrets in the identity provider and Keycloak only; do not put them in docs, screenshots, or Git repositories.

## Microsoft Entra ID

For Microsoft Entra ID, create an application registration in the Entra admin center, then configure Keycloak as an OIDC or Microsoft identity provider.

Common configuration shape:

1. Create an Entra application registration for prokube.
2. Add the Keycloak broker redirect URI shown by Keycloak for the provider.
3. Create a client secret and record its expiration date.
4. Configure the provider in Keycloak with the Entra tenant endpoints, client ID, and client secret.
5. Add claim or group mappers when prokube groups should be derived from Entra claims.
6. Test login with a non-admin user before rolling out broadly.

If Entra shows **Admin approval needed**, the Entra tenant policy may require explicit consent. In some environments, setting the provider prompt behavior to account selection avoids a blocked silent-login path, but the correct fix depends on the tenant policy.

## Other OIDC Providers

Google Workspace, Okta, and generic OIDC providers follow the same pattern:

1. Create an OIDC client in the provider.
2. Copy the Keycloak redirect URI exactly.
3. Configure issuer, authorization, token, userinfo, and JWKS endpoints where Keycloak does not discover them automatically.
4. Request only the scopes required for identity and group mapping.
5. Configure mappers for email, name, groups, and any platform-specific claims.

Provider consoles change frequently. Use the provider's documentation for UI-specific steps and Keycloak for the exact redirect URI and broker endpoint.

## Group Mapping

External users usually need a platform group before they can access prokube resources. Depending on the deployment, this can be assigned as a default group in Keycloak, mapped from an external claim, or managed manually after first login.

Validate group mapping with a test account:

```bash
kubectl get profiles
```

If login succeeds but the user cannot access expected pages or workspaces, check the user's Keycloak groups, token claims, and workspace assignments. Users may need to sign out and sign in again after group changes so new claims appear in their session.

## Troubleshooting

| Symptom | Check |
|---|---|
| `invalid redirect_uri` | The redirect URI in the external provider must match the Keycloak broker redirect URI exactly, including path and trailing slash. |
| Login works but access is denied | Confirm the user has the required prokube group and workspace access. |
| Groups are missing | Check provider scopes, group claim names, Keycloak mappers, and whether the user refreshed their session after mapping changes. |
| Email-related login errors | Confirm the provider returns a verified email claim or configure Keycloak flow requirements appropriately. |
| Secret expired | Rotate the provider client secret in the external provider and Keycloak, then test login immediately. |

## Security Expectations

- Use HTTPS-only redirect URIs.
- Rotate client secrets before they expire.
- Request minimal scopes.
- Enable login event auditing in the identity provider and Keycloak where available.
- Prefer provider-enforced MFA for corporate accounts.
- Keep a break-glass admin procedure for identity-provider outages.

## Related Pages

- [User Management](user_management.md)
- [Operations Runbooks](operations_runbooks.md#keycloak-bootstrap-and-advanced-iam)
- [Application Authentication](application_authentication.md)
