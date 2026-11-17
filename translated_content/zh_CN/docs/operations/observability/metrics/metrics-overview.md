---
type: docs
title: "Configure metrics"
linkTitle: "概述"
weight: 4000
description: "启用或禁用 Dapr 指标"
---

默认情况下，每个 Dapr 系统进程都会发出 Go 运行时/进程指标，并拥有各自的 [Dapr 指标](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md)。

## Prometheus 端点

Dapr sidecar 暴露了一个与 [Prometheus](https://prometheus.io/) 兼容的指标端点，你可以抓取该端点，以更深入地了解 Dapr 的运行状况。

## 使用 CLI 配置指标

默认启用指标应用端点。你可以通过传递命令行参数 `--enable-metrics=false` 将其禁用。

默认指标端口为 `9090`。你可以通过向 daprd 传递命令行参数 `--metrics-port` 来覆盖此设置。

## 在 Kubernetes 中配置指标

你还可以通过在应用部署上设置 `dapr.io/enable-metrics: "false"` 注解，为特定应用启用或禁用指标导出器。禁用指标导出器后，Dapr sidecar 不会打开指标监听端口，仅在内存中记录指标。要完全停止记录指标，请使用 [Configuration 资源](#使用应用程序配置配置指标)将其禁用。

以下 Kubernetes 部署示例展示了如何显式启用指标，并将端口指定为 "9090"。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodeapp
  labels:
    app: node
spec:
  replicas: 1
  selector:
    matchLabels:
      app: node
  template:
    metadata:
      labels:
        app: node
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "nodeapp"
        dapr.io/app-port: "3000"
        dapr.io/enable-metrics: "true"
        dapr.io/metrics-port: "9090"
    spec:
      containers:
      - name: node
        image: dapriosamples/hello-k8s-node:latest
        ports:
        - containerPort: 3000
        imagePullPolicy: Always
```

## 使用应用程序配置配置指标

你还可以通过应用程序配置启用指标。要在 Dapr sidecar 中默认禁用指标收集，请将 `spec.metrics.enabled` 设置为 `false`。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing
  namespace: default
spec:
  metrics:
    enabled: false
```

## 配置错误代码指标

通过将 `spec.metrics.recordErrorCodes` 设置为 `true`，你可以为 [Dapr API 错误代码](https://docs.dapr.io/developing-applications/error-codes/)启用额外的指标。与调用方通信的 Dapr API 可能会返回标准化的错误代码。[系统会记录一个名为 `error_code_total` 的新指标]({{% ref errors-overview.md %}})，用于监控由应用程序、代码和类别触发的错误代码。具体的代码与类别，请参阅 [`errorcodes` 包](https://github.com/dapr/dapr/blob/master/pkg/messages/errorcodes/errorcodes.go)。

配置示例：
```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing
  namespace: default
spec:
  metrics:
    enabled: true
    recordErrorCodes: true
```

指标示例：
```json
{
  "app_id": "publisher-app",
  "category": "state",
  "dapr_io_enabled": "true",
  "error_code": "ERR_STATE_STORE_NOT_CONFIGURED",
  "instance": "10.244.1.64:9090",
  "job": "kubernetes-service-endpoints",
  "namespace": "my-app",
  "node": "my-node",
  "service": "publisher-app-dapr"
}
```

## 使用路径匹配优化 HTTP 指标报告

使用 HTTP 调用 Dapr 时，默认会为每个请求的方法创建指标。这可能会产生大量指标，即高基数（high cardinality），进而影响内存使用和 CPU。

路径匹配允许你管理和控制 Dapr 中 HTTP 指标的基数。这是对指标的聚合，因此你无需为每个事件生成一个指标，而是可以减少指标事件的数量，并报告一个总体数值。[进一步了解如何在配置中设置基数]({{% ref "configuration-overview.md#metrics" %}})。  

此配置是可选的，通过 Dapr 配置 `spec.metrics.http.pathMatching` 启用。定义后，它会启用路径匹配，为两种指标路径标准化指定的路径。这减少了唯一指标路径的数量，使指标更易于管理，并以可控的方式减少资源消耗。  

当 `spec.metrics.http.pathMatching` 与设置为 `false` 的 `increasedCardinality` 标志结合使用时，非匹配路径会被转换为一个兜底存储桶，以控制和限制基数，防止路径无限增长。相反，当 `increasedCardinality` 为 `true`（默认值）时，非匹配路径会照常传递，从而允许可能更高的基数，但保留原始路径数据。 

### HTTP 指标中路径匹配的示例

以下示例演示了如何在 Dapr 中使用路径匹配 API 管理 HTTP 指标。每个示例中，指标都是从 5 个发往 `/orders` 端点、订单 ID 各不相同的 HTTP 请求中收集的。通过调整基数并使用路径匹配，你可以微调指标粒度，在细节与资源效率之间取得平衡。

这些示例说明了指标的基数：高基数配置会产生大量条目，相应地处理指标时占用的内存也更多。为简单起见，以下示例只关注一个指标：`dapr_http_server_request_count`。

#### 低基数并使用路径匹配（推荐）

配置：
```yaml
http:
  increasedCardinality: false
  pathMatching:
    - /orders/{orderID}
```

生成的指标：
```
# 匹配的路径
dapr_http_server_request_count{app_id="order-service",method="GET",path="/orders/{orderID}",status="200"} 5
# 未匹配的路径
dapr_http_server_request_count{app_id="order-service",method="GET",path="",status="200"} 1
```

在低基数并配置路径匹配的情况下，你可以为重要端点分组指标，既兼顾了两者的优点，又不影响基数。这种方法有助于避免内存占用过高以及潜在的安全问题。

#### 低基数且不使用路径匹配

配置：

```yaml
http:
  increasedCardinality: false
```
生成的指标：
```
dapr_http_server_request_count{app_id="order-service",method="GET", path="",status="200"} 5
```

在低基数模式下，作为无限制基数主要来源的路径会被丢弃。这样得到的指标主要反映服务在给定 HTTP 方法下收到的请求数量，但不包含所调用路径的任何信息。


#### 高基数并使用路径匹配

配置：
```yaml
http:
  increasedCardinality: true
  pathMatching:
    - /orders/{orderID}
```

生成的指标：
```
dapr_http_server_request_count{app_id="order-service",method="GET",path="/orders/{orderID}",status="200"} 5
```

此示例使用与上述示例相同的 HTTP 请求，但为路径 `/orders/{orderID}` 配置了路径匹配。通过使用路径匹配，并依据匹配到的路径对指标进行分组，你可以降低基数。

#### 高基数且不使用路径匹配

配置：
```yaml
http:
  increasedCardinality: true
```

生成的指标：
```
dapr_http_server_request_count{app_id="order-service",method="GET",path="/orders/1",status="200"} 1
dapr_http_server_request_count{app_id="order-service",method="GET",path="/orders/2",status="200"} 1
dapr_http_server_request_count{app_id="order-service",method="GET",path="/orders/3",status="200"} 1
dapr_http_server_request_count{app_id="order-service",method="GET",path="/orders/4",status="200"} 1
dapr_http_server_request_count{app_id="order-service",method="GET",path="/orders/5",status="200"} 1
```

对于每个请求，都会以请求路径创建一个新指标。每个新订单 ID 的请求都会重复这一过程。由于 ID 不断增长，基数也会无限制地增长。


### HTTP 指标排除动词

`excludeVerbs` 选项允许你在指标中排除特定的 HTTP 动词，使其不被报告。这在对内存节省要求严格的高性能应用中非常有用。

### 在指标中排除 HTTP 动词的示例

以下示例演示了如何在 Dapr 中排除 HTTP 动词，以管理 HTTP 指标。

#### 默认 - 包含 HTTP 动词

配置：
```yaml
http:
  excludeVerbs: false
```

生成的指标：
```
dapr_http_server_request_count{app_id="order-service",method="GET",path="/orders",status="200"} 1
dapr_http_server_request_count{app_id="order-service",method="POST",path="/orders",status="200"} 1
```

在此示例中，HTTP 方法包含在指标中，因此对 `/orders` 端点的每个请求都会生成一个单独的指标。

#### 排除 HTTP 动词

配置：
```yaml
http:
  excludeVerbs: true
```

生成的指标：
```
dapr_http_server_request_count{app_id="order-service",method="",path="/orders",status="200"} 2
```

在此示例中，HTTP 方法不包含在指标中，因此对 `/orders` 端点的所有请求只会生成一个指标。

## 配置自定义延迟直方图存储桶

Dapr 使用累积直方图指标，将延迟值分组到存储桶中，每个存储桶包含：
- 具有该延迟的请求数量
- 所有延迟更低的请求

### 使用默认延迟存储桶配置

默认情况下，Dapr 将请求延迟指标分组到以下存储桶中：

```
1, 2, 3, 4, 5, 6, 8, 10, 13, 16, 20, 25, 30, 40, 50, 65, 80, 100, 130, 160, 200, 250, 300, 400, 500, 650, 800, 1000, 2000, 5000, 10000, 20000, 50000, 100000
```

以累积方式对延迟值进行分组，可以根据需要使用或舍弃存储桶，从而提高或降低数据的粒度。
例如，如果一个请求耗时 3ms，它会计入 3ms 存储桶、4ms 存储桶、5ms 存储桶，依此类推。
同样，如果一个请求耗时 10ms，它会计入 10ms 存储桶、13ms 存储桶、16ms 存储桶，依此类推。
这两个请求完成后，3ms 存储桶的计数为 1，10ms 存储桶的计数为 2，因为 3ms 和 10ms 的请求都计入其中。

这显示如下：

|1|2|3|4|5|6|8|10|13|16|20|25|30|40|50|65|80|100|130|160| ..... | 100000 |
|-|-|-|-|-|-|-|--|--|--|--|--|--|--|--|--|--|---|---|---|-------|--------|
|0|0|1|1|1|1|1| 2| 2| 2| 2| 2| 2| 2| 2| 2| 2| 2 | 2 | 2 | ..... | 2      |


默认的存储桶数量适用于大多数场景，但可以按需调整。每个请求会创建 34 个不同的指标，因此对于应用数量众多的场景，这个数值可能会大幅增长。
增加存储桶数量可以获得更精确的延迟百分位数。但是，存储桶数量越多，存储指标所需的内存就越多，可能会对你的监控系统产生负面影响。

除非你在监控系统中遇到了不必要的内存压力，否则建议保持延迟存储桶的默认数量。配置存储桶数量可以帮助你为以下情况选择合适的应用：
- 你希望通过更多存储桶看到更多细节
- 通过减少存储桶即可满足更宽泛的数值需求

在配置存储桶数量之前，请先留意应用所产生的默认延迟值。
### 根据场景自定义延迟存储桶

通过修改应用程序的 [Dapr 配置规范]({{% ref configuration-schema.md %}}) 中的 `spec.metrics.latencyDistributionBuckets` 字段，可以根据你的需求定制延迟存储桶。

例如，如果你对极低的延迟值（1-10ms）不感兴趣，可以将它们归入一个 10ms 存储桶。同样，你也可以将高延迟值归入一个存储桶（1000-5000ms），同时在你最关心的中间区间保留更多细节。

以下 Configuration 规范示例用 11 个存储桶替换默认的 34 个存储桶，在中间区间提供了更高的粒度：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: custom-metrics
spec:
    metrics:
        enabled: true
        latencyDistributionBuckets: [10, 25, 40, 50, 70, 100, 150, 200, 500, 1000, 5000]
```

### 自定义 workflow 延迟存储桶

workflow 和 activity 的*执行*延迟（即 workflow 或 activity 运行至完成所需的时间）通常比服务、gRPC、HTTP 或 component 请求延迟的范围宽得多。workflow 可能在毫秒内完成，也可能运行数小时，因此默认延迟存储桶的上限为 100 秒，可能无法提供有用的粒度。

使用 `spec.metrics.workflow.latencyDistributionBuckets` 字段，可以专门为 workflow 和 activity 执行延迟直方图（`dapr_runtime_workflow_execution_latency` 和 `dapr_runtime_workflow_activity_execution_latency`）设置存储桶。该字段是可选的覆盖项：未设置时，这些直方图使用与 `spec.metrics.latencyDistributionBuckets` 相同的存储桶。只有执行延迟会受到影响；workflow 和 activity 的操作延迟以及调度延迟仍使用共享存储桶。

由于这些直方图以毫秒为单位记录，而 workflow 的持续时间用秒或分钟表示更为自然，因此你可以将 `spec.metrics.workflow.latencyDistributionUnits` 设置为存储桶所用的单位，值为 Go 持续时间字符串（例如 `1s`）。默认值为 `1ms`（毫秒）。构建直方图时，存储桶会被换算为毫秒。

以下 Configuration 规范示例以秒为单位为 workflow 和 activity 执行延迟设置存储桶，范围从 1 秒到 1 小时：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: custom-metrics
spec:
    metrics:
        enabled: true
        workflow:
            latencyDistributionBuckets: [1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600]
            latencyDistributionUnits: 1s
```

### workflow 快速路径指标

启用 [`WorkflowsFastPath` 预览功能]({{% ref "workflow-fast-path.md" %}})后，sidecar 还会额外暴露 `dapr_runtime_workflow_local_wake_count`、`dapr_runtime_workflow_local_wake_drive_latency`、`dapr_runtime_workflow_local_activity_count`、`dapr_runtime_workflow_local_activity_drive_latency`、`dapr_runtime_workflow_completions_fold_count`、`dapr_runtime_workflow_completions_fold_wait_latency` 和 `dapr_runtime_workflow_lock_wait`。驱动延迟和等待延迟直方图使用共享的 `spec.metrics.latencyDistributionBuckets`，而不是上面的 workflow 执行存储桶。请参阅[快速路径指标表和建议告警]({{% ref "workflow-fast-path.md#metrics" %}})。

## 使用正则表达式转换指标

你可以为 Dapr sidecar 暴露的每个指标设置正则表达式，以“转换”其值。[查看所有 Dapr 指标的列表](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md)。

规则的名称必须与被转换的指标名称一致。以下示例展示了如何为指标 `dapr_runtime_service_invocation_req_sent_total` 中的标签 `method` 应用正则表达式：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprConfig
spec:
  metrics:
    enabled: true
    http:
      increasedCardinality: true
    rules:
      - name: dapr_runtime_service_invocation_req_sent_total
        labels:
        - name: method
          regex:
            "orders/": "orders/.+"
```

应用此配置后，标签 `method` 为 `orders/a746dhsk293972nz` 的已记录指标会被替换为 `orders/`。

使用正则表达式降低指标基数的做法已属于旧方式。我们建议所有用户改为将 `spec.metrics.http.increasedCardinality` 设置为 `false`，这种方式配置更简单，性能也更好。

## 参考

* [操作方法：在本地运行 Prometheus]({{% ref prometheus.md %}})
* [操作方法：为指标设置 Prometheus 和 Grafana]({{% ref grafana.md %}})
