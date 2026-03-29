---
type: docs
title: "配置 Dapr 发送分布式追踪数据"
linkTitle: "配置追踪"
weight: 30
description: "设置 Dapr 发送分布式追踪数据"
---

{{% alert title="注意" color="primary" %}}
建议在任何生产场景中运行 Dapr 时启用追踪。你可以根据你的环境（无论是运行在云上还是本地）配置 Dapr 将追踪和遥测数据发送到许多可观测性工具。
{{% /alert %}}


## 配置

`Configuration` 规范下的 `tracing` 部分包含以下属性：

```yml
spec:
  tracing:
    samplingRate: "1"
    otel: 
      endpointAddress: "myendpoint.cluster.local:4317"
      headers:
        - name: "x-api-key"
          secretKeyRef:
            name: "my-secret-store"
            key: "otel-api-key"
      timeout: "30s"
    zipkin:
      endpointAddress: "https://..."
    
```

下表列出了追踪的属性：

| 属性     | 类型   | 描述 |
|--------------|--------|-------------|
| `samplingRate` | string | 设置追踪的采样率以启用或禁用。
| `stdout` | bool | True 向追踪写入更详细的信息
| `otel.endpointAddress` | string | 设置 Open Telemetry (OTEL) 目标主机名和可选端口。如果使用此选项，则不需要指定 'zipkin' 部分。
| `otel.isSecure` | bool | 到端点地址的连接是否加密。
| `otel.protocol` | string | 设置为 `http` 或 `grpc` 协议。
| `otel.headers` | array | 要包含在 OTLP 导出器请求中的标头。每个条目都有一个 `name` 和明文 `value` 或 `secretKeyRef`（用于引用 Kubernetes secret）。
| `otel.timeout` | string | OTLP 导出器请求的超时时间（例如 `30s`、`5m`）。
| `zipkin.endpointAddress` | string | 设置 Zipkin 服务器 URL。如果使用此选项，则不需要指定 `otel` 部分。

要启用追踪，请使用配置文件（在自托管模式下）或 Kubernetes 配置对象（在 Kubernetes 模式下）。例如，以下配置对象将采样率更改为 1（每个 span 都被采样），并使用 OTEL 协议将追踪发送到位于 localhost:4317 的 OTEL 服务器

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "localhost:4317"
      isSecure: false
      protocol: grpc
      headers:
        - name: "x-api-key"
          value: "my-api-key"
        - name: "x-secret-header"
          secretKeyRef:
            name: "my-secret"
            key: "header-value"
      timeout: "30s"
```

## 采样率

Dapr 使用概率采样。采样率定义了追踪 span 被采样的概率，其值可以在 0 到 1 之间（含）。默认采样率为 0.0001（即每 10,000 个 span 中采样 1 个）。

将 `samplingRate` 更改为 0 会完全禁用追踪。

## 环境变量

OpenTelemetry (otel) 端点也可以通过环境变量进行配置。存在 OTEL_EXPORTER_OTLP_ENDPOINT 环境变量时
会为边车启用追踪。

| 环境变量 | 描述 |
|----------------------|-------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | 设置 Open Telemetry (OTEL) 服务器主机名和可选端口，启用追踪 |
| `OTEL_EXPORTER_OTLP_INSECURE` | 将到端点的连接设置为未加密（true/false） |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | 传输协议（`grpc`、`http/protobuf`、`http/json`） |
| `OTEL_EXPORTER_OTLP_TRACES_HEADERS` | OTLP 追踪导出器的逗号分隔的 `key=value` 标头列表 |
| `OTEL_EXPORTER_OTLP_TRACES_TIMEOUT` | OTLP 追踪导出器的超时时间（以毫秒为单位，例如 `30000`） |

## 下一步

了解如何使用以下工具之一设置追踪：
- [OTEL Collector]({{% ref otel-collector %}})
- [New Relic]({{% ref newrelic.md %}})
- [Jaeger]({{% ref open-telemetry-collector-jaeger.md %}})
- [Zipkin]({{% ref zipkin.md %}})
- [Datadog]({{% ref datadog.md %}})
- [Dash0]({{% ref dash0.md %}})
