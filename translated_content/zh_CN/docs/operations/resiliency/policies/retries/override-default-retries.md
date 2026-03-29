---
type: docs
title: "覆盖默认重试弹性策略"
linkTitle: "覆盖默认重试"
weight: 20
description: "了解如何为特定 API 覆盖默认重试弹性策略"
---

Dapr 为任何不成功的请求（如故障和临时错误）提供[默认重试]({{% ref default-policies.md %}})。在弹性规范中，您可以通过使用保留的命名关键字定义策略来覆盖 Dapr 的默认重试逻辑。例如，定义一个名为 `DaprBuiltInServiceRetries` 的策略可以覆盖通过服务间请求在边车之间发生故障时的默认重试。策略覆盖不会应用于特定目标。

> 注意：虽然您可以使用更稳健的重试来覆盖默认值，但不能使用低于提供的默认值的值进行覆盖，也不能完全移除默认重试。这可以防止意外的停机。

下表描述了 Dapr 的默认重试以及用于覆盖它们的策略关键字：

| 功能 | 覆盖关键字 | 默认重试行为 | 描述 |
| ------------------ | ------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 服务调用 | DaprBuiltInServiceRetries | 每次调用重试的退避间隔为 1 秒，最多重试 3 次。 | 边车对边车的请求（服务调用方法调用）失败并导致 gRPC 代码 `Unavailable` 或 `Unauthenticated` |
| Actors | DaprBuiltInActorRetries | 每次调用重试的退避间隔为 1 秒，最多重试 3 次。 | 边车对边车的请求（Actor 方法调用）失败并导致 gRPC 代码 `Unavailable` 或 `Unauthenticated` |
| Actor 提醒 | DaprBuiltInActorReminderRetries | 每次调用重试采用指数退避，初始间隔为 500ms，最大间隔为 60s，持续时间为 15 分钟 | 向状态存储持久化 Actor 提醒失败的请求 |
| 初始化重试 | DaprBuiltInInitializationRetries | 每次调用执行 3 次重试，采用指数退避，初始间隔为 500ms，持续时间为 10 秒 | 向应用程序发出请求以检索给定规范时的故障。例如，检索订阅、组件或弹性规范失败 |

下面的弹性规范示例展示了如何使用保留的命名关键字 'DaprBuiltInServiceRetries' 来覆盖_所有_服务调用请求的默认重试。

同时还定义了一个名为 'retryForever' 的重试策略，该策略仅应用于 appB 目标。appB 使用 'retryForever' 重试策略，而所有其他应用程序服务调用重试故障则使用被覆盖的 'DaprBuiltInServiceRetries' 默认策略。

```yaml
spec:
  policies:
    retries:
      DaprBuiltInServiceRetries: # 覆盖服务间调用的默认重试行为
        policy: constant
        duration: 5s
        maxRetries: 10

      retryForever: # 用户定义的重试策略会替换默认重试。目标仅依赖于应用的策略。 
        policy: exponential
        maxInterval: 15s
        maxRetries: -1 # 无限期重试

  targets:
    apps:
      appB: # 目标服务的 app-id
        retry: retryForever
```

## 相关链接

尝试其中一个弹性快速入门：
- [弹性：服务间]({{% ref resiliency-serviceinvo-quickstart.md %}})
- [弹性：状态管理]({{% ref resiliency-state-quickstart.md %}})
