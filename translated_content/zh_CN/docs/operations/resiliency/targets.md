---
type: docs
title: "目标"
linkTitle: "目标"
weight: 300
description: "将 Resiliency 策略应用于目标，包括应用、组件和 Actor"
---

### 目标

命名策略应用于目标。Dapr 支持三种适用于所有 Dapr building block API 的目标类型：
- `apps`
- `components`
- `actors`

#### 应用

使用 `apps` 目标，您可以将 `retry`、`timeout` 和 `circuitBreaker` 策略应用于 Dapr 应用之间的 service invocation 调用。在 `targets/apps` 下，策略应用于每个目标服务的 `app-id`。当 sidecar 之间的通信发生故障时，会触发这些策略，如下图所示。

> Dapr 提供了[内置 service invocation 重试]({{% ref "service-invocation-overview.md#resiliency-including-retries" %}})，因此任何应用的 `retry` 策略都是额外的。

> 对于 HTTP service invocation，`retry` 策略会自动绕过流式请求（即没有已知 `Content-Length` 的请求）。断路器仍然适用。另请参见 [流式请求与 Resiliency]({{% ref "service-invocation-overview#streaming-requests-and-resiliency" %}})。

> 对于 HTTP service invocation，`retry` 策略会自动绕过流式请求（即没有已知 `Content-Length` 的请求）。断路器仍然适用。另请参见 [流式请求与 Resiliency]({{% ref "service-invocation-overview#streaming-requests-and-resiliency" %}})。

> 对于 HTTP service invocation，`retry` 策略会自动绕过流式请求（即没有已知 `Content-Length` 的请求）。断路器仍然适用。另请参见 [流式请求与 Resiliency]({{% ref "service-invocation-overview#streaming-requests-and-resiliency" %}})。

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

策略可以应用于 `outbound` 操作（对 Dapr sidecar 的调用）和/或 `inbound`（sidecar 调用您的应用）。

##### 出站

`outbound` 操作是从 sidecar 到组件的调用，例如：

- 持久化或检索状态。
- 在 PubSub 组件上发布消息。
- 调用 output binding。

> 某些组件可能具有内置的重试功能，并按组件单独配置。

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

`inbound` 操作是从 sidecar 到您应用的调用，例如：

- 传递消息时的 PubSub subscriptions。
- input binding。

> 某些组件可能具有内置的重试功能，并按组件单独配置。

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

##### PubSub

在 PubSub `target/component` 中，您可以同时指定 `inbound` 和 `outbound` 操作。

<img src="/images/resiliency_pubsub.png" width=1000 alt="Diagram showing service invocation resiliency">

```yaml
spec:
  targets:
    components:
      myPubsub:
        outbound:
          retry: pubsubRetry
          circuitBreaker: pubsubCB
        inbound: # inbound 仅适用于从 sidecar 到应用的传递
          timeout: general
          retry: general
          circuitBreaker: general
```

#### Actor

使用 `actors` 目标，您可以将 `retry`、`timeout` 和 `circuitBreaker` 策略应用于 Actor 操作。

为 `actors` 目标使用 `circuitBreaker` 策略时，您可以通过 `circuitBreakerScope` 指定断路状态的作用范围：

- `id`：单个 Actor ID
- `type`：给定 Actor 类型的所有 Actor
- `both`：以上两者

您还可以通过 `circuitBreakerCacheSize` 属性指定内存中保留的断路器数量的缓存大小，其值为整数，例如 `5000`。

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

尝试以下 Resiliency Quickstart 之一：
- [Resiliency：服务对服务]({{% ref resiliency-serviceinvo-quickstart.md %}})
- [Resiliency：State Management]({{% ref resiliency-state-quickstart.md %}})
