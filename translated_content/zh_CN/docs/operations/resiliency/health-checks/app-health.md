---
type: docs
title: "应用健康检查"
linkTitle: "应用健康检查"
weight: 100
description: 对应用的健康状态变化做出反应
---

应用健康检查功能允许探测应用程序的健康状况，并对状态变化做出反应。

应用程序可能因多种原因而无响应。例如，你的应用程序：
- 可能过于忙碌，无法接受新工作；
- 可能已崩溃；或
- 可能处于死锁状态。

有时这种情况是暂时的，例如：
- 如果应用只是忙碌，最终会恢复接受新工作
- 如果应用因某种原因正在重启，并处于其初始化阶段

应用健康检查默认禁用。启用应用健康检查后，Dapr runtime（sidecar）会通过 HTTP 或 gRPC 调用定期探测你的应用程序。当它检测到应用的健康状况失败时，Dapr 会通过以下方式停止代表该应用接受新工作：

- 取消订阅所有 pub/sub
- 停止所有 input binding
- 短路所有 service invocation 请求，这些请求在 Dapr runtime 终止，不会转发到应用程序
- 注销 Dapr Actor 类型，从而在有其他可用副本时，使 Actor 实例迁移到其他副本

这些更改是临时的，一旦 Dapr 检测到应用程序再次响应，就会恢复正常操作。

{{< diagram name="app-health" width="85" >}}

## 应用健康检查 vs 平台级健康检查

Dapr 中的应用健康检查旨在与平台级健康检查互补，而不是取代它们，例如在 Kubernetes 上运行时的 [liveness probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)。

平台级健康检查（或 liveness probes）通常确保应用程序正在运行，并在失败时促使平台重启应用程序。  

与平台级健康检查不同，Dapr 的应用健康检查专注于暂停向当前无法接受工作、但预期最终能够恢复接受工作的应用程序传递工作。目标包括：

- 不为已经超载的应用程序带来更多负载。
- 当 Dapr 知道应用程序无法处理消息时，不从队列、binding 或 pub/sub broker 获取消息，做到“礼貌”的行为。

在这方面，Dapr 的应用健康检查更“温和”，它会等待应用程序能够处理工作，而不是以“强硬”的方式终止正在运行的进程。

{{% alert title="注意" color="primary" %}}
对于 Kubernetes，失败的应用健康检查不会将 pod 从服务发现中移除：这仍然是 Kubernetes liveness probe 的责任，_而不是_ Dapr 的责任。
{{% /alert %}}

## 配置应用健康检查

应用健康检查默认禁用，但可以通过以下任一方式启用：

- `--enable-app-health-check` CLI 标志；或
- 在 Kubernetes 上运行时，使用 `dapr.io/enable-app-health-check: true` 注解。

添加此标志是使用默认选项启用应用健康检查的必要且充分条件。

完整的选项列表见下表：

| CLI 标志                     | Kubernetes 部署注解    | 描述 | 默认值 |
| ----------------------------- | ----------------------------------- | ----------- | ------------- |
| `--enable-app-health-check`   | `dapr.io/enable-app-health-check`   | 启用健康检查的布尔值 | 已禁用  |
| [`--app-health-check-path`]({{% ref "app-health.md#health-check-paths" %}})     | `dapr.io/app-health-check-path`     | 当 app channel 为 HTTP 时，Dapr 为 health probe 调用的路径（如果 app channel 使用 gRPC，则忽略此值） | `/healthz` |
| [`--app-health-probe-interval`]({{% ref "app-health.md#intervals-timeouts-and-thresholds" %}}) | `dapr.io/app-health-probe-interval` | 每次 health probe 之间的*秒*数 | `5` |
| [`--app-health-probe-timeout`]({{% ref "app-health.md#intervals-timeouts-and-thresholds" %}})  | `dapr.io/app-health-probe-timeout`  | health probe 请求的超时时间，单位为*毫秒* | `500` |
| [`--app-health-threshold`]({{% ref "app-health.md#intervals-timeouts-and-thresholds" %}})      | `dapr.io/app-health-threshold`     | 应用被视为不健康之前允许的最大连续失败次数 | `3` |

> 有关所有选项及其启用方式，请参阅[完整的 Dapr 参数和注解参考]({{% ref arguments-annotations-overview %}})。

此外，应用健康检查还受 app channel 所用协议的影响，该协议通过以下标志或注解进行配置：

| CLI 标志                     | Kubernetes 部署注解    | 描述 | 默认值 |
| ----------------------------- | ----------------------------------- | ----------- | ------------- |
| [`--app-protocol`]({{% ref "app-health.md#health-check-paths" %}})   | `dapr.io/app-protocol`   | app channel 所用的协议。支持的值为 `http`、`grpc`、`https`、`grpcs` 和 `h2c`（HTTP/2 Cleartext）。 | `http`  |

{{% alert title="注意" color="primary" %}}
如果应用程序突然承受高负载导致响应时间下降，较低的应用 health probe 超时值可能会将其判定为不健康。如果发生这种情况，请增大 `dapr.io/app-health-probe-timeout` 的值。
{{% /alert %}}

### 健康检查路径

#### HTTP
当 `app-protocol` 使用 HTTP（包括 `http`、`https` 和 `h2c`）时，Dapr 会向 `app-health-check-path` 中指定的路径（默认为 `/health`）发起 HTTP 调用来执行 health probe。

要使应用被视为健康，响应必须具有 200-299 范围内的 HTTP 状态码。任何其他状态码都会被视为失败。Dapr 只关心响应的状态码，并忽略任何响应头或响应体。

#### gRPC
当 app channel 使用 gRPC（`app-protocol` 设置为 `grpc` 或 `grpcs`）时，Dapr 会在你的应用程序中调用 `/dapr.proto.runtime.v1.AppCallbackHealthCheck/HealthCheck` 方法。你很可能会使用 Dapr SDK 来实现该方法的处理程序。

在响应 health probe 请求时，你的应用程序*可以*执行额外的内部健康检查，以确定它是否已准备好处理来自 Dapr runtime 的工作。但这并非必需，而是取决于应用程序需求的选择。

### 间隔、超时和阈值

#### 间隔
默认情况下，启用应用健康检查后，Dapr 每 5 秒探测一次你的应用程序。你可以使用 `app-health-probe-interval` 以秒为单位配置间隔。无论你的应用程序是否健康，这些探测都会定期进行。

#### 超时
Dapr runtime（sidecar）首次启动时，Dapr 会等待一次成功的 health probe，然后才认为应用健康。这意味着在首次健康检查完成并成功之前，不会为你的应用程序启用 pub/sub、input binding 和 service invocation 请求。

如果应用程序在 `app-health-probe-timeout` 配置的超时时间内发送了成功响应（如上所述），则health probe 请求被视为成功。默认值为 500，即 500 毫秒（半秒）。

#### 阈值
在 Dapr 认为应用进入不健康状态之前，它会等待 `app-health-threshold` 次连续失败，默认值为 3。这意味着你的应用程序必须*连续*失败 3 次 health probe，才会被视为不健康。

如果将阈值设为 1，任何一次失败都会使 Dapr 认为你的应用不健康，并停止向其传递工作。

大于 1 的阈值有助于排除由外部情况导致的临时性失败。适合你的应用程序的值取决于你的需求。

阈值只作用于失败。单个成功响应就足以让 Dapr 认为你的应用健康，并恢复正常操作。

## 示例

{{< tabpane text=true >}}

{{% tab "自托管（CLI）" %}}

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

要在 Kubernetes 中启用应用健康检查，请将相关注解添加到你的 Deployment 中：

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

观看此视频，了解[应用健康检查的使用概览](https://youtu.be/srczBuOsAkI?t=533)：

{{< youtube id=srczBuOsAkI start=533 >}}
