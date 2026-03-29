---
type: docs
title: "配置指标"
linkTitle: "概述"
weight: 4000
description: "启用或禁用 Dapr 指标"
---

默认情况下，每个 Dapr 系统进程都会发出 Go 运行时/进程指标，并具有各自的 [Dapr 指标](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md)。

## Prometheus 端点

Dapr sidecar 暴露了一个兼容 [Prometheus](https://prometheus.io/) 的指标端点，您可以对其进行抓取以更深入地了解 Dapr 的运行状态。

## 使用 CLI 配置指标

指标应用端点默认启用。您可以通过传递命令行参数 `--enable-metrics=false` 来禁用它。

默认指标端口为 `9090`。您可以通过向 daprd 传递命令行参数 `--metrics-port` 来覆盖此设置。

## 在 Kubernetes 中配置指标

您还可以通过在应用程序部署上设置 `dapr.io/enable-metrics: "false"` 注解来为特定应用程序启用/禁用指标。在禁用指标导出器的情况下，daprd 不会打开指标监听端口。

以下 Kubernetes 部署示例显示了如何显式启用指标并将端口指定为 "9090"。

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

您还可以通过应用程序配置启用指标。要默认禁用 Dapr sidecar 中的指标收集，请将 `spec.metrics.enabled` 设置为 `false`。

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

您可以通过将 `spec.metrics.recordErrorCodes` 设置为 `true` 来为 [Dapr API 错误代码](https://docs.dapr.io/reference/api/error_codes/) 启用其他指标。与调用者通信的 Dapr API 可能返回标准化的错误代码。[记录了一个名为 `error_code_total` 的新指标]({{% ref errors-overview.md %}})，它允许监控由应用程序、代码和类别触发的错误代码。有关特定代码和类别，请参阅 [errorcodes 包](https://github.com/dapr/dapr/blob/master/pkg/messages/errorcodes/errorcodes.go)。

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

在使用 HTTP 调用 Dapr 时，默认会为每个请求的方法创建指标。这可能导致大量指标，即高基数，从而影响内存使用和 CPU。

路径匹配允许您管理和控制 Dapr 中 HTTP 指标的基数。这是指标的聚合，因此您无需为每个事件设置一个指标，而是可以减少指标事件的数量并报告一个总体数字。[了解如何在配置中设置基数]({{% ref "configuration-overview.md#metrics" %}})。

此配置是可选的，通过 Dapr 配置 `spec.metrics.http.pathMatching` 启用。定义后，它启用路径匹配，该匹配会为两个指标路径标准化指定的路径。这减少了唯一指标路径的数量，使指标更易于管理，并以受控方式减少资源消耗。

当 `spec.metrics.http.pathMatching` 与设置为 `false` 的 `increasedCardinality` 标志结合使用时，非匹配路径将转换为 catch-all 存储桶以控制和限制基数，防止无限制的路径增长。相反，当 `increasedCardinality` 为 `true`（默认值）时，非匹配路径照常传递，从而允许可能更高的基数，但保留原始路径数据。

### HTTP 指标中路径匹配的示例

以下示例演示了如何在 Dapr 中使用路径匹配 API 来管理 HTTP 指标。在每个示例中，指标是从 5 个对带有不同订单 ID 的 `/orders` 端点的 HTTP 请求中收集的。通过调整基数并利用路径匹配，您可以微调指标的粒度，以平衡细节和资源效率。

这些示例说明了指标的基数，强调高基数配置会导致许多条目，这对应于处理指标的更高内存使用。为简单起见，以下示例侧重于单个指标：`dapr_http_server_request_count`。

#### 使用路径匹配的低基数（推荐）

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

通过配置低基数和路径匹配，您可以通过为重要端点分组指标来获得两全其美的效果，而不会影响基数。这种方法有助于避免高内存使用和潜在的安全问题。

#### 不使用路径匹配的低基数

配置：

```yaml
http:
  increasedCardinality: false
```
生成的指标：
```
dapr_http_server_request_count{app_id="order-service",method="GET", path="",status="200"} 5
```

在低基数模式下，作为无限制基数的主要来源的路径将被丢弃。这导致指标主要指示对给定 HTTP 方法向服务发出的请求数，但没有任何关于所调用路径的信息。


#### 使用路径匹配的高基数

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

此示例产生与上述示例相同的 HTTP 请求，但为路径 `/orders/{orderID}` 配置了路径匹配。通过使用路径匹配，您可以通过根据匹配的路径对指标进行分组来实现基数降低。

#### 不使用路径匹配的高基数

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

对于每个请求，都会使用请求路径创建一个新指标。此过程继续进行对每个新订单 ID 发出的每个请求，导致无限制的基数，因为 ID 不断增长。


### HTTP 指标排除动词

`excludeVerbs` 选项允许您排除特定 HTTP 动词在指标中报告。这在内存节省至关重要的高性能应用程序中非常有用。

### 在指标中排除 HTTP 动词的示例

以下示例演示了如何在 Darp r 中排除 HTTP 动词以管理 HTTP 指标。

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

在此示例中，HTTP 方法包含在指标中，导致对 `/orders` 端点的每个请求都有单独的指标。

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

在此示例中，HTTP 方法从指标中排除，导致对 `/orders` 端点的所有请求都有单个指标。

## 配置自定义延迟直方图存储桶

Dapr 使用累积直方图指标将延迟值分组到存储桶中，其中每个存储桶包含：
- 具有该延迟的请求数的计数
- 具有较低延迟的所有请求

### 使用默认延迟存储桶配置

默认情况下，Dapr 将请求延迟指标分组到以下存储桶中：

```
1, 2, 3, 4, 5, 6, 8, 10, 13, 16, 20, 25, 30, 40, 50, 65, 80, 100, 130, 160, 200, 250, 300, 400, 500, 650, 800, 1000, 2000, 5000, 10000, 20000, 50000, 100000
```

以累积方式对延迟值进行分组允许根据需要使用或删除存储桶，以增加或减少数据的粒度。
例如，如果请求花费 3ms，它将计入 3ms 存储桶、4ms 存储桶、5ms 存储桶等。
同样，如果请求花费 10ms，它将计入 10ms 存储桶、13ms 存储桶、16ms 存储桶等。
在这两个请求完成后，3ms 存储桶的计数为 1，10ms 存储桶的计数为 2，因为这里包括 3ms 和 10ms 请求。

这显示如下：

|1|2|3|4|5|6|8|10|13|16|20|25|30|40|50|65|80|100|130|160| ..... | 100000 |
|-|-|-|-|-|-|-|--|--|--|--|--|--|--|--|--|--|---|---|---|-------|--------|
|0|0|1|1|1|1|1| 2| 2| 2| 2| 2| 2| 2| 2| 2| 2| 2 | 2 | 2 | ..... | 2      |


默认的存储桶数量适用于大多数用例，但可以根据需要进行调整。每个请求会创建 34 个不同的指标，如果应用程序数量很大，这个值可能会大幅增长。
通过增加存储桶的数量，可以实现更准确的延迟百分位数。但是，存储桶数量越多，用于存储指标的内存就越多，可能会对您的监控系统产生负面影响。

建议将延迟存储桶的数量保持为默认值，除非您在监控系统中看到不必要的内存压力。配置存储桶的数量允许您选择以下应用程序：
- 您希望通过增加存储桶数量来查看更多详细信息
- 通过减少存储桶数量来使用更广泛的值

在配置存储桶数量之前，请注意您的应用程序生成的默认延迟值。
### 根据您的场景自定义延迟存储桶

通过修改应用程序的 [Dapr 配置规范]({{% ref configuration-schema.md %}}) 中的 `spec.metrics.latencyDistributionBuckets` 字段，根据您的需求定制延迟存储桶。

例如，如果您对极低的延迟值（1-10ms）不感兴趣，可以将它们分组到一个 10ms 存储桶中。同样，您可以将高值分组到一个存储桶中（1000-5000ms），同时在您最感兴趣的中间值范围内保留更多详细信息。

以下配置规范示例用 11 个存储桶替换了默认的 34 个存储桶，在中间值范围内提供了更高级别的粒度：

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

## 使用正则表达式转换指标

您可以为 Dapr sidecar 暴露的每个指标设置正则表达式，以"转换"它们的值。[查看所有 Dapr 指标的列表](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md)。

规则的名称必须与要转换的指标的名称匹配。以下示例显示了如何为指标 `dapr_runtime_service_invocation_req_sent_total` 中的标签 `method` 应用正则表达式：

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

应用此配置后，`method` 标签为 `orders/a746dhsk293972nz` 的记录指标将替换为 `orders/`。

使用正则表达式减少指标基数被视为传统方法。我们鼓励所有用户改为将 `spec.metrics.http.increasedCardinality` 设置为 `false`，这样配置更简单，并提供更好的性能。

## 参考

* [操作方法：在本地运行 Prometheus]({{% ref prometheus.md %}})
* [操作方法：为指标设置 Prometheus 和 Grafana]({{% ref grafana.md %}})
