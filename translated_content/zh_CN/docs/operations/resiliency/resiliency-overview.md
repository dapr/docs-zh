---
type: docs
title: "概览"
linkTitle: "概览"
weight: 100
description: "配置 Dapr 重试、超时和熔断器"
---

Dapr 提供了通过[弹性规范]({{% ref "resiliency-overview.md#complete-example-policy" %}})定义和应用容错弹性策略的能力。弹性规范保存在与组件规范相同的位置，并在 Dapr 边车启动时应用。边车决定如何将弹性策略应用于您的 Dapr API 调用。
- **在自托管模式下：** 弹性规范必须命名为 `resiliency.yaml`。
- **在 Kubernetes 中：** Dapr 会查找应用程序使用的命名弹性规范。

## 策略

您可以通过以下部分配置 Dapr 弹性策略：
- 定义策略应用位置的元数据（如命名空间和作用域）
- 指定弹性名称和行为的策略，例如：
  - [超时]({{% ref timeouts.md %}})
  - [重试]({{% ref retries-overview.md %}})
  - [熔断器]({{% ref circuit-breakers.md %}})
- 确定这些策略作用于哪些交互的目标，包括：
  - 通过服务调用的[应用]({{% ref "targets.md#apps" %}})
  - [组件]({{% ref "targets.md#components" %}})
  - [Actor]({{% ref "targets.md#actors" %}})

定义完成后，您可以使用以下命令将此配置应用到本地 Dapr 组件目录或 Kubernetes 集群：

```bash
kubectl apply -f <resiliency-spec-name>.yaml
```

此外，您还可以将弹性策略[限定为特定应用]({{% ref "component-scopes.md#application-access-to-components-with-scopes" %}})。

> 参见[已知限制](#limitations)。

## 弹性策略结构

以下是弹性策略的通用结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: myresiliency
scopes:
  # 可选：将策略限定为特定应用
spec:
  policies:
    timeouts:
      # 超时策略定义

    retries:
      # 重试策略定义

    circuitBreakers:
      # 熔断器策略定义

  targets:
    apps:
      # 此处填写应用及其应用的策略

    actors:
      # 此处填写 actor 类型及其应用的策略

    components:
      # 此处填写组件及其应用的策略
```

## 完整示例策略

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: myresiliency
# 与订阅和配置规范类似，scopes 列出了可使用此弹性规范的 Dapr 应用 ID。
scopes:
  - app1
  - app2
spec:
  # policies 是定义超时、重试和熔断器策略的地方。
  # 每个策略都有一个名称，以便从弹性规范的 targets 部分引用它们。
  policies:
    # timeouts 是简单的命名持续时间。
    timeouts:
      general: 5s
      important: 60s
      largeResponse: 10s

    # retries 是重试配置的命名模板，在操作生命周期内实例化。
    retries:
      pubsubRetry:
        policy: constant
        duration: 5s
        maxRetries: 10

      retryForever:
        policy: exponential
        maxInterval: 15s
        maxRetries: -1 # 无限期重试

      important:
        policy: constant
        duration: 5s
        maxRetries: 30

      someOperation:
        policy: exponential
        maxInterval: 15s

      largeResponse:
        policy: constant
        duration: 5s
        maxRetries: 3

    # circuit breakers 会自动为每个组件和应用实例实例化。
    # 熔断器维护的计数器在 Dapr 边车运行期间一直存在。它们不会被持久化。
    circuitBreakers:
      simpleCB:
        maxRequests: 1
        timeout: 30s 
        trip: consecutiveFailures >= 5

      pubsubCB:
        maxRequests: 1
        interval: 8s
        timeout: 45s
        trip: consecutiveFailures > 8

  # targets 是命名策略应用到的对象。Dapr 支持 3 种目标类型 - 应用、组件和 actor
  targets:
    apps:
      appB:
        timeout: general
        retry: important
        # 服务的熔断器按应用实例限定作用域。
        # 当熔断器触发时，该路由会在配置的 `timeout` 期限内从负载均衡中移除。
        circuitBreaker: simpleCB

    actors:
      myActorType: # 自定义 Actor 类型名称
        timeout: general
        retry: important
        # actor 的熔断器按类型、id 或两者限定作用域。
        # 当熔断器触发时，该类型或 id 会在配置的 `timeout` 期限内从位置表中移除。
        circuitBreaker: simpleCB
        circuitBreakerScope: both ## 
        circuitBreakerCacheSize: 5000

    components:
      # 对于状态存储，策略应用于保存和检索状态。
      statestore1: # 任何组件名称 -- 这里恰好是一个状态存储
        outbound:
          timeout: general
          retry: retryForever
          # 组件的熔断器按每个组件配置/实例限定作用域。例如 myRediscomponent。
          # 当此熔断器触发时，在配置的 `timeout` 期限内将阻止与该组件的所有交互。
          circuitBreaker: simpleCB

      pubsub1: # 任何组件名称 -- 这里恰好是一个 pubsub broker
        outbound:
          retry: pubsubRetry
          circuitBreaker: pubsubCB

      pubsub2: # 任何组件名称 -- 这里恰好是另一个 pubsub broker
        outbound:
          retry: pubsubRetry
          circuitBreaker: pubsubCB
        inbound: # inbound 仅适用于从边车到应用的传递
          timeout: general
          retry: important
          circuitBreaker: pubsubCB
```

## 限制

- **通过 gRPC 进行服务调用：** 目前，通过 gRPC 进行的服务调用不支持弹性策略。

## 演示

观看此视频了解如何使用[弹性](https://www.youtube.com/watch?t=184&v=7D6HOU3Ms6g&feature=youtu.be)：

{{< youtube id=7D6HOU3Ms6g start=184 >}}

了解有关[如何使用 Dapr 编写弹性微服务](https://youtu.be/uC-4Q5KFq98?si=JSUlCtcUNZLBM9rW)的更多信息。

{{< youtube id=uC-4Q5KFq98 >}}

## 后续步骤
了解有关弹性策略和目标的更多信息：
 - 策略
   - [超时]({{% ref "timeouts.md" %}})
   - [重试]({{% ref "retries-overview.md" %}})
   - [熔断器]({{% ref circuit-breakers.md %}})
 - [目标]({{% ref "targets.md" %}})

## 相关链接
尝试其中一个弹性快速入门：
- [弹性：服务到服务]({{% ref resiliency-serviceinvo-quickstart.md %}})
- [弹性：状态管理]({{% ref resiliency-state-quickstart.md %}})
