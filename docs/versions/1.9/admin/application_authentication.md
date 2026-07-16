# Application Authentication

Custom applications can either rely on prokube gateway authentication or implement their own OIDC flow against Keycloak. Choose one pattern deliberately; mixing both without a clear boundary causes redirect loops and confusing authorization failures.

## Gateway Authentication

For internal tools and simple web applications, the usual pattern is to put the application behind the authenticated platform gateway. The gateway handles login and forwards requests to the application after authentication.

Depending on the deployment, identity information can be forwarded in headers such as:

```text
kubeflow-userid: user@example.com
kubeflow-groups: group-a,group-b
```

Treat these headers as trusted only when they are injected by the platform gateway and cannot be supplied directly by the client. Do not expose the backend Service publicly in a way that lets clients forge identity headers.

Use this pattern when:

- the app only needs to know the authenticated user or groups;
- the app does not need its own login screen or session management;
- platform-level access control is sufficient;
- logout and token refresh behavior can be owned by the platform gateway.

## Direct OIDC

Use direct OIDC when the application has its own authentication module, session handling, callback URLs, or fine-grained authorization model.

High-level setup:

1. Create a client in the prokube Keycloak realm.
2. Configure exact redirect URIs and web origins for the application URL.
3. Store the client secret outside source code.
4. Configure the application with the Keycloak issuer or discovery URL.
5. Map required claims and groups.
6. Decide whether the gateway should require platform login before the app sees traffic, or whether the app's OIDC flow is the primary authentication mechanism.

Common OIDC endpoints are available from the realm discovery document:

```text
https://<your-prokube-domain>/auth/realms/<realm>/.well-known/openid-configuration
```

Realm names and paths are deployment-specific. Use the Keycloak console for the exact issuer URL.

## Groups and Claims

Group formats can differ between header-based authentication and direct OIDC tokens. Header values may be comma-separated, while token claims may use arrays, role prefixes, or nested claim names depending on Keycloak mappers.

When authorizing inside an application:

- validate the exact claims in a test token;
- keep group names configurable;
- require re-login after group changes;
- avoid hard-coding broad admin groups unless the platform team owns the mapping.

## Security Notes

- Never trust user identity headers unless the request came through the trusted gateway path.
- Use HTTPS redirect URIs.
- Store client secrets in Kubernetes Secrets or an external secret manager.
- Use least-privilege groups and scopes.
- Avoid putting tokens in URLs or logs.
- Document who owns client-secret rotation and app authorization rules.

## Troubleshooting

| Symptom | Check |
|---|---|
| Redirect loop | Gateway auth and application OIDC may both be trying to own login. Check route and auth policies. |
| `invalid redirect_uri` | The app callback URL must exactly match the Keycloak client configuration. |
| Groups missing | Check Keycloak mappers and sign in again to refresh token claims. |
| 403 from gateway | The route may require a platform auth exemption or an AuthorizationPolicy update. |
| Headers missing | Confirm the request path goes through the authenticated gateway, not directly to the Service. |

## Related Pages

- [Application Networking](application_networking.md)
- [Identity Providers](identity_providers.md)
- [User Management](user_management.md)
