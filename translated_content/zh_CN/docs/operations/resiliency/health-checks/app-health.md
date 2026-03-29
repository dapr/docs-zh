---
type: docs
title: "App health checks"
linkTitle: "App health checks"
weight: 100
description: 对应用的健康状态变化做出反应
---

应用健康检查功能允许探测应用程序的健康状况并对状态变化做出反应。

应用程序可能因各种原因无响应。例如，您的应用程序：
- 可能过于忙碌而无法接受新工作；
- 可能已崩溃；或
- 可能处于死锁状态。

有时这种情况是暂时的，例如：
- 如果应用只是忙碌，最终会恢复接受新工作
- 如果应用程序因某种原因正在重启，正处于其初始化阶段

应用健康检查默认禁用。启用应用健康检查后，Dapr 运行时（sidecar）会通过 HTTP 或 gRPC 调用定期探测您的应用程序。当它检测到应用程序健康失败时，Dapr 会停止代表应用程序接受新工作，通过以下方式：

- 取消订阅所有发布订阅订阅
- 停止所有输入绑定
- 短路所有服务调用请求，这些请求在 Dapr 运行时终止，不会转发到应用程序
- 注销 Dapr Actor 类型，从而在有其他副本可用时导致 Actor 实例迁移到其他副本

这些更改是临时的，一旦 Dapr 检测到应用程序再次响应，就会恢复正常操作。

<img src="/images/observability-app-health.webp" width="800" alt="Diagram showing the app health feature. Running Dapr with app health enabled causes Dapr to periodically probe the app for its health.">

## 应用健康检查 vs 平台级健康检查

Dapr 中的应用健康检查旨在与平台级健康检查（例如在 Kubernetes 上运行时的 [liveness probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)）互补，而不是替代它们。

平台级健康检查（或 liveness probes）通常确保应用程序正在运行，并在失败时导致平台重启应用程序。

与平台级健康检查不同，Dapr 的应用健康检查专注于暂停向当前无法接受但预期最终能够恢复接受工作的应用程序传递工作。目标包括：

- 不会给已经超载的应用程序带来更多负载。
- 通过在 Dapr 知道应用程序无法处理消息时，不从队列、绑定或发布订阅代理获取消息，来做到"礼貌"的行为。

在这方面，Dapr 的应用健康检查更"温和"，等待应用程序能够处理工作，而不是以"强硬"的方式终止正在运行的进程。

{{% alert title="注意" color="primary" %}}
对于 Kubernetes，失败的应用健康检查不会将 pod 从服务发现中移除：这仍然是 Kubernetes liveness probe 的责任，而不是 Dapr。
{{% /alert %}}

## 配置应用健康检查

应用健康检查默认禁用，但可以通过以下任一方式启用：

- `--enable-app-health-check` CLI 标志；或
- 在 Kubernetes 上运行时的 `dapr.io/enable-app-health-check: true` 注解。

添加此标志是使用默认选项启用应用健康检查的必要且充分条件。

完整的选项列表在下表中列出：

| CLI 标志                     | Kubernetes 部署注解    | 描述 | 默认值 |
| ----------------------------- | ----------------------------------- | ----------- | ------------- |
| `--enable-app-health-check`   | `dapr.io/enable-app-health-check`   | 启用健康检查的布尔值 | 已禁用  |
| [`--app-health-check-path`]({{% ref "app-health.md#health-check-paths" %}})     | `dapr.io/app-health-check-path`     | 当应用通道为 HTTP 时，Dapr 为健康探测调用的路径（如果应用通道使用 gRPC，则忽略此值） | `/healthz` |
| [`--app-health-probe-interval`]({{% ref "app-health.md#intervals-timeouts-and-thresholds" %}}) | `dapr.io/app-health-probe-interval` | 每次健康探测之间的*秒*数 | `5` |
| [`--app-health-probe-timeout`]({{% ref "app-health.md#intervals-timeouts-and-thresholds" %}})  | `dapr.io/app-health-probe-timeout`  | 健康探测请求的超时时间（*毫秒*） | `500` |
| [`--app-health-threshold`]({{% ref "app-health.md#intervals-timeouts-and-thresholds" %}})      | `dapr.io/app-health-threshold`     | 在应用被认为不健康之前的连续失败最大次数 | `3` |

> 有关所有选项及如何启用它们，请参阅 [完整的 Dapr 参数和注解参考]({{% ref arguments-annotations-overview %}})。

此外，应用健康检查受应用通道使用的协议影响，该协议通过以下标志或注解配置：

| CLI 标志                     | Kubernetes 部署注解    | 描述 | 默认值 |
| ----------------------------- | ----------------------------------- | ----------- | ------------- |
| [`--app-protocol`]({{% ref "app-health.md#health-check-paths" %}})   | `dapr.io/app-protocol`   | 应用通道使用的协议。支持的值为 `http`、`grpc`、`https`、`grpcs` 和 `h2c`（HTTP/2 Cleartext）。 | `http`  |

{{% alert title="注意" color="primary" %}}
较低的应用健康探测超时值可能会在应用程序突然承受高负载时将其分类为不健康，导致响应时间下降。如果发生这种情况，请增加 `dapr.io/app-health-probe-timeout` 值。
{{% /alert %}}

### 健康检查路径

#### HTTP
当为 `app-protocol` 使用 HTTP（包括 `http`、`https` 和 `h2c`）时，Dapr 通过向 `app-health-check-path` 中指定的路径（默认为 `/health`）进行 HTTP 调用来执行健康探测。

为了使您的应用被认为健康，响应必须具有 200-299 范围内的 HTTP 状态码。任何其他状态码都被视为失败。Dapr 只关心响应的状态码，并忽略任何响应头或响应体。

#### gRPC
当为应用通道使用 gRPC（`app-protocol` 设置为 `grpc` 或 `grpcs`）时，Dapr 会调用应用程序中的 `/dapr.proto.runtime.v1.AppCallbackHealthCheck/HealthCheck` 方法。最有可能的是，您将使用 Dapr SDK 来实现此方法的处理程序。

在响应健康探测请求时，您的应用程序*可以*决定执行额外的内部健康检查，以确定它是否准备好处理来自 Dapr 运行时的工作。但是，这不是必需的；这是一个取决于您的应用程序需求的选择。

### 间隔、超时和阈值

#### 间隔
默认情况下，启用应用健康检查后，Dapr 每 5 秒探测一次您的应用程序。您可以使用 `app-health-probe-interval` 配置间隔（以秒为单位）。无论您的应用程序是否健康，这些探测都会定期进行。

#### 超时
当 Dapr 运行时（sidecar）最初启动时，Dapr 会等待成功的健康探测后才认为应用健康。这意味着在第一次健康检查完成并成功之前，不会为您的应用程序启用发布订阅订阅、输入绑定和服务调用请求。

如果应用程序在 `app-health-probe-timeout` 中配置的超时时间内发送成功响应（如上所述），则健康探测请求被视为成功。默认值为 500，对应 500 毫秒（半秒）。

#### 阈值
在 Dapr 认为应用进入不健康状态之前，它会等待 `app-health-threshold` 次连续失败，其默认值为 3。此默认值意味着您的应用程序必须*连续* 3 次健康探测失败才会被认为不健康。

如果将阈值设置为 1，任何失败都会导致 Dapr 假设您的应用不健康并停止向其传递工作。

大于 1 的阈值可以帮助排除由于外部情况导致的暂时性失败。适合您的应用程序的值取决于您的需求。

阈值仅适用于失败。单个成功响应足以让 Dapr 认为您的应用健康并恢复正常操作。

## 示例

{{< tabpane text=true >}}

{{% tab "Self-Hosted (CLI)" %}}

使用 CLI 标志和 `dapr run` 命令来启用应用健康检查：

```sh
dapr run \
  --app-id my-app \
  --app-port 7001 \
  --app-protocol http \
  --enable-app-health-check \
  --app-health-check-path=/healthz \
  --app-health-probe-interval 3 \
  --app-health-probe-timeout 200 \
  --app-health-threshold 2 \
  -- \
    <command to execute>
```

{{% /tab %}}

{{% tab "Kubernetes" %}}

要在 Kubernetes 中启用应用健康检查，请将相关注解添加到您的 Deployment 中：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-app"
        dapr.io/app-port: "7001"
        dapr.io/app-protocol: "http"
        dapr.io/enable-app-health-check: "true"
        dapr.io/app-health-check-path: "/healthz"
        dapr.io/app-health-probe-interval: "3"
        dapr.io/app-health-probe-timeout: "200"
        dapr.io/app-health-threshold: "2"
```

{{% /tab %}}

{{< /tabpane >}}

## 演示

观看此视频以了解[使用应用健康检查的概述](https://youtu.be/srczBuOsAkI?t=533)：

{{< youtube id=srczBuOsAkI start=533 >}}
