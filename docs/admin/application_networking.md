# Application Networking

This page describes the common patterns for exposing custom applications through prokube networking. It is for administrators and developers who deploy their own services into a workspace or platform namespace.

## Service and Gateway Routing

A Kubernetes `Service` exposes pods inside the cluster. It does not make the application reachable from a browser or other external services by itself.

For user-facing HTTP applications, route gateway traffic to the Service with Istio resources such as `VirtualService`. In many prokube deployments, authenticated user-facing applications route through the `kubeflow/kubeflow-gateway` gateway.

Use the deployment's established gateway and host configuration. Gateway names, namespaces, and authentication policy can vary by installation.

## Path Prefixes

The preferred public shape is often a path on the main prokube domain:

```text
https://<your-prokube-domain>/<app-prefix>/
```

This avoids extra DNS records and certificates, but the application must work behind a path prefix. Applications that generate absolute links need to be configured with the external prefix or respect headers such as `X-Forwarded-Prefix`.

If an application cannot run under a prefix, use a dedicated host or subdomain when the deployment supports it.

## VirtualService Shape

Minimal path-prefix example:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: <workspace>
spec:
  gateways:
    - kubeflow/kubeflow-gateway
  hosts:
    - <your-prokube-domain>
  http:
    - match:
        - uri:
            prefix: /my-app/
      rewrite:
        uri: /
      route:
        - destination:
            host: my-app.<workspace>.svc.cluster.local
            port:
              number: 8080
      headers:
        request:
          set:
            X-Forwarded-Prefix: /my-app
```

This is a pattern, not a universal manifest. Confirm the gateway, host, namespace, service name, and authentication policy for the target deployment.

## Sidecars and Authorization

Istio sidecar injection and gateway routing are separate concerns. A workload can be routed by the gateway without behaving correctly in the mesh if labels, port names, `PeerAuthentication`, `DestinationRule`, or `AuthorizationPolicy` resources are inconsistent.

In deny-by-default environments, add only the minimum authorization needed for the gateway and expected callers. Avoid broad namespace-wide allow rules for production applications.

## When to Use a Dedicated Host

Use a dedicated host or subdomain when the application:

- cannot be configured for a path prefix;
- needs special ingress or gateway settings;
- uses WebSockets or callbacks that do not work under prefix rewriting;
- must be isolated from the main platform host for security or cookie scope reasons.

Dedicated hosts require DNS, TLS, gateway routing, and authentication decisions. Document ownership and certificate renewal before exposing the app.

## Troubleshooting

| Symptom | Check |
|---|---|
| Browser returns 404 | VirtualService host, gateway, path prefix, and route match. |
| Browser returns 503 | Service name, service port, endpoint readiness, and pod labels. |
| Application redirects to the wrong path | External base URL, prefix settings, and `X-Forwarded-Prefix` handling. |
| Requests fail only with sidecar injection | mTLS policy, DestinationRule, port names, and AuthorizationPolicy. |
| Static assets fail | Application-generated asset URLs may ignore the path prefix. |

## Related Pages

- [Application Authentication](application_authentication.md)
- [Network Policies](network_policies.md)
- [Kubernetes Resources](../platform/kubernetes.md)
