---
type: docs
title: "Dapr MCP 服务器可观测性"
linkTitle: "可观测性"
weight: 50
description: "Dapr MCP 服务器通过 OpenTelemetry 导出的跟踪、指标和日志，以及它的健康检查端点"
---

Dapr MCP 服务器通过 OpenTelemetry 协议（OTLP）导出跟踪、指标和日志，并且在以 HTTP 方式运行时，提供供探针使用的健康检查端点。

## 开启遥测

在你设置 OTLP 端点之前，遥测功能处于关闭状态。请将服务器指向一个 OpenTelemetry Collector，或任何接受 OTLP 的后端：

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_SERVICE_NAME=dapr-mcp-server
dapr run --app-id dapr-mcp-server --resources-path ./components -- dapr-mcp-server --http localhost:8080
```

没有协议前缀的端点（例如 `otel-collector:4317`）会使用 TLS。若要向这类端点发送明文，请添加 `OTEL_EXPORTER_OTLP_INSECURE=true`，或者显式写出协议前缀。若要使用基于 HTTP 的 OTLP 代替 gRPC，请设置 `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`，并使用 HTTP 端口（通常为 `4318`）。

三类信号都发送到同一个端点，除非你用 `OTEL_EXPORTER_OTLP_{TRACES,METRICS,LOGS}_*` 变量单独覆盖其中一类。每个设置项请参阅[配置参考]({{% ref "dapr-mcp-server-configuration.md#telemetry" %}})。如果无法设置导出器，服务器会记录一条警告，并在没有遥测的情况下继续运行。

要让收集器接收数据，请参阅[使用 OpenTelemetry Collector]({{% ref otel-collector %}})。

## 跟踪

服务器会创建以下跨度：

- **每个 HTTP 请求对应一个服务端跨度**，以请求方法和路由命名，例如 `POST /`。如果请求携带 W3C `traceparent` 标头，它会延续调用方的跟踪。
- **每次工具调用对应一个跨度**，以工具名称命名，例如 `save_state`。它带有属性 `mcp.tool.name` 和 `mcp.tool.package`；如果工具以某个 component 为目标，还会带有 `dapr.component.name`；此外还包含状态键或主题等细节。失败的调用会被标记为错误状态。

每次 gRPC 调用都会将工具跨度的跟踪上下文传递给 Dapr sidecar，因此当 [Dapr 跟踪]({{% ref tracing-overview.md %}}) 导出到同一个后端时，来自 sidecar 以及它所调用的任何应用的跨度都会加入同一条跟踪。

## 指标

默认每 10 秒导出一次指标（可通过 `OTEL_METRIC_EXPORT_INTERVAL` 修改）。若要在保留跟踪的同时关闭指标，请设置 `DAPR_MCP_SERVER_METRICS_ENABLED=false`。

| 指标 | 类型 | 单位 | 说明 |
|---|---|---|---|
| `dapr-mcp-server.tool.invocations` | 计数器 | `{invocation}` | 工具调用次数，按结果区分。 |
| `dapr-mcp-server.tool.errors` | 计数器 | `{error}` | 失败的工具调用。 |
| `dapr-mcp-server.tool.duration` | 直方图 | `ms` | 工具调用耗时。 |
| `dapr-mcp-server.tool.in_progress` | 可增减计数器 | `{tool}` | 当前正在运行的工具调用。 |
| `dapr-mcp-server.http.requests_total` | 计数器 | `{request}` | MCP HTTP 请求。 |
| `dapr-mcp-server.http.request_duration` | 直方图 | `ms` | MCP HTTP 请求耗时。服务器发送事件流会被计数但不计时，因为其持续时间等于客户端的会话时长。 |
| `dapr-mcp-server.http.requests_in_flight` | 可增减计数器 | `{request}` | 当前正在处理的 MCP HTTP 请求。 |

工具指标只携带有界属性：`tool.name` 和 `tool.package`；调用指标和耗时指标还带有 `outcome`（取值为 `success` 或 `error`），错误计数器还带有 `error.type`。由代理提供的值（例如 component 名称、App ID 和 Actor 类型）不会写入指标，而是记录在工具的跨度上。HTTP 指标携带 `http.request.method`、`http.response.status_code` 和 `http.route`。HTTP 指标只覆盖 MCP 请求，不包括健康检查端点。

## 日志

服务器将结构化 JSON 日志写入 stderr，从不写入 stdout，因此日志不会破坏 stdio 传输。每条记录都包含服务名称和版本。通过 `DAPR_MCP_SERVER_LOG_LEVEL` 设置日志级别（`debug`、`info`、`warn` 或 `error`，默认为 `info`）。

设置 OTLP 端点后，相同的记录还会以 OpenTelemetry 日志的形式导出，并与当前活动的跟踪相关联。若要让日志只保留在 stderr 上，请设置 `DAPR_MCP_SERVER_LOGS_OTEL_ENABLED=false`。

在 `debug` 级别下，服务器会记录传入的请求标头，其中 `Authorization`、`Cookie`、`X-Api-Key` 以及已配置的令牌标头都会被脱敏。每次成功的工具调用以 `info` 级别记录，每次失败以 `warn` 级别记录，并附带其目标（例如存储名称和键），但绝不记录负载或机密值。

## 健康检查端点

使用 `--http` 时，服务器会在与 MCP 相同的地址上提供三个端点。它们从不需要身份验证，并且每个端点都返回 JSON，其中包含 `status`（取值为 `healthy` 或 `unhealthy`）和服务器的 `version`。

| 端点 | 返回 `200` 的条件 | 其他情况 |
|---|---|---|
| `/livez` | 进程正在运行。 | — |
| `/startupz` | 启动已完成：服务器已连接到 Dapr sidecar 并注册了工具。 | `503` |
| `/readyz` | 服务器已就绪，且 Dapr sidecar 在 5 秒内响应 metadata 请求。响应中列出了每项检查。 | `503` |

```json
{
  "status": "healthy",
  "checks": [
    { "status": "healthy", "component": "dapr", "message": "sidecar connected", "latency": "1.2ms" }
  ],
  "version": "v0.0.1"
}
```

收到 `SIGTERM` 或 `SIGINT` 后，`/readyz` 开始返回 `503`，已打开的服务器发送事件流会被关闭，正在处理中的请求最多有 15 秒的时间完成，之后服务器才会退出。

`--health-check` 标志会在命令行中执行相同的存活检查。它请求 `/livez`，地址依次取自 `--health-check-addr`、`--http`，若都未设置则使用 `localhost:8080`，并以 `0` 或 `1` 退出。容器镜像将其用作 `HEALTHCHECK`。

在 stdio 模式下没有 HTTP 监听器，因此这些端点不可用。
