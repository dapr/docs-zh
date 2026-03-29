---
type: docs
title: "默认弹性策略"
linkTitle: "默认策略"
weight: 40
description: "了解有关超时、重试和熔断器的默认弹性策略的更多信息"
---

在弹性中，您可以设置具有广泛范围的默认策略。这是通过保留关键字完成的，让 Dapr 知道何时应用该策略。有 3 种默认策略类型：

- `DefaultRetryPolicy`
- `DefaultTimeoutPolicy`
- `DefaultCircuitBreakerPolicy`

如果定义了这些策略，它们将用于对服务、应用程序或组件的每个操作。它们还可以通过附加额外关键字来修改以更加具体。具体策略遵循以下模式，`Default%sRetryPolicy`、`Default%sTimeoutPolicy` 和 `Default%sCircuitBreakerPolicy`。其中 `%s` 被替换为策略的目标。

下表列出了所有可能的默认策略关键字以及它们如何转换为策略名称。

| 关键字                            | 目标操作                                             | 示例策略名称                                                 |
| --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| `App`                             | 服务调用。                                           | `DefaultAppRetryPolicy`                                      |
| `Actor`                           | Actor 调用。                                         | `DefaultActorTimeoutPolicy`                                  |
| `Component`                       | 所有组件操作。                                       | `DefaultComponentCircuitBreakerPolicy`                       |
| `ComponentInbound`                | 所有入站组件操作。                                   | `DefaultComponentInboundRetryPolicy`                         |
| `ComponentOutbound`               | 所有出站组件操作。                                   | `DefaultComponentOutboundTimeoutPolicy`                      |
| `StatestoreComponentOutbound`     | 所有状态存储组件操作。                               | `DefaultStatestoreComponentOutboundCircuitBreakerPolicy`     |
| `PubsubComponentOutbound`         | 所有出站发布订阅（发布）组件操作。                    | `DefaultPubsubComponentOutboundRetryPolicy`                  |
| `PubsubComponentInbound`          | 所有入站发布订阅（订阅）组件操作。                    | `DefaultPubsubComponentInboundTimeoutPolicy`                 |
| `BindingComponentOutbound`        | 所有出站绑定（调用）组件操作。                        | `DefaultBindingComponentOutboundCircuitBreakerPolicy`        |
| `BindingComponentInbound`         | 所有入站绑定（读取）组件操作。                        | `DefaultBindingComponentInboundRetryPolicy`                  |
| `SecretstoreComponentOutbound`    | 所有密钥存储组件操作。                                | `DefaultSecretstoreComponentTimeoutPolicy`                   |
| `ConfigurationComponentOutbound`  | 所有配置组件操作。                                    | `DefaultConfigurationComponentOutboundCircuitBreakerPolicy`  |
| `LockComponentOutbound`           | 所有锁组件操作。                                      | `DefaultLockComponentOutboundRetryPolicy`                    |

## 策略层次解析

如果正在执行的操作匹配策略类型，并且没有针对它的更具体的策略，则会应用默认策略。对于每个目标类型（app、actor 和 component），优先级最高的策略是命名策略，即专门针对该构造的策略。

如果不存在，则策略从最具体到最广泛应用。

## 默认策略与内置重试如何协同工作

在[内置重试]({{% ref override-default-retries.md %}})的情况下，默认策略不会阻止内置重试策略运行。两者一起使用，但仅在特定情况下。

对于服务和 Actor 调用，内置重试专门处理连接到远程边车时的问题（在需要时）。由于这些对 Dapr 运行时的稳定性很重要，因此它们不会被禁用，**除非**为操作专门引用了命名策略。在某些情况下，可能会同时从内置重试和默认重试策略进行额外重试，但这可以防止过于薄弱的默认策略降低边车的可用性/成功率。

应用程序的策略解析层次，从最具体到最广泛：

1. App 目标中的命名策略
2. 默认 App 策略 / 内置服务重试
3. 默认策略 / 内置服务重试

Actor 的策略解析层次，从最具体到最广泛：

1. Actor 目标中的命名策略
2. 默认 Actor 策略 / 内置 Actor 重试
3. 默认策略 / 内置 Actor 重试

组件的策略解析层次，从最具体到最广泛：

1. 组件目标中的命名策略
2. 默认组件类型 + 组件方向策略 / 内置 Actor 提醒重试（如果适用）
3. 默认组件方向策略 / 内置 Actor 提醒重试（如果适用）
4. 默认组件策略 / 内置 Actor 提醒重试（如果适用）
5. 默认策略 / 内置 Actor 提醒重试（如果适用）

作为一个示例，考虑以下解决方案，其中包含三个应用程序、三个组件和两个 Actor 类型：

应用程序：

- AppA
- AppB
- AppC

组件：

- Redis Pubsub：pubsub
- Redis statestore：statestore
- CosmosDB Statestore：actorstore

Actor：

- EventActor
- SummaryActor

以下是使用默认和命名策略并将其应用于目标的策略。

```yaml
spec:
  policies:
    retries:
      # 全局重试策略
      DefaultRetryPolicy:
        policy: constant
        duration: 1s
        maxRetries: 3
      
      # 应用程序的全局重试策略
      DefaultAppRetryPolicy:
        policy: constant
        duration: 100ms
        maxRetries: 5

      # 应用程序的全局重试策略
      DefaultActorRetryPolicy:
        policy: exponential
        maxInterval: 15s
        maxRetries: 10

      # 入站组件操作的全局重试策略
      DefaultComponentInboundRetryPolicy:
        policy: constant
        duration: 5s
        maxRetries: 5

      # 状态存储的全局重试策略
      DefaultStatestoreComponentOutboundRetryPolicy:
        policy: exponential
        maxInterval: 60s
        maxRetries: -1

     # 命名策略
      fastRetries:
        policy: constant
        duration: 10ms
        maxRetries: 3

     # 命名策略
      retryForever:
        policy: exponential
        maxInterval: 10s
        maxRetries: -1

  targets:
    apps:
      appA:
        retry: fastRetries

      appB:
        retry: retryForever
    
    actors:
      EventActor:
        retry: retryForever

    components:
      actorstore:
        retry: fastRetries
```

下表详细分解了在尝试调用此解决方案中的各种目标时应用哪些策略。

| 目标              | 使用的策略                                            |
| ----------------- | ----------------------------------------------------- |
| AppA              | fastRetries                                            |
| AppB              | retryForever                                           |
| AppC              | DefaultAppRetryPolicy / DaprBuiltInActorRetries        |
| pubsub - 发布     | DefaultRetryPolicy                                     |
| pubsub - 订阅     | DefaultComponentInboundRetryPolicy                     |
| statestore        | DefaultStatestoreComponentOutboundRetryPolicy          |
| actorstore        | fastRetries                                            |
| EventActor        | retryForever                                           |
| SummaryActor      | DefaultActorRetryPolicy                                |

## 后续步骤

[了解如何覆盖默认重试策略。]({{% ref override-default-retries.md %}})

## 相关链接

尝试其中一个弹性快速入门：
- [弹性：服务对服务]({{% ref resiliency-serviceinvo-quickstart.md %}})
- [弹性：状态管理]({{% ref resiliency-state-quickstart.md %}})
