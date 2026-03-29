---
type: docs
title: "Dapr 配置"
linkTitle: "概述"
weight: 100
description: "Dapr 配置概述"
---

Dapr 配置是设置和策略，使您能够更改单个 Dapr 应用程序的行为或 Dapr 控制平面系统服务的全局行为。

[更多信息，请阅读配置概念。]({{% ref configuration-concept.md %}})

## 应用程序配置

### 设置应用程序配置

您可以在自托管或 Kubernetes 模式下设置应用程序配置。

{{< tabpane text=true >}}

 <!-- Self hosted -->
{{% tab "自托管" %}}

在自托管模式下，Dapr 配置是一个[配置文件]({{% ref configuration-schema.md %}}) - 例如，`config.yaml`。默认情况下，Dapr 边车会在默认的 Dapr 文件夹中查找运行时配置：
- Linux/MacOs：`$HOME/.dapr/config.yaml`
- Windows：`%USERPROFILE%\.dapr\config.yaml`

应用程序还可以通过使用 `dapr run` CLI 命令的 `--config` 标志来应用配置文件路径。

{{% /tab %}}

 <!-- Kubernetes -->
{{% tab "Kubernetes" %}}

在 Kubernetes 模式下，Dapr 配置是一个 Configuration 资源，应用于集群。例如：

```bash
kubectl apply -f myappconfig.yaml
```

您可以使用 Dapr CLI 列出应用程序的 Configuration 资源。

```bash
dapr configurations -k
```

Dapr 边车可以通过使用 `dapr.io/config` 注解来应用特定配置。例如：

```yml
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "nodeapp"
    dapr.io/app-port: "3000"
    dapr.io/config: "myappconfig"
```

> **注意：**[查看所有 Kubernetes 注解]({{% ref "arguments-annotations-overview.md" %}})可用于在边车注入器系统服务激活时配置 Dapr 边车。

{{% /tab %}}

{{< /tabpane >}}

### 应用程序配置设置

以下菜单包含您可以设置的所有配置设置：

- [追踪](#tracing)
- [指标](#metrics)
- [日志记录](#logging)
- [中间件](#middleware)
- [名称解析](#name-resolution)
- [工作流](#workflow)
- [限定密钥存储访问范围](#scope-secret-store-access)
- [构建块 API 的访问控制允许列表](#access-control-allow-lists-for-building-block-apis)
- [服务调用 API 的访问控制允许列表](#access-control-allow-lists-for-service-invocation-api)
- [禁止使用某些组件类型](#disallow-usage-of-certain-component-types)
- [启用预览功能](#turning-on-preview-features)
- [边车配置示例](#example-sidecar-configuration)

#### 追踪

追踪配置可为应用程序启用追踪。

`Configuration` 规范下的 `tracing` 部分包含以下属性：

```yml
tracing:
  samplingRate: "1"
  otel: 
    endpointAddress: "otelcollector.observability.svc.cluster.local:4317"
    headers:
      - name: "x-api-key"
        secretKeyRef:
          name: "my-secret"
          key: "otel-api-key"
    timeout: "30s"
  zipkin:
    endpointAddress: "http://zipkin.default.svc.cluster.local:9411/api/v2/spans"
```

下表列出了追踪的属性：

| 属性     | 类型   | 描述 |
|--------------|--------|-------------|
| `samplingRate` | string | 设置追踪的采样率以启用或禁用。
| `stdout` | bool | True 向追踪写入更详细的信息
| `otel.endpointAddress` | string | 设置要向其发送追踪的 Open Telemetry (OTEL) 服务器地址。根据您的 OTEL 提供商，可能需要或不需要 https:// 或 http://。
| `otel.isSecure` | bool | 到端点地址的连接是否加密
| `otel.protocol` | string | 设置为 `http` 或 `grpc` 协议
| `otel.headers` | array | 要包含在 OTLP 导出器请求中的标头。每个条目都有一个 `name` 和纯文本 `value` 或 `secretKeyRef` 以引用 Kubernetes 密钥（仅支持 Kubernetes 密钥，不支持其他密钥类型）
| `otel.timeout` | string | OTLP 导出器请求的超时时间（例如 `30s`、`5m`）。
| `zipkin.endpointAddress` | string | 设置要向其发送追踪的 Zipkin 服务器地址。这应包含端点上的协议（http:// 或 https://）。

##### `samplingRate`

`samplingRate` 用于启用或禁用追踪。`samplingRate` 的有效范围介于 `0` 和 `1` 之间（含）。采样率根据值确定是否应对追踪跨度进行采样。

`samplingRate : "1"` 采样所有追踪。默认情况下，采样率为 (0.0001)，即 10,000 条追踪中有 1 条。

要禁用采样率，请在配置中设置 `samplingRate : "0"`。

##### `otel`

也可以通过环境变量配置 OpenTelemetry (`otel`) 端点。`OTEL_EXPORTER_OTLP_ENDPOINT` 环境变量的存在会为边车启用追踪。

| 环境变量 | 描述 |
|----------------------|-------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | 设置 Open Telemetry (OTEL) 服务器地址，启用追踪 |
| `OTEL_EXPORTER_OTLP_INSECURE` | 将到端点的连接设置为未加密（true/false） |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | 传输协议（`grpc`、`http/protobuf`、`http/json`） |
| `OTEL_EXPORTER_OTLP_TRACES_HEADERS` | OTLP 追踪导出器的逗号分隔的 `key=value` 标头列表 |
| `OTEL_EXPORTER_OTLP_TRACES_TIMEOUT` | OTLP 追踪导出器的超时时间（以毫秒为单位）（例如 `30000`） |

更多信息，请参阅[可观测性分布式追踪]({{% ref "tracing-overview.md" %}})。

#### 指标

`Configuration` 规范下的 `metrics` 部分可用于启用或禁用应用程序的指标。

`metrics` 部分包含以下属性：

```yml
metrics:
  enabled: true
  rules: []
  latencyDistributionBuckets: []
  http:
    increasedCardinality: true
    pathMatching:
      - /items
      - /orders/{orderID}
      - /orders/{orderID}/items/{itemID}
      - /payments/{paymentID}
      - /payments/{paymentID}/status
      - /payments/{paymentID}/refund
      - /payments/{paymentID}/details
    excludeVerbs: false
  recordErrorCodes: true
```

在上述示例中，路径过滤器 `/orders/{orderID}/items/{itemID}` 将返回与所有 `orderID` 和所有 `itemID` 匹配的_单个指标计数_，而不是为每个 `itemID` 返回多个指标。更多信息，请参阅 [HTTP 指标路径匹配]({{% ref "metrics-overview.md#http-metrics-path-matching" %}})。

上述示例还启用了[记录错误代码指标]({{% ref "metrics-overview.md#configuring-metrics-for-error-codes" %}})，默认情况下该功能是禁用的。

下表列出了指标的属性：

| 属性                     | 类型    | 描述                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
|------------------------------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `enabled`                    | boolean | 设置为 true 时（默认值），启用指标收集和指标端点。                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `rules`                      | array   | 用于过滤指标的命名规则。每个规则包含一组要过滤的 `labels` 和要应用于指标路径的 `regex` 表达式。                                                                                                                                                                                                                                                                                                                                                                                                           |
| `latencyDistributionBuckets` | array   | 延迟指标直方图的延迟分布桶数组（以毫秒为单位）。                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `http.increasedCardinality`  | boolean | 设置为 `true`（默认值）时，在 Dapr HTTP 服务器中，每个请求路径都会创建一个新的指标"桶"。当有许多不同的请求端点（例如与 RESTful API 交互时）时，这可能会导致问题，包括过多的内存消耗。<br> 为了缓解与 HTTP 服务器相关的[高基数指标]({{% ref "metrics-overview.md#high-cardinality-metrics" %}})的高内存使用量和出口成本，您应该将 `metrics.http.increasedCardinality` 属性设置为 `false`。 |
| `http.pathMatching`          | array   | 用于路径匹配的路径数组，允许用户定义匹配路径以管理基数。                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `http.excludeVerbs`          | boolean | 设置为 true 时（默认为 false），Dapr HTTP 服务器在构建方法指标标签时会忽略每个请求的 HTTP 动词。                                                                                                                                                                                                                                                                                                                                                                                                                  |

为了进一步帮助管理基数，路径匹配允许您根据定义的模式匹配指定路径，从而减少唯一指标路径的数量，从而控制指标基数。此功能对于具有动态 URL 的应用程序特别有用，确保指标保持有意义和可管理，而不会消耗过多的内存。

使用规则，您可以为 Dapr 边车公开的每个指标设置正则表达式。例如：

```yml
metrics:
  enabled: true
  rules:
    - name: dapr_runtime_service_invocation_req_sent_total
      labels:
      - name: method
        regex:
          "orders/": "orders/.+"
```

更多信息，请参阅[指标文档]({{% ref "metrics-overview.md" %}})。

#### 日志记录

`Configuration` 规范下的 `logging` 部分用于配置 Dapr Runtime 中的日志记录工作方式。

`logging` 部分包含以下属性：

```yml
logging:
  apiLogging:
    enabled: false
    obfuscateURLs: false
    omitHealthChecks: false
```

下表列出了日志记录的属性：

| 属性     | 类型   | 描述 |
|--------------|--------|-------------|
| `apiLogging.enabled` | boolean | `daprd` 的 `--enable-api-logging` 标志（以及相应的 `dapr.io/enable-api-logging` 注解）的默认值：在 Configuration 规范中设置的值将用作默认值，除非将 `true` 或 `false` 值传递给每个 Dapr Runtime。默认值：`false`。
| `apiLogging.obfuscateURLs` | boolean | 启用后，混淆 HTTP API 日志中的 URL 值（如果启用），记录抽象路由名称而不是被调用的完整路径，后者可能包含个人身份信息 (PII)。默认值：`false`。
| `apiLogging.omitHealthChecks` | boolean | 如果为 `true`，则在启用 API 日志记录时，不会记录对健康检查端点（例如 `/v1.0/healthz`）的调用。如果这些调用在日志中产生大量噪音，这很有用。默认值：`false`

更多信息，请参阅[日志记录文档]({{% ref "logs.md" %}})。

#### 中间件

中间件配置设置命名 HTTP 管道中间件处理程序。`Configuration` 规范下的 `httpPipeline` 和 `appHttpPipeline` 部分包含以下属性：

```yml
httpPipeline: # for incoming http calls
  handlers:
    - name: oauth2
      type: middleware.http.oauth2
    - name: uppercase
      type: middleware.http.uppercase
appHttpPipeline: # for outgoing http calls
  handlers:
    - name: oauth2
      type: middleware.http.oauth2
    - name: uppercase
      type: middleware.http.uppercase
```

下表列出了 HTTP 处理程序的属性：

| 属性 | 类型   | 描述 |
|----------|--------|-------------|
| `name`     | string | 中间件组件的名称
| `type`     | string | 中间件组件的类型

更多信息，请参阅[中间件管道]({{% ref "middleware.md" %}})。

#### 名称解析组件

您可以在配置文件中设置要使用的名称解析组件。例如，要将 `spec.nameResolution.component` 属性设置为 `"sqlite"`，请在 `spec.nameResolution.configuration` 字典中传递配置选项，如下所示。

这是一个配置资源的基本示例：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration 
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "sqlite"
    version: "v1"
    configuration:
      connectionString: "/home/user/.dapr/nr.db"
```

更多信息，请参阅：
- [名称解析组件文档]({{% ref supported-name-resolution %}})以获取更多示例。
- [配置文件文档]({{% ref configuration-schema.md %}})以了解有关如何为每个组件配置名称解析的更多信息。

#### 工作流

`workflow` 部分包含用于配置[工作流]({{% ref "workflow-overview.md" %}})的属性。

| 属性 | 类型   | 描述 |
|------------------|--------|-----|
| `maxConcurrentWorkflowInvocations` | int32 | 每个 Dapr 边车的最大并发工作流执行数。默认为无限。 |
| `maxConcurrentActivityInvocations` | int32 | 每个 Dapr 边车的最大并发活动执行数。默认为无限。 |

#### 限定密钥存储访问范围

有关如何将密钥范围限定到应用程序的信息和示例，请参阅[限定密钥范围]({{% ref "secret-scope.md" %}})指南。

#### 构建块 API 的访问控制允许列表

有关如何在构建块 API 列表上设置访问控制允许列表 (ACL) 的信息和示例，请参阅[在 Dapr 边车上有选择性地启用 Dapr API]({{% ref "api-allowlist.md" %}})指南。

#### 服务调用 API 的访问控制允许列表

有关如何使用服务调用 API 通过 ACL 设置允许列表的信息和示例，请参阅[服务调用的允许列表]({{% ref "invoke-allowlist.md" %}})指南。

#### 禁止使用某些组件类型

使用 `Configuration` 规范中的 `components.deny` 属性，您可以指定无法初始化的组件类型的拒绝列表。

例如，以下配置禁止初始化类型为 `bindings.smtp` 和 `secretstores.local.file` 的组件：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: myappconfig
spec: 
  components:
    deny:
      - bindings.smtp
      - secretstores.local.file
```

或者，您可以通过在组件名称末尾添加版本来指定要禁止的版本。例如，`state.in-memory/v1` 禁止初始化类型为 `state.in-memory` 和版本为 `v1` 的组件，但不会禁用（假设的）组件的 `v2` 版本。

{{% alert title="注意" color="primary" %}}
 当您将组件类型 `secretstores.kubernetes` 添加到拒绝列表时，Dapr 禁止创建类型为 `secretstores.kubernetes` 的_其他_组件。

 但是，它不会禁用内置的 Kubernetes 密钥存储，该密钥存储是：
 - 由 Dapr 自动创建
 - 用于存储组件规范中指定的密钥
 
 如果要禁用内置的 Kubernetes 密钥存储，则需要使用 `dapr.io/disable-builtin-k8s-secret-store` [注解]({{% ref arguments-annotations-overview.md %}})。
{{% /alert %}}

#### 启用预览功能

有关如何选择加入发布的预览功能的信息和示例，请参阅[预览功能]({{% ref "preview-features.md" %}})指南。

启用预览功能会为开发/测试添加新功能，因为它们在运行时中普遍可用 (GA) 之前仍需要更多时间。

### 边车配置示例

以下 YAML 显示了一个可以应用于应用程序的 Dapr 边车的配置文件示例。

```yml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: myappconfig
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    stdout: true
    otel:
      endpointAddress: "localhost:4317"
      isSecure: false
      protocol: "grpc"
      headers:
        - name: "x-api-key"
          secretKeyRef:
            name: "my-secret"
            key: "otel-api-key"
      timeout: "30s"
  httpPipeline:
    handlers:
      - name: oauth2
        type: middleware.http.oauth2
  secrets:
    scopes:
      - storeName: localstore
        defaultAccess: allow
        deniedSecrets: ["redis-password"]
  components:
    deny:
      - bindings.smtp
      - secretstores.local.file
  workflow:
    maxConcurrentWorkflowInvocations: 100
    maxConcurrentActivityInvocations: 1000
  accessControl:
    defaultAction: deny
    trustDomain: "public"
    policies:
      - appId: app1
        defaultAction: deny
        trustDomain: 'public'
        namespace: "default"
        operations:
          - name: /op1
            httpVerb: ['POST', 'GET']
            action: deny
          - name: /op2/*
            httpVerb: ["*"]
            action: allow
```

## 控制平面配置

安装了一个名为 `daprsystem` 的配置文件，用于应用全局设置的 Dapr 控制平面系统服务。

> **这仅在将 Dapr 部署到 Kubernetes 时设置。**

### 控制平面配置设置

Dapr 控制平面配置包含以下部分：

- [`mtls`](#mtls-mutual-tls) 用于 mTLS（双向 TLS）

### mTLS（双向 TLS）

`mtls` 部分包含 mTLS 的属性。

| 属性         | 类型   | 描述 |
|------------------|--------|-------------|
| `enabled`          | bool   | 如果为 true，则为集群中的服务和应用程序之间的通信启用 mTLS。
| `allowedClockSkew` | string | 检查 TLS 证书过期时允许的容差，以允许时钟偏差。遵循 [Go 的 time.ParseDuration](https://pkg.go.dev/time#ParseDuration) 使用的格式。默认为 `15m`（15 分钟）。
| `workloadCertTTL`  | string | 由 Dapr 颁发的 TLS 证书的有效期。遵循 [Go 的 time.ParseDuration](https://pkg.go.dev/time#ParseDuration) 使用的格式。默认为 `24h`（24 小时）。
| `sentryAddress`  | string | 用于连接到 Sentry 服务器的主名端口地址。 |
| `controlPlaneTrustDomain` | string | 控制平面的信任域。这用于验证到控制平面服务的连接。 |
| `tokenValidators` | array | 用于验证证书请求的其他 Sentry 令牌验证器。 |

更多信息，请参阅 [mTLS 操作方法]({{% ref "mtls.md" %}})和[安全概念]({{% ref "security-concept.md" %}})。

### 控制平面配置示例

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprsystem
  namespace: default
spec:
  mtls:
    enabled: true
    allowedClockSkew: 15m
    workloadCertTTL: 24h
```

## 后续步骤

{{< button text="了解并发和速率限制" page="control-concurrency.md" >}}
