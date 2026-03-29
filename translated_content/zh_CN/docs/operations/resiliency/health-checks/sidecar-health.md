---
type: docs
title: "边车健康"
linkTitle: "边车健康"
weight: 200
description: Dapr 边车健康检查
---

Dapr 提供了一种使用 [HTTP `/healthz` 端点]({{% ref health_api.md %}})来确定其健康状况的方法。通过该端点，*daprd* 进程或边车可以：

- 探测其整体健康状况
- 从基础设施平台探测 Dapr 边车就绪状态
- 在 Kubernetes 中确定就绪状态和存活状态

在本指南中，您将了解 Dapr `/healthz` 端点如何与应用程序托管平台（例如 Kubernetes）的健康探针以及 Dapr SDK 集成。

{{% alert title="重要" color="warning" %}}
**不要在应用程序代码中依赖 `/healthz` 端点**。让应用程序依赖 `/healthz` 端点在某些情况下会失败（例如使用 Actor 和工作流 API 的应用程序），而在其他情况下则被认为是不良实践，因为它会产生循环依赖。`/healthz` 端点旨在用于基础设施健康检查（如 Kubernetes 探针），而不是用于应用程序级别的健康验证。
{{% /alert %}}

{{% alert title="注意" color="primary" %}}
Dapr actors 也有一个健康 API 端点，Dapr 通过该端点探测应用程序对来自 Dapr 的信号的响应，以确认 actor 应用程序是否健康且正在运行。请参阅 [actor health API]({{% ref "actors_api.md#health-check" %}})。
{{% /alert %}}

下图展示了 Dapr 边车启动时的步骤、healthz 端点以及应用程序通道何时初始化。

<img src="/images/healthz-outbound.png" width="800" alt="Diagram of Dapr checking oubound health connections." />

## 出站健康端点

如上图红色边界线所示，`v1.0/healthz/` 端点用于等待以下条件：
- 所有组件已初始化；
- Dapr HTTP 端口可用；_以及_
- 应用程序通道已初始化。 

这用于检查 Dapr 边车的完整初始化及其健康状况。 

设置 `DAPR_HEALTH_TIMEOUT` 环境变量可以让您控制健康超时，例如，这在具有更高延迟的不同环境中可能很重要。

另一方面，如上图绿色边界线所示，当满足以下条件时，`v1.0/healthz/outbound` 端点会成功返回：
- 所有组件已初始化；
- Dapr HTTP 端口可用；_但_ 
- 应用程序通道尚未建立。 

在 Dapr SDK 中，`waitForSidecar` 方法（取决于[您使用的 SDK]({{% ref "#sdks-supporting-outbound-health-endpoint" %}})）用于使用 `v1.0/healthz/outbound` 端点进行此特定检查。使用此行为，Dapr 等待来自 `v1.0/healthz/outbound` 的成功响应，而不是等待应用程序通道可用（参见：红色边界线）与 `v1.0/healthz/` 端点。这种方法使您的应用程序能够在应用程序通道初始化之前对 Dapr 边车 API 执行调用——例如，使用 secrets API 读取机密。

如果您在 SDK 上使用 `waitForSidecar` 方法，则会执行正确的初始化。否则，您可以在初始化期间调用 `v1.0/healthz/outbound` 端点，如果成功，您可以调用 Dapr 边车 API。

### 支持出站健康端点的 SDK
目前，`v1.0/healthz/outbound` 端点在以下 SDK 中受支持：
- [.NET SDK]({{% ref "dotnet-client.md#wait-for-sidecar" %}})
- [Java SDK]({{% ref "java-client.md#wait-for-sidecar" %}})
- [Python SDK]({{% ref "python-client.md#health-timeout" %}})


## 健康端点：与 Kubernetes 集成
将 Dapr 部署到 Kubernetes 等托管平台时，Dapr 健康端点会自动为您配置。

Kubernetes 使用*就绪*探针和*存活*探针来确定容器的健康状况。

### 存活探针
kubelet 使用存活探针来了解何时重启容器。例如，存活探针可以检测死锁（正在运行但无法继续推进的应用程序）。在这种情况下重启容器可以帮助使应用程序更加可用，尽管存在错误。

#### 如何在 Kubernetes 中配置存活探针

在 Pod 配置文件中，存活探针添加在容器规范部分，如下所示：

```yaml
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 3
      periodSeconds: 3
```

在上面的示例中，`periodSeconds` 字段指定 kubelet 应每 3 秒执行一次存活探针。`initialDelaySeconds` 字段告诉 kubelet 在执行第一次探针之前应等待 3 秒。要执行探针，kubelet 向容器中运行并监听端口 8080 的服务器发送 HTTP GET 请求。如果服务器的 `/healthz` 路径的处理程序返回成功代码，则 kubelet 认为容器是存活和健康的。如果处理程序返回失败代码，则 kubelet 会终止容器并重新启动它。

200 到 399 之间的任何 HTTP 状态码表示成功；任何其他状态码表示失败。

### 就绪探针
kubelet 使用就绪探针来了解容器何时准备好开始接受流量。当 Pod 的所有容器都准备好时，该 Pod 被视为就绪。此就绪信号的一个用途是控制哪些 Pod 用作 Kubernetes 服务的后端。当 Pod 未就绪时，它会从 Kubernetes 服务负载均衡器中移除。

{{% alert title="注意" color="primary" %}}
一旦应用程序可在其配置的端口上访问，Dapr 边车将处于就绪状态。应用程序在应用程序启动/初始化期间无法访问 Dapr 组件。
{{% /alert %}}

#### 如何在 Kubernetes 中配置就绪探针

就绪探针的配置方式与存活探针类似。唯一的区别是您使用 `readinessProbe` 字段而不是 `livenessProbe` 字段：

```yaml
    readinessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 3
      periodSeconds: 3
```

### 边车注入器

在与 Kubernetes 集成时，Dapr 边车会注入一个 Kubernetes 探针配置，告诉它使用 Dapr `healthz` 端点。这是由"边车注入器"系统服务完成的。与 kubelet 的集成如下图所示。

<img src="/images/security-mTLS-dapr-system-services.png" width="800" alt="Diagram of Dapr services interacting" />

#### 如何使用 Kubernetes 配置 Dapr 边车健康端点

如上所述，此配置由边车注入器服务自动完成。本节描述了在存活探针和就绪探针上设置的具体值。

Dapr 在端口 3500 上有其 HTTP 健康端点 `/v1.0/healthz`。这可以与 Kubernetes 一起用于就绪和存活探针。当注入 Dapr 边车时，就绪探针和存活探针在 Pod 配置文件中使用以下值进行配置：

```yaml
    livenessProbe:
      httpGet:
        path: v1.0/healthz
        port: 3500
      initialDelaySeconds: 5
      periodSeconds: 10
      timeoutSeconds : 5
      failureThreshold : 3
    readinessProbe:
      httpGet:
        path: v1.0/healthz
        port: 3500
      initialDelaySeconds: 5
      periodSeconds: 10
      timeoutSeconds : 5
      failureThreshold: 3
```

## 延迟优雅关闭

Dapr 接受 [`dapr.io/block-shutdown-duration` 注解或 `--dapr-block-shutdown-duration` CLI 标志]({{% ref arguments-annotations-overview.md %}})，这会将完整的关闭过程延迟指定的持续时间，或直到应用程序报告不健康，以先发生者为准。

在此期间，所有订阅和输入绑定都会关闭。这对于需要在关闭过程中使用 Dapr API 的应用程序很有用。

适用的注解或 CLI 标志包括：

- `--dapr-graceful-shutdown-seconds`/`dapr.io/graceful-shutdown-seconds`
- `--dapr-block-shutdown-duration`/`dapr.io/block-shutdown-duration`
- `--dapr-graceful-shutdown-seconds`/`dapr.io/graceful-shutdown-seconds`
- `--dapr-block-shutdown-duration`/`dapr.io/block-shutdown-duration`

在[注解和参数指南]({{% ref arguments-annotations-overview.md %}})中了解更多信息以及如何使用它们。

## 相关链接

- [Endpoint health API]({{% ref health_api.md %}})
- [Actor health API]({{% ref "actors_api.md#health-check" %}})
- [Kubernetes probe configuration parameters](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
