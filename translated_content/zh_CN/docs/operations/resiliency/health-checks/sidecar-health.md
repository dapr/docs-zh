---
type: docs
title: "sidecar 健康"
linkTitle: "sidecar 健康"
weight: 200
description: Dapr sidecar 健康检查
---

Dapr 提供了一种使用 [HTTP `/healthz` 端点]({{% ref health_api.md %}})来确定其健康状况的方法。通过该端点，*daprd* 进程或 sidecar 可以：

- 探测其整体健康状况
- 从基础设施平台探测 Dapr sidecar 的就绪状态
- 在 Kubernetes 中确定就绪状态和存活状态

在本指南中，你将了解 Dapr `/healthz` 端点如何与应用程序 hosting platform（例如 Kubernetes）的 health probe 以及 Dapr SDK 集成。

{{% alert title="重要" color="warning" %}}
**不要在应用程序代码中依赖 `/healthz` 端点**。让应用程序依赖 `/healthz` 端点在某些情况下会失败（例如使用 Actor 和 Workflow API 的应用程序），而在其他情况下则被视为不良实践，因为它会产生循环依赖。`/healthz` 端点旨在用于基础设施健康检查（如 Kubernetes 探针），而不是用于应用程序级别的健康验证。
{{% /alert %}}

{{% alert title="注意" color="primary" %}}
Dapr Actor 也有一个健康 API 端点，Dapr 通过该端点探测应用程序对来自 Dapr 的信号的响应，以确认 Actor 应用程序是否健康且正在运行。请参阅 [Actor 健康 API]({{% ref "actors_api.md#health-check" %}})。
{{% /alert %}}

下图展示了 Dapr sidecar 启动时的步骤、healthz 端点以及 app channel 何时初始化。

<img src="/images/healthz-outbound.png" width="800" alt="Dapr 检查出站健康连接的示意图。" />

## 出站健康端点

如上图红色边界线所示，`v1.0/healthz/` 端点用于等待以下条件：
- 所有 component 已初始化；
- Dapr HTTP 端口可用；_以及_
- app channel 已初始化。

这用于检查 Dapr sidecar 的完整初始化及其健康状况。

设置 `DAPR_HEALTH_TIMEOUT` 环境变量可以让你控制健康检查超时时间，这在延迟较高的不同环境中可能尤为重要。

另一方面，如上图绿色边界线所示，当满足以下条件时，`v1.0/healthz/outbound` 端点会成功返回：
- 所有 component 已初始化；
- Dapr HTTP 端口可用；_但_
- app channel 尚未建立。

在 Dapr SDK 中，`waitForSidecar` 方法（取决于[你使用的 SDK]({{% ref "#支持出站健康端点的-sdk" %}})）会使用 `v1.0/healthz/outbound` 端点执行此特定检查。采用这种行为时，Dapr 不再等待 app channel 可用（参见：红色边界线）后再通过 `v1.0/healthz/` 端点返回结果，而是等待 `v1.0/healthz/outbound` 返回成功响应。这种方式使你的应用程序能够在 app channel 初始化之前调用 Dapr sidecar API，例如使用 secrets API 读取 secrets。

如果你在 SDK 中使用 `waitForSidecar` 方法，则会完成正确的初始化。否则，你可以在初始化期间调用 `v1.0/healthz/outbound` 端点，如果调用成功，就可以调用 Dapr sidecar API。

### 支持出站健康端点的 SDK

目前，以下 SDK 支持 `v1.0/healthz/outbound` 端点：
- [.NET SDK]({{% ref "dotnet-client.md#wait-for-sidecar" %}})
- [Java SDK]({{% ref "java-client.md#wait-for-sidecar" %}})
- [Python SDK]({{% ref "python-client.md#health-timeout" %}})

## 健康端点：与 Kubernetes 集成

将 Dapr 部署到 Kubernetes 等 hosting platform 时，Dapr 健康端点会自动为你配置。

Kubernetes 使用*就绪*探针和*存活*探针来确定容器的健康状况。

### 存活探针

kubelet 使用存活探针来判断何时重启容器。例如，存活探针可以检测死锁（即应用程序仍在运行，但无法继续推进）。在这种状态下重启容器，有助于在存在缺陷的情况下提高应用程序的可用性。

#### 如何在 Kubernetes 中配置存活探针

在 Pod 配置文件的 containers 规范部分中添加存活探针，如下所示：

```yaml
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 180
      periodSeconds: 10
```

在上面的示例中，`periodSeconds` 字段指定 kubelet 每 10 秒执行一次存活探针。`initialDelaySeconds` 字段告诉 kubelet 在执行第一次探针前等待 180 秒。执行探针时，kubelet 会向容器中运行并监听 8080 端口的服务器发送 HTTP GET 请求。如果服务器对 `/healthz` 路径的 handler 返回成功状态码，kubelet 即认为容器存活且健康。如果 handler 返回失败状态码，kubelet 会终止该容器并将其重启。

任何介于 200 到 399 之间的 HTTP 状态码均表示成功；其他任何状态码均表示失败。

### 就绪探针

kubelet 使用就绪探针来判断容器何时准备好接收流量。当 Pod 中的所有容器都已就绪时，该 Pod 即被视为就绪。就绪信号的一个用途是控制哪些 Pod 用作 Kubernetes 服务的后端。当 Pod 未就绪时，它会被从 Kubernetes 服务负载均衡器中移除。

{{% alert title="注意" color="primary" %}}
一旦应用程序可通过其配置的端口访问，Dapr sidecar 即处于就绪状态。应用程序在启动/初始化期间无法访问 Dapr component。
{{% /alert %}}

#### 如何在 Kubernetes 中配置就绪探针

就绪探针的配置方式与存活探针类似。唯一的区别是使用 `readinessProbe` 字段，而不是 `livenessProbe` 字段：

```yaml
    readinessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 1
      periodSeconds: 1
```

### sidecar injector

在与 Kubernetes 集成时，Dapr sidecar 会被注入一个 Kubernetes 探针配置，告诉它使用 Dapr `healthz` 端点。这项工作由“sidecar injector”系统服务完成。与 kubelet 的集成方式如下图所示。

<img src="/images/security-mTLS-dapr-system-services.png" width="800" alt="Dapr 服务相互交互的示意图" />

#### 如何使用 Kubernetes 配置 Dapr sidecar 健康端点

如上所述，此配置由 sidecar injector 服务自动完成。本节介绍在存活探针和就绪探针上设置的具体值。

Dapr 在端口 3500 上提供其 HTTP 健康端点 `/v1.0/healthz`。该端点可与 Kubernetes 配合用于就绪探针和存活探针。注入 Dapr sidecar 后，就绪探针和存活探针会在 Pod 配置文件中配置为以下值：

```yaml
    livenessProbe:
      httpGet:
        path: /v1.0/healthz
        port: 3500
      initialDelaySeconds: 180
      periodSeconds: 10
      timeoutSeconds: 3
      failureThreshold: 5
    readinessProbe:
      httpGet:
        path: /v1.0/healthz
        port: 3500
      initialDelaySeconds: 1
      periodSeconds: 1
      timeoutSeconds: 1
      failureThreshold: 5
```

## 延迟优雅关闭

Dapr 接受 [`dapr.io/block-shutdown-duration` 注解或 `--dapr-block-shutdown-duration` CLI 标志]({{% ref arguments-annotations-overview.md %}})，它会将完整的关闭流程延迟指定时长，或延迟到应用程序报告为不健康为止，以先发生者为准。

在此期间，所有订阅和 input binding 都会关闭。这对于需要在自身关闭流程中使用 Dapr API 的应用程序很有用。

对于 Kubernetes 上的 Actor 宿主，只有当应用程序的存活时间超过该延迟*并且*能够覆盖其后的 Actor drain 和停用过程时，此延迟才有帮助。请使用时长足以覆盖这三者的 `preStop` 钩子，让应用程序容器保持存活。请参阅 [Actor 宿主的优雅关闭]({{% ref "kubernetes-production.md#graceful-shutdown-for-actor-hosts" %}})。

适用的注解或 CLI 标志包括：

- `--dapr-graceful-shutdown-seconds`/`dapr.io/graceful-shutdown-seconds`
- `--dapr-block-shutdown-duration`/`dapr.io/block-shutdown-duration`

在[注解和参数指南]({{% ref arguments-annotations-overview.md %}})中了解有关这些注解和标志及其用法的更多信息。

## 相关链接

- [端点健康 API]({{% ref health_api.md %}})
- [Actor 健康 API]({{% ref "actors_api.md#health-check" %}})
- [Kubernetes 探针配置参数](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
