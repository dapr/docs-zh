---
type: docs
title: "对 Dapr MCP 服务器的客户端进行身份验证"
linkTitle: "身份验证"
weight: 30
description: "要求 Dapr MCP 服务器的 HTTP 传输使用 OIDC、SPIFFE 或 Dapr Sentry 令牌"
---

Dapr MCP 服务器可以要求通过可流式传输 HTTP 提供的每个 MCP 请求都携带有效令牌。身份验证默认关闭。设置 `AUTH_MODE` 即可开启：

| `AUTH_MODE` | 接受 |
|---|---|
| 未设置，或为 `disabled` | 任何请求。仅在 `localhost` 上使用。 |
| `oidc` | 来自 OpenID Connect 提供方的 ID 令牌或访问令牌（JWT） |
| `spiffe` | SPIFFE JWT-SVID，使用来自 SPIFFE Workload API 的信任包进行验证 |
| `dapr-sentry` | Dapr Sentry 为 Dapr 应用签发的 JWT |
| `hybrid` | 以上三种方式的任意组合 |

身份验证仅适用于 HTTP 传输。通过 stdio 时，MCP 客户端会将服务器作为本地进程启动，此时不存在需要保护的网络监听器。

服务器在启动时检查所选模式的设置。如果缺少必需的变量，或某个值无法解析，服务器会退出，并报错指出对应的变量名。无法识别的 `AUTH_MODE` 值同样会在启动时被拒绝。

## 发送令牌

客户端在 `Authorization` 标头中发送令牌，格式可以是 `Bearer <token>`，也可以是原始令牌。如果 `DAPR_SENTRY_TOKEN_HEADER` 指定了其他标头，那么在所有模式下，服务器都会先检查该标头，并期望其中是原始令牌。

没有令牌，或令牌不被任何已启用方式接受的请求，会收到 `401 Unauthorized`。服务器不会说明是哪项检查失败。若要在服务器上记录原因，请设置 `DAPR_MCP_SERVER_LOG_LEVEL=debug`。

## OIDC

对于由 Microsoft Entra ID、Okta、Auth0、Keycloak 或 Google 等身份提供方签发给用户或应用的令牌，请使用 `oidc`。

| 变量 | 必需 | 说明 |
|---|---|---|
| `OIDC_ISSUER_URL` | 是 | 颁发者 URL。服务器会在启动时从它获取提供方的发现文档，若获取失败则退出。 |
| `OIDC_CLIENT_ID` | 是 | 令牌的 `aud` 声明必须包含的值。 |
| `OIDC_ALLOWED_ALGORITHMS` | 否 | 接受的签名算法。默认为 `RS256,ES256`。 |
| `OIDC_SKIP_ISSUER_CHECK` | 否 | 跳过 `iss` 检查。仅用于开发；开启时服务器会记录一条警告。 |

```bash
export AUTH_MODE=oidc
export OIDC_ISSUER_URL=https://login.example.com/realms/agents
export OIDC_CLIENT_ID=dapr-mcp-server
dapr run --app-id dapr-mcp-server --resources-path ./components -- dapr-mcp-server --http 0.0.0.0:8080
```

## SPIFFE

对于工作负载之间的服务到服务调用，且工作负载从 SPIRE 等 SPIFFE 实现获取 JWT-SVID 的场景，请使用 `spiffe`。服务器在启动时连接 Workload API 以获取信任包，最多等待 10 秒。

| 变量 | 必需 | 说明 |
|---|---|---|
| `SPIFFE_TRUST_DOMAIN` | 是 | 信任域，例如 `example.org`。来自其他信任域的令牌会被拒绝。 |
| `SPIFFE_SERVER_ID` | 是 | 此服务器的 SPIFFE ID，例如 `spiffe://example.org/dapr-mcp-server`。调用方必须以此 ID 作为受众请求其 JWT-SVID。 |
| `SPIFFE_ENDPOINT_SOCKET` | 否 | Workload API 地址，例如 `unix:///run/spire/sockets/agent.sock`。 |
| `SPIFFE_ALLOWED_CLIENTS` | 否 | 允许调用此服务器的 SPIFFE ID，以逗号分隔。每个 ID 都必须属于信任域。未设置时，信任域内的任何工作负载都会被接受。 |

```bash
export AUTH_MODE=spiffe
export SPIFFE_TRUST_DOMAIN=example.org
export SPIFFE_SERVER_ID=spiffe://example.org/dapr-mcp-server
export SPIFFE_ENDPOINT_SOCKET=unix:///run/spire/sockets/agent.sock
export SPIFFE_ALLOWED_CLIENTS=spiffe://example.org/ns/agents/sa/planner
```

## Dapr Sentry

当调用方是 Dapr 应用时，请使用 `dapr-sentry`。Dapr Sentry 可以为每个应用签发一个 JWT，其主体为该应用的 SPIFFE ID，并将签名密钥以 JWKS 的形式发布。要在 Sentry 中启用此功能，请启用 JWT 签发与 OIDC 服务器，并使用 [使用联合身份凭据进行身份验证]({{% ref "authenticating-azure.md#authenticating-with-a-federated-identity-credential" %}}) 中所示的 Sentry Helm 值。该页面中的 Microsoft Entra ID 步骤不适用。JWKS 在 Sentry OIDC 端口的 `/jwks.json` 上提供。每个调用方应用都会通过 `dapr.io/sentry-request-jwt-audiences` 注解请求令牌，受众为你在 `DAPR_SENTRY_AUDIENCE` 中设置的值；在自托管模式下则使用 `--sentry-request-jwt-audiences` 参数。

通过 `auth.spiffe.jwt` 配置的 [`MCPServer` 资源]({{% ref "mcp-server-resource.md#spiffe-workload-identity" %}}) 会在每次调用时发送此类令牌，因此此模式与将 Dapr MCP 服务器声明为 `MCPServer` 天然搭配。

| 变量 | 必需 | 说明 |
|---|---|---|
| `DAPR_SENTRY_JWKS_URL` | 是 | Sentry JWKS 的 URL。 |
| `DAPR_SENTRY_TRUST_DOMAIN` | 是 | 调用方 SPIFFE ID 的信任域，例如 `public`。`sub` 声明必须是该信任域中、带有工作负载路径的 SPIFFE ID。 |
| `DAPR_SENTRY_AUDIENCE` | 是 | 令牌的 `aud` 声明必须包含的值。使用调用方请求令牌时所用的受众。 |
| `DAPR_SENTRY_ISSUER` | 否 | 期望的 `iss` 声明。未设置时，不检查签发方。 |
| `DAPR_SENTRY_TOKEN_HEADER` | 否 | 承载原始令牌的标头。默认为 `Authorization`。在所有模式下均适用；参见[发送令牌](#发送令牌)。 |
| `DAPR_SENTRY_JWKS_REFRESH_INTERVAL` | 否 | 刷新 JWKS 的间隔。默认 `5m`，最小 `30s`。 |

```bash
export AUTH_MODE=dapr-sentry
export DAPR_SENTRY_JWKS_URL=https://dapr-sentry.dapr-system.svc.cluster.local:9080/jwks.json
export DAPR_SENTRY_TRUST_DOMAIN=public
export DAPR_SENTRY_AUDIENCE=mcp://dapr-mcp-server
export DAPR_SENTRY_ISSUER=https://sentry.example.com
```

服务器在启动时获取 JWKS，若获取失败则退出。此后，服务器会按配置的间隔刷新密钥；当收到使用其所没有的密钥签名的令牌时，也会刷新，但至多每 30 秒一次。如果无法连接 Sentry，服务器会继续使用缓存的密钥，最长 24 小时。服务器只接受非对称签名算法，令牌必须包含 `exp` 声明，并且对 `exp`、`nbf` 和 `iat` 的检查允许一分钟的时钟偏差容差。

## 混合模式

`hybrid` 接受来自多种方式的令牌。使用各方式对应的 `*_ENABLED` 变量开启你需要的方式，并设置该方式所需的变量。至少须开启一种方式。

```bash
export AUTH_MODE=hybrid

export OIDC_ENABLED=true
export OIDC_ISSUER_URL=https://login.example.com/realms/agents
export OIDC_CLIENT_ID=dapr-mcp-server

export DAPR_SENTRY_ENABLED=true
export DAPR_SENTRY_JWKS_URL=https://dapr-sentry.dapr-system.svc.cluster.local:9080/jwks.json
export DAPR_SENTRY_TRUST_DOMAIN=public
export DAPR_SENTRY_AUDIENCE=mcp://dapr-mcp-server
```

服务器按 OIDC、SPIFFE、Dapr Sentry 的顺序尝试已启用的方式，只要其中一种验证通过，就接受该请求。在单一方式模式下，`*_ENABLED` 变量会被忽略。

## 无需身份验证的路径

健康检查端点 `/livez`、`/readyz` 和 `/startupz` 始终无需身份验证即可访问，`/dapr/subscribe` 同样如此，它只会告知 sidecar 该服务器没有订阅。其他所有路径都属于 MCP，需要令牌。目前没有配置项可以豁免更多路径。

## 相关链接

- [配置参考]({{% ref dapr-mcp-server-configuration.md %}})
- [MCP 安全态势]({{% ref mcp-security.md %}})
