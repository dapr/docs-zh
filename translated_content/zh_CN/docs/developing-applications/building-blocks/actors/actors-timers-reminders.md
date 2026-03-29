---
type: docs
title: "Actor 定时器和提醒器"
linkTitle: "定时器和提醒器"
weight: 50
description: "为你的 Actor 设置定时器和提醒器，并进行错误处理"
aliases:
  - "/developing-applications/building-blocks/actors/actors-background"
---

Actor 可以通过注册定时器或提醒器来周期性地执行自身任务。

定时器和提醒器的功能非常相似。主要区别在于 Dapr actor 运行时在停用后不会保留任何关于定时器的信息，而会使用 Dapr [Scheduler]({{% ref scheduler.md %}}) 持久化关于提醒器的信息。

这种区别使用户可以在轻量级但无状态的定时器与资源需求更大但有状态的提醒器之间进行权衡。

定时器和提醒器的调度配置汇总如下：

---
`data` 是一个可选参数，包含在调用提醒器回调方法时传递的数据

---
`dueTime` 是一个可选参数，用于设置回调首次调用的时间或时间间隔。如果省略 `dueTime`，则在注册定时器/提醒器后立即调用回调。

支持的格式：
- RFC3339 日期格式，例如 `2020-10-02T15:00:00Z`
- time.Duration 格式，例如 `2h30m`
- [ISO 8601 持续时间](https://en.wikipedia.org/wiki/ISO_8601#Durations) 格式，例如 `PT2H30M`

---
`period` 是一个可选参数，用于设置两次连续回调调用之间的时间间隔。当以 `ISO 8601-1 duration` 格式指定时，你还可以配置重复次数以限制回调调用的总次数。
如果省略 `period`，则回调仅调用一次。

支持的格式：
- time.Duration 格式（使用持续时间值时支持亚秒精度），例如 `2h30m`、`500ms`
- [ISO 8601 持续时间](https://en.wikipedia.org/wiki/ISO_8601#Durations) 格式，例如 `PT2H30M`、`R5/PT1M30S`

---
`ttl` 是一个可选参数，用于设置定时器/提醒器过期并被删除的时间或时间间隔。如果省略 `ttl`，则不应用任何限制。

支持的格式：
* RFC3339 日期格式，例如 `2020-10-02T15:00:00Z`
* time.Duration 格式，例如 `2h30m`
* [ISO 8601 持续时间](https://en.wikipedia.org/wiki/ISO_8601#Durations) 格式。例如：`PT2H30M`

---
仅适用于 **提醒器**。

`overwrite` 是一个可选布尔参数，用于指示是否覆盖同名的现有提醒器。
如果 `overwrite` 设置为 `true`，任何具有相同名称的现有提醒器都将被新配置替换。
如果 `overwrite` 设置为 `false` 或省略，且已存在同名的提醒器，则操作将失败并返回"已存在"错误。
请注意，覆盖现有提醒器会重置其错误状态，包括调用次数和下一次触发时间，就像创建新提醒器一样。

---
仅适用于 **提醒器**。

`failurePolicy` 是一个可选参数，用于定义提醒器调用失败时的行为。
支持的失败策略包括：
- `drop`：丢弃失败的调用，提醒器继续进行下一次计划调用，就像没有发生故障一样。
- `constant`：提醒器将以固定的间隔重试失败的调用指定次数。
  * `interval`：每次重试尝试之间的时间间隔。如果未指定，间隔变为"0s"，意味着立即尝试重试。
  * `maxRetries`：最大重试次数。如果未指定，调用将以指定的间隔无限重试，直到成功。

如果未指定失败策略，将应用默认失败策略：重试 3 次，间隔为 1 秒。

---

Actor 运行时验证调度配置的正确性，并在输入无效时返回错误。

当你同时在 `period` 中指定重复次数以及 `ttl` 时，定时器/提醒器将在任一条件首先满足时停止。

## Actor 定时器

你可以在 Actor 上注册一个回调，根据定时器执行。

Dapr actor 运行时确保回调方法遵循基于轮次的并发保证。这意味着在此回调完成执行之前，不会有其他 Actor 方法或定时器/提醒器回调在进行中。

Dapr actor 运行时在回调结束时保存对 Actor 状态的更改。如果保存状态时发生错误，则该 Actor 对象将被停用，并将激活一个新实例。

当 Actor 作为垃圾回收的一部分被停用时，所有定时器都会停止。之后不会再调用任何定时器回调。此外，Dapr actor 运行时不会保留关于停用前运行的定时器的任何信息。Actor 需要在将来重新激活时注册所需的任何定时器。

你可以通过调用 Dapr 的 HTTP/gRPC 请求来为 Actor 创建定时器，如下所示，或通过 Dapr SDK。

```md
POST/PUT http://localhost:3500/v1.0/actors/<actorType>/<actorId>/timers/<name>
```

### 示例

定时器参数在请求正文中指定。

以下请求正文配置了一个 `dueTime` 为 9 秒、`period` 为 3 秒的定时器。这意味着它将在 9 秒后首次触发，之后每 3 秒触发一次。
```json
{
  "dueTime":"0h0m9s0ms",
  "period":"0h0m3s0ms"
}
```

以下请求正文配置了一个 `period` 为 3 秒（ISO 8601 持续时间格式）的定时器。它还将调用次数限制为 10 次。这意味着它将触发 10 次：首次在注册后立即触发，之后每 3 秒触发一次。
```json
{
  "period":"R10/PT3S",
}
```

以下请求正文配置了一个 `period` 为 3 秒（ISO 8601 持续时间格式）且 `ttl` 为 20 秒的定时器。这意味着它将在注册后立即触发，之后每 3 秒触发一次，持续 20 秒。
```json
{
  "period":"PT3S",
  "ttl":"20s"
}
```

以下请求正文配置了一个 `dueTime` 为 10 秒、`period` 为 3 秒、`ttl` 为 10 秒的定时器。它还将调用次数限制为 4 次。这意味着它将在 10 秒后首次触发，之后每 3 秒触发一次，持续 10 秒，但总计不超过 4 次。
```json
{
  "dueTime":"10s",
  "period":"R4/PT3S",
  "ttl":"10s"
}
```

你可以通过调用以下命令来移除 Actor 定时器

```md
DELETE http://localhost:3500/v1.0/actors/<actorType>/<actorId>/timers/<name>
```

有关更多详细信息，请参阅 [API 规范]({{% ref "actors_api#invoke-timer" %}})。

## Actor 提醒器

提醒器是一种在指定时间触发 Actor 上的*持久化*回调的机制。它们的功
