---
type: docs
title: "目标"
linkTitle: "目标"
weight: 300
description: "将弹性策略应用于目标，包括应用、组件和 actor"
---

### 目标

命名策略应用于目标。Dapr 支持三种目标类型，这些类型适用于所有 Dapr 构建块 API：
- `apps`
- `components`
- `actors`

#### 应用

使用 `apps` 目标，您可以将 `retry`、`timeout` 和 `circuitBreaker` 策略应用于 Dapr 应用之间的服务调用。在 `targets/apps` 下，策略应用于每个目标服务的 `app-id`。当边车之间的通信发生故障时，会触发这些策略，如下图所示。

> Dapr 提供了[内置服务调用重试]({{% ref "service-invocation-overview.md#retries" %}})，因此任何应用的 `retry` 策略都是额外的。

<img src="/images/resiliency_svc_invocation.png" width=1000 alt="Diagram showing service invocation resiliency" />

针对 `app-id` 为 "appB" 的目标应用应用策略的示例：

```yaml
specs:
  targets:
    apps:
      appB: # 目标服务的 app-id
        timeout: general
        retry: general
        circuitBreaker: general
```


#### 组件

使用 `components` 目标，您可以将 `retry`、`timeout` 和 `circuitBreaker` 策略应用于组件操作。

策略可以应用于 `outbound` 操作（对 Dapr 边车的调用）和/或 `inbound`（边车调用您的应用）。

##### 出站

`outbound` 操作是从边车到组件的调用，例如：

- 持久化或检索状态。
- 在发布订阅组件上发布消息。
- 调用输出绑定。

> 某些组件可能具有内置的重试功能，并按组件配置。

<img src="/images/resiliency_outbound.png" width=1000 alt="Diagram showing service invocation resiliency">

```yaml
spec:
  targets:
    components:
      myStateStore:
        outbound:
          retry: retryForever
          circuitBreaker: simpleCB
```

##### 入站

`inbound` 操作是从边车到您应用的调用，例如：

- 发布订阅订阅在传递消息时。
- 输入绑定。

> 某些组件可能具有内置的重试功能，并按组件配置。

<img src="/images/resiliency_inbound.png" width=1000 alt="Diagram showing service invocation resiliency" />

```yaml
spec:
  targets:
    components:
      myInputBinding:
        inbound: 
          timeout: general
          retry: general
          circuitBreaker: general
```

##### 发布订阅

在发布订阅 `target/component` 中，您可以同时指定 `inbound` 和 `outbound` 操作。

<img src="/images/resiliency_pubsub.png" width=1000 alt="Diagram showing service invocation resiliency">

```yaml
spec:
  targets:
    components:
      myPubsub:
        outbound:
          retry: pubsubRetry
          circuitBreaker: pubsubCB
        inbound: # inbound 仅适用于从边车到应用的传递
          timeout: general
          retry: general
          circuitBreaker: general
```

#### Actor

使用 `actors` 目标，您可以将 `retry`、`timeout` 和 `circuitBreaker` 策略应用于 actor 操作。

当为 `actors` 目标使用 `circuitBreaker` 策略时，您可以使用 `circuitBreakerScope` 指定熔断状态应如何确定范围：

- `id`：单个 actor ID
- `type`：给定 actor 类型的所有 actor
- `both`：以上两者

您还可以使用 `circuitBreakerCacheSize` 属性为内存中保留的熔断器数量指定缓存大小，提供一个整数值，例如 `5000`。

示例

```yaml
spec:
  targets:
    actors:
      myActorType:
        timeout: general
        retry: general
        circuitBreaker: general
        circuitBreakerScope: both
        circuitBreakerCacheSize: 5000
```

## 后续步骤

尝试其中一个弹性快速入门：
- [弹性：服务对服务]({{% ref resiliency-serviceinvo-quickstart.md %}})
- [弹性：状态管理]({{% ref resiliency-state-quickstart.md %}})
