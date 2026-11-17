---
type: docs
title: "Dapr 配置"
linkTitle: "概述"
weight: 100
description: "Dapr 配置概述"
---

Dapr 配置是一组设置和策略，用于更改单个 Dapr 应用程序的行为，或 Dapr control plane 系统服务的全局行为。

[更多信息，请阅读配置概念。]({{% ref configuration-concept.md %}})

## 应用程序配置

### 设置应用程序配置

你可以在自托管或 Kubernetes 模式下设置应用程序配置。

{{< tabpane text=true >}}

 <!-- Self hosted -->
{{% tab "自托管" %}}

在自托管模式下，Dapr 配置是一个[配置文件]({{% ref configuration-schema.md %}})，例如 `config.yaml`。默认情况下，Dapr sidecar 会在默认的 Dapr 文件夹中查找运行时配置：
- Linux/MacOs：`$HOME/.dapr/config.yaml`
- Windows：`%USERPROFILE%\.dapr\config.yaml`

应用程序还可以在 `dapr run` CLI 命令中使用 `--config` 标志指定文件路径，以应用配置。

{{% /tab %}}

 <!-- Kubernetes -->
{{% tab "Kubernetes" %}}

在 Kubernetes 模式下，Dapr 配置是应用到集群中的 Configuration 资源。例如：

```bash
kubectl apply -f myappconfig.yaml
```

你可以使用 Dapr CLI 列出应用程序的 Configuration 资源。

```bash
dapr configurations -k
```

Dapr sidecar 可以通过 `dapr.io/config` 注解应用特定的配置。例如：

```yml
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "nodeapp"
    dapr.io/app-port: "3000"
    dapr.io/config: "myappconfig"
```

> **注意：** 请参阅[所有 Kubernetes 注解]({{% ref "arguments-annotations-overview.md" %}})，了解由 sidecar injector 系统服务在激活时配置 Dapr sidecar 的全部可用注解。

{{% /tab %}}

{{< /tabpane >}}

### 应用程序配置设置

以下菜单列出了你可以设置的所有配置项：

- [追踪](#追踪)
- [指标](#指标)
- [日志记录](#日志记录)
- [中间件](#middleware)
- [name resolution component](#name-resolution-component)
- [Workflow](#workflow)
- [限定 secret store 访问范围](#限定-secret-store-访问范围)
- [building block API 的访问控制允许列表](#building-block-api-的访问控制允许列表)
- [service invocation API 的访问控制允许列表](#service-invocation-api-的访问控制允许列表)
- [禁止使用某些 component 类型](#禁止使用某些-component-类型)
- [启用预览功能](#启用预览功能)
- [sidecar 配置示例](#sidecar-配置示例)
- [使用 SIGHUP 重新加载配置](#使用-sighup-重新加载配置)
- [热重载](#热重载)

#### 追踪

追踪配置用于为应用程序启用追踪。

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

| 属性 | 类型 | 描述 |
|---|---|---|
| `samplingRate` | string | 设置追踪的采样率，用于启用或禁用追踪。
| `stdout` | bool | 设置为 true 时，向追踪中写入更详细的信息
| `otel.endpointAddress` | string | 设置用于发送追踪数据的 OpenTelemetry（OTEL）服务器地址。根据你的 OTEL 提供商，可能需要也可能不需要 https:// 或 http:// 前缀。
| `otel.isSecure` | bool | 到端点地址的连接是否加密
| `otel.protocol` | string | 设置为 `http` 或 `grpc` 协议
| `otel.headers` | array | OTLP 导出器请求中包含的标头。每个条目包含 `name`，以及纯文本 `value` 或用于引用 Kubernetes secret 的 `secretKeyRef`（仅支持 Kubernetes secret，不支持其他类型的 secret）
| `otel.timeout` | string | OTLP 导出器请求的超时时间（例如 `30s`、`5m`）。
| `zipkin.endpointAddress` | string | 设置用于发送追踪数据的 Zipkin 服务器地址。该地址应包含协议（http:// 或 https://）。

##### `samplingRate`

`samplingRate` 用于启用或禁用追踪。`samplingRate` 的有效范围为 `0` 到 `1`（含）。采样率根据该值决定是否对某个追踪跨度进行采样。

`samplingRate : "1"` 会对所有追踪进行采样。默认情况下，采样率为 (0.0001)，即每 10,000 条追踪中采样 1 条。

要禁用采样，请在配置中设置 `samplingRate : "0"`。

##### `otel`

也可以通过环境变量配置 OpenTelemetry（`otel`）端点。存在 `OTEL_EXPORTER_OTLP_ENDPOINT` 环境变量时，会为 sidecar 启用追踪。

| 环境变量 | 描述 |
|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | 设置 OpenTelemetry（OTEL）服务器地址，并启用追踪 |
| `OTEL_EXPORTER_OTLP_INSECURE` | 将到端点的连接设置为未加密（true/false） |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | 传输协议（`grpc`、`http/protobuf`、`http/json`） |
| `OTEL_EXPORTER_OTLP_TRACES_HEADERS` | 以逗号分隔的 `key=value` 标头列表，用于 OTLP 追踪导出器 |
| `OTEL_EXPORTER_OTLP_TRACES_TIMEOUT` | OTLP 追踪导出器的超时时间（毫秒，例如 `30000`） |

更多信息，请参阅 [observability 分布式追踪]({{% ref "tracing-overview.md" %}})。

#### 指标

`Configuration` 规范下的 `metrics` 部分可用于启用或禁用应用程序的指标。

`metrics` 部分包含以下属性：

```yml
metrics:
  enabled: true
  rules: []
  latencyDistributionBuckets: []
  workflow:
    latencyDistributionBuckets: []
    latencyDistributionUnits: 1ms
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

在上面的示例中，路径过滤器 `/orders/{orderID}/items/{itemID}` 会返回_一个指标计数_，它匹配所有 `orderID` 和所有 `itemID`，而不是为每个 `itemID` 分别返回多个指标。更多信息，请参阅 [HTTP 指标路径匹配]({{% ref "metrics-overview.md#http-metrics-path-matching" %}})。

上面的示例还启用了[记录错误代码指标]({{% ref "metrics-overview.md#configuring-metrics-for-error-codes" %}})，该功能默认禁用。

下表列出了指标的属性：

| 属性 | 类型 | 描述 |
|---|---|---|
| `enabled` | boolean | 设置为 true（默认值）时，启用指标收集和指标端点。
| `rules` | array | 命名的过滤规则。每条规则包含用于过滤的 `labels` 集合，以及应用于指标路径的 `regex` 正则表达式。
| `latencyDistributionBuckets` | array | 延迟指标直方图使用的延迟分布桶数组，单位为毫秒。
| `workflow.latencyDistributionBuckets` | array | 可选参数，用于覆盖 workflow 和 activity 执行延迟直方图所使用的延迟分布桶。未设置时，这些直方图使用与 `latencyDistributionBuckets` 相同的桶。只影响 workflow 和 activity 执行延迟；操作延迟和调度延迟仍使用共享的桶。
| `workflow.latencyDistributionUnits` | duration | `workflow.latencyDistributionBuckets` 值所用的单位，为 Go duration 字符串（例如 `1ms` 或 `1s`）。默认为 `1ms`（毫秒）。桶会被换算为毫秒，即直方图记录所用的单位。
| `http.increasedCardinality` | boolean | 设置为 `true`（默认值）时，在 Dapr HTTP 服务器中，每个请求路径都会创建一个新的指标“桶”。当交互的 RESTful API 端点很多时，这可能导致一些问题，包括内存消耗过高。<br> 为减轻 HTTP 服务器上[高基数指标]({{% ref "metrics-overview.md#high-cardinality-metrics" %}})带来的高内存使用和出口成本，应将 `metrics.http.increasedCardinality` 属性设置为 `false`。
| `http.pathMatching` | array | 用于路径匹配的路径数组，允许用户定义匹配路径以管理基数。
| `http.excludeVerbs` | boolean | 设置为 true（默认值为 false）时，Dapr HTTP 服务器在构建方法指标标签时忽略每个请求的 HTTP 动词。

路径匹配还可以进一步帮助管理基数：通过定义的模式匹配指定路径，减少唯一的指标路径数量，从而控制指标基数。此功能对于具有动态 URL 的应用程序尤其有用，可以在不消耗过多内存的情况下，让指标保持有意义且易于管理。

使用 rules，你可以为 Dapr sidecar 暴露的每个指标设置正则表达式。例如：

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

`Configuration` 规范下的 `logging` 部分用于配置 Dapr runtime 中日志记录的工作方式。

`logging` 部分包含以下属性：

```yml
logging:
  apiLogging:
    enabled: false
    obfuscateURLs: false
    omitHealthChecks: false
```

下表列出了日志记录的属性：

| 属性 | 类型 | 描述 |
|---|---|---|
| `apiLogging.enabled` | boolean | `daprd` 的 `--enable-api-logging` 标志（以及对应的 `dapr.io/enable-api-logging` 注解）的默认值。除非为每个 Dapr runtime 传入 `true` 或 `false`，否则使用 Configuration 规范中设置的值作为默认值。默认值：`false`。
| `apiLogging.obfuscateURLs` | boolean | 启用后，HTTP API 日志（如已启用）中的 URL 值会被混淆，记录的是抽象的路由名称，而不是被调用的完整路径，因为完整路径可能包含个人身份信息（PII）。默认值：`false`。
| `apiLogging.omitHealthChecks` | boolean | 如果为 `true`，启用 API 日志记录时，将不记录对健康检查端点（例如 `/v1.0/healthz`）的调用。如果这些调用在日志中产生大量噪音，此选项会很有用。默认值：`false`

更多信息，请参阅[日志记录文档]({{% ref "logs.md" %}})。

#### middleware

middleware 配置用于设置具名的 HTTP 流水线 middleware handler。`Configuration` 规范下的 `httpPipeline` 和 `appHttpPipeline` 部分包含以下属性：

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

下表列出了 HTTP handler 的属性：

| 属性 | 类型 | 描述 |
|---|---|---|
| `name` | string | middleware component 的名称
| `type` | string | middleware component 的类型

更多信息，请参阅 [middleware 流水线]({{% ref "middleware.md" %}})。

#### name resolution component

你可以在配置文件中设置要使用的 name resolution component。例如，要将 `spec.nameResolution.component` 属性设置为 `"sqlite"`，请在 `spec.nameResolution.configuration` 字典中传入配置选项，如下所示。

以下是一个基本的配置资源示例：

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
- [name resolution component 文档]({{% ref supported-name-resolution %}})，其中有更多示例。
- [Configuration 文件文档]({{% ref configuration-schema.md %}})，了解如何为每个 component 配置 name resolution。

#### Workflow

`workflow` 部分包含用于配置 [Workflows]({{% ref "workflow-overview.md" %}}) 的属性。关于这些设置如何相互作用的详细指导，请参阅 [Workflow Concurrency Limits]({{% ref "workflow-concurrency.md" %}})。

| 属性 | 类型 | 描述 |
|---|---|---|
| `maxConcurrentWorkflowInvocations` | int32 | 每个 Dapr sidecar 的最大并发 workflow 执行数。默认为无限制。 |
| `maxConcurrentActivityInvocations` | int32 | 每个 Dapr sidecar 的最大并发 activity 执行数。默认为无限制。 |
| `globalMaxConcurrentWorkflowInvocations` | int32 | 跨所有副本的最大并发 workflow 执行数，由 Scheduler 强制执行。默认为无限制。 |
| `globalMaxConcurrentActivityInvocations` | int32 | 跨所有副本的最大并发 activity 执行数，由 Scheduler 强制执行。默认为无限制。 |
| `workflowConcurrencyLimits` | array | 跨所有副本、按 workflow 名称划分的并发限制。每个条目包含 `name`（字符串）和 `maxConcurrent`（int32）。 |
| `activityConcurrencyLimits` | array | 跨所有副本、按 activity 名称划分的并发限制。每个条目包含 `name`（字符串）和 `maxConcurrent`（int32）。 |

#### 限定 secret store 访问范围

有关如何将 secrets 限定到应用程序的信息和示例，请参阅 [限定 secrets 范围]({{% ref "secret-scope.md" %}})指南。

#### building block API 的访问控制允许列表

有关如何在 building block API 列表上设置访问控制允许列表（ACL）的信息和示例，请参阅[在 Dapr sidecar 上选择性启用 Dapr API]({{% ref "api-allowlist.md" %}})指南。

#### service invocation API 的访问控制允许列表

有关如何为使用 service invocation API 的允许列表设置 ACL 的信息和示例，请参阅 [service invocation 允许列表]({{% ref "invoke-allowlist.md" %}})指南。

#### 禁止使用某些 component 类型

通过 `Configuration` 规范中的 `components.deny` 属性，你可以指定一个拒绝列表，列出不能被初始化的 component 类型。

例如，以下配置禁止初始化 `bindings.smtp` 和 `secretstores.local.file` 类型的组件：

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

你还可以在组件名称末尾添加版本号，以禁止特定版本。例如，`state.in-memory/v1` 会禁止初始化 `state.in-memory` 类型且版本为 `v1` 的组件，但不会禁止该组件的（假设存在的）`v2` 版本。

{{% alert title="注意" color="primary" %}}
 将组件类型 `secretstores.kubernetes` 添加到拒绝列表后，Dapr 会禁止创建 _额外的_ `secretstores.kubernetes` 类型组件。

 但是，它不会禁用内置的 Kubernetes secret store，该组件：
 - 由 Dapr 自动创建
 - 用于存储 component 规范中指定的 secrets
 
 如果要禁用内置的 Kubernetes secret store，需要使用 `dapr.io/disable-builtin-k8s-secret-store` [注解]({{% ref arguments-annotations-overview.md %}})。
{{% /alert %}} 

#### 启用预览功能

有关如何为某个版本选择启用预览功能的信息和示例，请参阅[预览功能]({{% ref "preview-features.md" %}})指南。

启用预览功能可以在开发和测试中使用新的能力，因为这些能力在运行时中正式发布（GA）之前仍需要更多时间。

### sidecar 配置示例

以下 YAML 展示了一个可应用于应用程序 Dapr sidecar 的示例配置文件。

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

#### 使用 SIGHUP 重新加载配置

在兼容 POSIX 的系统（Linux、macOS）上，你可以向 `daprd` 发送 `SIGHUP` 信号，在不完全重启进程的情况下重新加载 Dapr sidecar 配置。`daprd` 收到 `SIGHUP` 后，会优雅地关闭内部运行时，并使用当前配置文件在进程内重新初始化它。这样，你无需完全重启进程，即可应用对[追踪](#追踪)、[指标](#指标)和[日志记录](#日志记录)等配置设置的更改。

要发送 `SIGHUP` 信号，请执行：

```bash
# 使用 kill 命令
kill -SIGHUP <daprd-pid>

# 或使用 pkill
pkill -HUP daprd
```

{{% alert title="注意" color="primary" %}}
在 SIGHUP 重新加载期间，运行时重新初始化时，Dapr sidecar 会短暂不可用。sidecar 会在重新加载前继续处理现有连接的优雅关闭。
{{% /alert %}}

{{% alert title="注意" color="primary" %}}
基于 SIGHUP 的重新加载仅在兼容 POSIX 的系统（Linux、macOS）上可用。在 Windows 上，需要完全重启 `daprd` 才能应用配置更改。
{{% /alert %}}

## Control plane 配置

一个名为 `daprsystem` 的配置文件会随 Dapr control plane 系统服务一起安装，用于应用全局设置。

> **仅当 Dapr 部署到 Kubernetes 时才会设置此配置。**

### Control plane 配置设置

Dapr control plane 配置包含以下部分：

- [`mtls`](#mtls-mutual-tls)，用于 mTLS（双向 TLS）

### mTLS (Mutual TLS)

`mtls` 部分包含 mTLS 的属性。

| 属性 | 类型 | 描述 |
|---|---|---|
| `enabled` | bool | 如果为 true，则启用集群中服务和应用之间通信的 mTLS。
| `allowedClockSkew` | string | 检查 TLS 证书过期时允许的容差，用于容忍时钟偏差。格式遵循 [Go 的 time.ParseDuration](https://pkg.go.dev/time#ParseDuration)。默认为 `15m`（15 分钟）。
| `workloadCertTTL` | string | Dapr 签发的 TLS 证书的有效期。格式遵循 [Go 的 time.ParseDuration](https://pkg.go.dev/time#ParseDuration)。默认为 `24h`（24 小时）。
| `sentryAddress` | string | 用于连接 Sentry 服务器的主机名和端口地址。
| `controlPlaneTrustDomain` | string | control plane 的信任域，用于验证与 control plane 服务的连接。
| `tokenValidators` | array | 用于对证书请求进行身份验证的其他 Sentry token validators。

更多信息，请参阅 [mTLS 操作指南]({{% ref "mtls.md" %}})和[安全概念]({{% ref "security-concept.md" %}})。

### control plane 配置示例

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

## 热重载

系统会自动检测 Configuration 资源的更改，并触发 Dapr sidecar 优雅重启，以应用新配置。如需退出，请在 [Dapr 应用程序配置]({{% ref "configuration-overview.md" %}})中禁用 `HotReload` 功能。

更多信息，请参阅[更新资源]({{% ref "component-updates.md" %}})。

## 后续步骤

{{< button text="了解并发和速率限制" page="control-concurrency.md" >}}
