---
type: docs
title: "Dapr MCP 服务器配置参考"
linkTitle: "配置"
weight: 20
description: "Dapr MCP 服务器读取的每个命令行标志和环境变量，以及默认值"
---

Dapr MCP 服务器接受少量命令行标志，其余配置都从环境变量读取。服务器在启动时检查认证设置；如果设置无效或不完整，它会报错退出，而不是在没有保护的情况下启动。

## 命令行标志

| 标志 | 默认值 | 说明 |
|---|---|---|
| `--http <addr>` | 未设置（stdio） | 在此地址上提供 streamable HTTP 服务，而不是 stdio，例如 `localhost:8080` 或 `0.0.0.0:8080`。健康检查端点也在同一地址上提供。 |
| `--version` | `false` | 打印版本号并退出。 |
| `--health-check` | `false` | 向正在运行的服务器请求 `/livez`，收到 `200` 响应时以 `0` 退出，否则以 `1` 退出。容器镜像的 `HEALTHCHECK` 使用此标志。 |
| `--health-check-addr <host:port>` | 来自 `--http`，否则为 `localhost:8080` | `--health-check` 探测的地址。通配主机（如 `0.0.0.0`）会被探测为 `localhost`。 |

## 服务器与 Dapr 连接

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DAPR_GRPC_PORT` | `50001` | Dapr sidecar 的 gRPC API 在 `127.0.0.1` 上的端口。`dapr run` 与 Kubernetes sidecar injector 会为你设置此值。 |
| `DAPR_GRPC_ENDPOINT` | 未设置 | sidecar gRPC API 的完整地址。优先于 `DAPR_GRPC_PORT`。 |
| `DAPR_API_TOKEN` | 未设置 | sidecar 要求 [API 令牌认证]({{% ref api-token.md %}}) 时发送给 sidecar 的令牌。 |
| `DAPR_CLIENT_TIMEOUT_SECONDS` | `5` | 每次连接 sidecar 尝试的超时时间。服务器最多尝试五次，每次间隔两秒，然后退出。 |
| `DAPR_MCP_SERVER_LOG_LEVEL` | `info` | 日志级别：`debug`、`info`、`warn` 或 `error`。日志以 JSON 格式写入标准错误输出（stderr）。在 `debug` 级别下，请求头会被记录，其中的凭据请求头会被脱敏。 |

服务器所使用的 [Dapr Go SDK](https://github.com/dapr/go-sdk) 会读取 `DAPR_*` 连接变量。

## HTTP 传输

这些设置仅在服务器使用 `--http` 运行时生效。

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DAPR_MCP_CORS_ORIGIN` | 未设置 | 允许从浏览器调用服务器的来源，例如 `https://app.example.com`。设置后，服务器会在每个响应中添加 CORS 头，并响应 `OPTIONS` 预检请求。未设置时，不发送 CORS 头，其他来源的浏览器请求会被拒绝。仅当其他来源的基于浏览器的 MCP 客户端需要访问时才设置它。 |

服务器始终无需认证即可提供 `/livez`、`/readyz` 和 `/startupz`；参见[健康检查端点]({{% ref "dapr-mcp-server-observability.md#health-endpoints" %}})。除这些端点之外的所有路径都提供 MCP 请求，因此 `http://<host>:<port>/` 即为 MCP 端点。唯一的例外是 `/dapr/subscribe`，它为 Dapr sidecar 返回空的订阅列表，同样无需认证。

## 认证

认证作用于 HTTP 传输。各模式的工作方式及示例，请参阅[认证]({{% ref dapr-mcp-server-authentication.md %}})。

| 变量 | 默认值 | 说明 |
|---|---|---|
| `AUTH_MODE` | 未设置（禁用） | `oidc`、`spiffe`、`dapr-sentry` 或 `hybrid` 会启用认证。未设置或设为 `disabled` 则关闭认证。 |
| `OIDC_ENABLED` | `false` | 在 `hybrid` 模式下接受 OIDC 令牌。在其他模式下忽略。 |
| `OIDC_ISSUER_URL` | 未设置 | OIDC 颁发者 URL。启用 OIDC 时必填。 |
| `OIDC_CLIENT_ID` | 未设置 | 期望的 `aud` 声明。启用 OIDC 时必填。 |
| `OIDC_ALLOWED_ALGORITHMS` | `RS256,ES256` | 以逗号分隔的、可接受的签名算法。 |
| `OIDC_SKIP_ISSUER_CHECK` | `false` | 跳过 `iss` 检查。仅供开发使用。 |
| `SPIFFE_ENABLED` | `false` | 在 `hybrid` 模式下接受 SPIFFE JWT-SVID。在其他模式下忽略。 |
| `SPIFFE_TRUST_DOMAIN` | 未设置 | 调用方必须属于的信任域。启用 SPIFFE 时必填。 |
| `SPIFFE_SERVER_ID` | 未设置 | 本服务器的 SPIFFE ID，调用方的 JWT-SVID 必须以它作为受众（audience）。启用 SPIFFE 时必填。 |
| `SPIFFE_ENDPOINT_SOCKET` | 未设置 | SPIFFE Workload API 的地址，例如 `unix:///run/spire/sockets/agent.sock`。 |
| `SPIFFE_ALLOWED_CLIENTS` | 未设置（信任域内的任何工作负载） | 以逗号分隔的、允许调用服务器的 SPIFFE ID。 |
| `DAPR_SENTRY_ENABLED` | `false` | 在 `hybrid` 模式下接受 Dapr Sentry JWT。在其他模式下忽略。 |
| `DAPR_SENTRY_JWKS_URL` | 未设置 | Sentry JWKS 的 URL。启用 Dapr Sentry 时必填。 |
| `DAPR_SENTRY_TRUST_DOMAIN` | 未设置 | 令牌 `sub` 声明中 SPIFFE ID 的信任域。启用 Dapr Sentry 时必填。 |
| `DAPR_SENTRY_AUDIENCE` | 未设置 | 期望的 `aud` 声明。启用 Dapr Sentry 时必填。 |
| `DAPR_SENTRY_ISSUER` | 未设置 | 期望的 `iss` 声明。仅在设置时检查。 |
| `DAPR_SENTRY_TOKEN_HEADER` | `Authorization` | 读取令牌的请求头。尽管名称如此，它在所有认证模式下都生效，而不只是 Dapr Sentry。自定义请求头携带的是原始令牌，不带 `Bearer` 前缀。 |
| `DAPR_SENTRY_JWKS_REFRESH_INTERVAL` | `5m` | JWKS 的刷新间隔，为 Go 时长格式。最小为 `30s`。 |

## 遥测

在设置 OTLP 端点之前，遥测处于关闭状态。服务器输出的内容请参阅[可观测性]({{% ref dapr-mcp-server-observability.md %}})。

| 变量 | 默认值 | 说明 |
|---|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | 未设置 | 所有信号使用的 OTLP 收集器端点，例如 `http://otel-collector:4317`。没有协议前缀的端点使用 TLS。 |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `grpc` | `grpc` 或 `http/protobuf`。`http/json` 会回退为 `http/protobuf`。 |
| `OTEL_EXPORTER_OTLP_INSECURE` | `false` | 对没有协议前缀的端点使用明文。显式的 `http://` 或 `https://` 前缀始终优先。 |
| `OTEL_EXPORTER_OTLP_HEADERS` | 未设置 | 每次导出都随附的、以逗号分隔的 `key=value` 请求头，例如 API 密钥。值会经过百分号解码。 |
| `OTEL_EXPORTER_OTLP_{TRACES,METRICS,LOGS}_ENDPOINT` | 未设置 | 按信号的端点，覆盖通用端点。对于 HTTP，若端点没有路径，则会添加 `/v1/traces`、`/v1/metrics` 或 `/v1/logs`；否则按原样使用。 |
| `OTEL_EXPORTER_OTLP_{TRACES,METRICS,LOGS}_PROTOCOL` | 通用值 | 按信号的协议。 |
| `OTEL_EXPORTER_OTLP_{TRACES,METRICS,LOGS}_INSECURE` | 通用值 | 按信号的明文设置。 |
| `OTEL_EXPORTER_OTLP_{TRACES,METRICS,LOGS}_HEADERS` | 未设置 | 按信号的请求头，与通用请求头合并，并覆盖后者。 |
| `OTEL_SERVICE_NAME` | `dapr-mcp-server` | `service.name` 资源属性。 |
| `OTEL_SERVICE_VERSION` | 二进制版本 | `service.version` 资源属性。 |
| `OTEL_METRIC_EXPORT_INTERVAL` | `10000` | 指标导出间隔，单位为毫秒。也接受 `30s` 这类 Go 时长格式。 |
| `OTEL_LOG_EXPORT_INTERVAL` | `5000` | 日志导出间隔，单位为毫秒。也接受 Go 时长格式。 |
| `DAPR_MCP_SERVER_METRICS_ENABLED` | `true` | 设为 `false` 可停止导出指标，同时保留追踪。 |
| `DAPR_MCP_SERVER_LOGS_OTEL_ENABLED` | `true` | 设为 `false` 可停止通过 OTLP 导出日志。日志仍会写入标准错误输出。 |
