---
type: docs
title: "断路器弹性策略"
linkTitle: "断路器"
weight: 30
description: "为断路器配置弹性策略"
---

当其他应用程序/服务/组件出现较高的故障率时，会使用断路器策略。断路器通过监控请求并在满足特定条件时切断到受影响服务的所有流量来减少负载。

在一定数量的请求失败后，断路器会"跳闸"或打开以防止级联故障。通过这样做，断路器为服务提供从故障中恢复的时间，而不是用事件淹没它。

断路器还可以进入"半开"状态，允许部分流量通过以查看系统是否已恢复。

一旦请求恢复成功，断路器将进入"关闭"状态，并允许流量完全恢复。

## 断路器策略格式

```yaml
spec:
  policies:
    circuitBreakers:
      pubsubCB:
        maxRequests: 1
        interval: 8s
        timeout: 45s
        trip: consecutiveFailures > 8
```

## 规格元数据

| 重试选项 | 描述 |
| ------------ | ----------- |
| `maxRequests` | 断路器处于半开状态（从故障中恢复）时允许通过的最大请求数。默认为 `1`。 |
| `interval` | 断路器用于清除其内部计数的循环时间周期。如果设置为 0 秒，则永远不会清除。默认为 `0s`。 |
| `timeout` | 打开状态的持续时间（直接在故障之后），直到断路器切换到半开状态。默认为 `60s`。 |
| `trip` | 由断路器评估的 [Common Expression Language (CEL)](https://github.com/google/cel-spec) 表达式。当表达式评估为 true 时，断路器跳闸并变为打开状态。默认为 `consecutiveFailures > 5`。其他可能的值是 `requests` 和 `totalFailures`，其中 `requests` 表示电路打开之前成功或失败调用的数量，`totalFailures` 表示电路打开之前失败尝试的总数（不一定是连续的）。示例：`requests > 5` 和 `totalFailures >3`。|

## 后续步骤
- [了解默认弹性策略的更多信息]({{% ref default-policies.md %}})
- 了解更多：
  - [重试策略]({{% ref retries-overview.md %}})
  - [超时策略]({{% ref timeouts.md %}})

## 相关链接

尝试以下弹性快速入门之一：
- [弹性：服务到服务]({{% ref resiliency-serviceinvo-quickstart.md %}})
- [弹性：状态管理]({{% ref resiliency-state-quickstart.md %}})
