---
type: docs
title: 工作流并发限制
linkTitle: 并发限制
weight: 9000
description: "为 Dapr 工作流配置并发限制，控制同时运行的工作流和活动数量。"
---

Dapr 为工作流和活动提供两个层级的并发限制：

- **全局限制**控制所有副本的总量，由调度器执行。
- **每边车限制**控制单个 Dapr 实例可以并发执行多少个工作流或活动。

两个层级可以独立配置，并且可以共同生效。全局限制用于施加命名空间范围内的容量约束，例如遵守下游服务的速率限制。每边车限制用于保护单个实例，避免资源耗尽。

如果你想表达真正的并发上限，请优先使用全局限制。由于每边车限制会独立作用于每个实例，因此命名空间范围内的有效上限等于每边车的值乘以副本数，每次扩缩容时都会随之变化。全局限制的总量与运行的副本数无关，这通常正是你所说的“同时最多 N 个”的含义。

## 全局限制

全局限制对应用的**所有副本**强制执行上限。Dapr 调度器会将该上限分配给其各个实例，并在达到上限时暂缓触发，待有可用容量时再进行派发。

由于无论运行多少个副本，总量都固定不变，全局限制是表达真正并发上限最准确的方式。对于大多数工作负载，这是推荐的起点。

{{% alert title="注意" color="primary" %}}
全局限制和按名称的限制都由调度器在投递每个任务时执行。只要配置了其中任意一种，[`WorkflowsFastPath` 预览功能]({{% ref "workflow-fast-path.md#concurrency-limits" %}})就会在边车启动时自动禁用（并输出一条 Info 日志），以确保这些限制生效。每边车限制与快速路径兼容。
{{% /alert %}}

### 所有工作流或所有活动

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  workflow:
    globalMaxConcurrentWorkflowInvocations: 50
    globalMaxConcurrentActivityInvocations: 200
```

| 属性 | 类型 | 说明 |
|----------|------|-------------|
| `globalMaxConcurrentWorkflowInvocations` | int32 | 跨所有副本、由工作流调度器 Actor 处理的最大并发工作流操作数。默认：无限制。 |
| `globalMaxConcurrentActivityInvocations` | int32 | 跨所有副本的最大并发活动执行数。默认：无限制。 |

{{% alert title="注意" color="primary" %}}
`globalMaxConcurrentWorkflowInvocations`（以及 `maxConcurrentWorkflowInvocations`）限制的是工作流调度器 Actor 正在处理的并发工作流操作数，**而不是**活动中（运行中）的工作流实例总数。等待活动、定时器或外部事件而处于挂起状态的工作流不计入此限制。因此，此设置并不用于限制活动工作流实例的总数，也不用于施加实例级的背压。
{{% /alert %}}

### 按名称限制

你可以为特定的工作流或活动名称设置并发限制。当某些工作流或活动调用了有速率限制的外部服务时，这一功能很有用。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  workflow:
    globalMaxConcurrentActivityInvocations: 200
    activityConcurrencyLimits:
      - name: SendEmail
        maxConcurrent: 5
      - name: CallPaymentAPI
        maxConcurrent: 10
    workflowConcurrencyLimits:
      - name: OrderProcess
        maxConcurrent: 20
```

| 属性 | 类型 | 说明 |
|----------|------|-------------|
| `activityConcurrencyLimits` | array | 按活动名称设置的并发限制。 |
| `workflowConcurrencyLimits` | array | 按工作流名称设置的并发限制。 |
| `activityConcurrencyLimits[].name` | string | 要限制的活动名称。 |
| `activityConcurrencyLimits[].maxConcurrent` | int32 | 该活动在所有副本上的最大并发执行数。 |
| `workflowConcurrencyLimits[].name` | string | 要限制的工作流名称。 |
| `workflowConcurrencyLimits[].maxConcurrent` | int32 | 该工作流在所有副本上的最大并发执行数。 |

一个触发必须满足**所有**适用的限制。例如，若 `globalMaxConcurrentActivityInvocations` 为 200，而 `SendEmail` 的按名称限制为 5，则最多只能运行 5 个 `SendEmail` 活动，并且所有活动合计不能超过 200 个。

## 每边车限制

每边车限制用于约束单个 Dapr 边车内的并发量。由于它们独立作用于每个实例，因此命名空间范围内的有效容量会随副本数增长：如果你有 10 个副本，每边车限制为 100，那么命名空间范围内的有效容量最多为 1000。出于这个原因，应使用每边车限制来保护单个实例免于资源耗尽，而不是用它来强制执行真正的命名空间范围并发上限。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  workflow:
    maxConcurrentWorkflowInvocations: 100
    maxConcurrentActivityInvocations: 1000
```

| 属性 | 类型 | 说明 |
|----------|------|-------------|
| `maxConcurrentWorkflowInvocations` | int32 | 每个边车的最大并发工作流执行数。默认：无限制。 |
| `maxConcurrentActivityInvocations` | int32 | 每个边车的最大并发活动执行数。默认：无限制。 |

这些限制不区分不同的工作流或活动名称，它们适用于边车中运行的所有工作流和活动。

## 各层级如何相互作用

| 限制类型 | 作用范围 | 执行位置 | 扩缩副本的影响 |
|------------|-------|-------------------|---------------------------|
| 全局（按类型） | 所有副本 | 调度器 | 无论副本数多少，总量固定 |
| 全局（按名称） | 所有副本 | 调度器 | 无论副本数多少，总量固定 |
| 每边车 | 单个实例 | Dapr 边车 | 有效最大值 = 限制 × 副本数 |

同时配置每边车限制和全局限制时，两者都会生效。全局限制防止命名空间范围内的总量超过配置值，而每边车限制防止任何单个实例占用过多的本地资源。

## 全局限制如何与多个调度器副本协同工作

调度器使用向下取整（floor division）将全局限制平均分配给其各个实例。若全局限制为 100，调度器副本数为 3，则每个调度器执行的本地限制为 33，因此命名空间范围内的有效最大值为 99。这样可以确保不会超过配置的限制。

## 与其他速率限制选项的比较

Dapr 提供了多种控制并发和速率限制的方式：

| 方式 | 控制对象 | 粒度 | 作用范围 |
|----------|-----------------|---------------------------|-------|
| [工作流并发限制]({{% ref "workflow-concurrency.md" %}}) | 工作流和活动的执行 | 按类型或按名称 | 每边车或全局 |
| [`app-max-concurrency`]({{% ref "control-concurrency.md" %}}) | 发送到应用的所有请求和事件 | 全部流量 | 每边车 |
| [速率限制中间件]({{% ref "middleware-rate-limit.md" %}}) | 每秒 HTTP 请求数 | 按远程 IP | 每边车 |

## 相关链接

- [Dapr 配置参考]({{% ref configuration-overview.md %}})
- [控制应用的并发和速率限制]({{% ref control-concurrency.md %}})
- [速率限制中间件]({{% ref middleware-rate-limit.md %}})
- [工作流概述]({{% ref workflow-overview.md %}})
- [工作流快速路径]({{% ref workflow-fast-path.md %}})
- [工作流 API 参考]({{% ref workflow_api.md %}})
