---
type: docs
title: "Actor 定时器和提醒"
linkTitle: "定时器和提醒"
weight: 50
description: "为 Actor 设置定时器和提醒并执行错误处理"
aliases:
  - "/zh-hans/developing-applications/building-blocks/actors/actors-background"
---

Actor 可以通过注册定时器或提醒来调度自身的周期性工作。

定时器和提醒的功能非常相似。主要区别在于，Dapr actor 运行时在停用后不保留关于定时器的任何信息，而使用 Dapr [Scheduler]({{% ref scheduler.md %}}) 持久化关于提醒的信息。

这种区别允许用户在轻量级但无状态的定时器与资源消耗更大但有状态的提醒之间进行权衡。

定时器和提醒的调度配置总结如下：

---
`data` 是一个可选参数，包含在调用时传递给提醒回调方法的数据。

---
`dueTime` 是一个可选参数，设置首次调用回调的时间或时间间隔。如果省略 `dueTime`，回调将在定时器/提醒注册后立即被调用。

支持的格式：
- RFC3339 日期格式，例如 `2020-10-02T15:00:00Z`
- time.Duration 格式，例如 `2h30m`
- [ISO 8601 duration](https://en.wikipedia.org/wiki/ISO_8601#Durations) 格式，例如 `PT2H30M`

---
`period` 是一个可选参数，设置两次连续回调调用之间的时间间隔。当以 `ISO 8601-1 duration` 格式指定时，你还可以配置重复次数以限制回调调用的总次数。
如果省略 `period`，回调将只被调用一次。

支持的格式：
- time.Duration 格式（使用持续时间值时支持亚秒级精度），例如 `2h30m`、`500ms`
- [ISO 8601 duration](https://en.wikipedia.org/wiki/ISO_8601#Durations) 格式，例如 `PT2H30M`、`R5/PT1M30S`

---
`ttl` 是一个可选参数，设置定时器/提醒到期和删除的时间或时间间隔。如果省略 `ttl`，则不应用任何限制。

支持的格式：
* RFC3339 日期格式，例如 `2020-10-02T15:00:00Z`
* time.Duration 格式，例如 `2h30m`
* [ISO 8601 duration](https://en.wikipedia.org/wiki/ISO_8601#Durations) 格式。例如：`PT2H30M`

---
仅适用于**提醒**。

`overwrite` 是一个可选布尔参数，指示是否覆盖同名的现有提醒。
如果 `overwrite` 设置为 `true`，任何同名的现有提醒将被新配置替换。
如果 `overwrite` 设置为 `false` 或省略，并且已存在同名的提醒，操作将失败并返回已存在的错误。
请注意，覆盖现有提醒将重置其状态，包括调用次数和下次触发时间，就像创建新提醒一样。

---
仅适用于**提醒**。

`failurePolicy` 是一个可选参数，定义提醒调用失败时的行为。
支持的失败策略包括：
- `drop`：丢弃失败的调用，提醒继续按计划进行下一次调用，就好像失败没有发生一样。
- `constant`：提醒将以固定的间隔重试失败的调用指定次数。
  * `interval`：每次重试尝试之间的时间间隔。如果未指定，间隔为 "0s"，意味着立即尝试重试。
  * `maxRetries`：重试尝试的最大次数。如果未指定，调用将以指定间隔无限期重试，直到成功。

如果未指定失败策略，将应用默认的失败策略：重试 3 次，间隔为 1 秒。

---

actor 运行时会验证调度配置的正确性，并在输入无效时返回错误。

当你在 `period` 中指定重复次数以及 `ttl` 时，定时器/提醒将在任一条件满足时停止，以先发生者为准。

## Actor 定时器

你可以为 actor 注册一个基于定时器执行的回调。

Dapr actor 运行时确保回调方法遵守基于轮次的并发保证。这意味着在此回调完成执行之前，不会有其他 actor 方法或定时器/提醒回调正在进行。

Dapr actor 运行时在回调完成时保存对 actor 状态所做的更改。如果在保存状态时发生错误，该 actor 对象将被停用，并将激活一个新实例。

当 actor 作为垃圾回收的一部分被停用时，所有定时器都会停止。之后不会再调用定时器回调。此外，Dapr actor 运行时不保留关于停用前正在运行的定时器的任何信息。由 actor 在将来重新激活时注册其所需的任何定时器。

你可以通过调用对 Dapr 的 HTTP/gRPC 请求来为 actor 创建定时器，如下所示，或通过 Dapr SDK。

```md
POST/PUT http://localhost:3500/v1.0/actors/<actorType>/<actorId>/timers/<name>
```

### 示例

定时器参数在请求体中指定。

以下请求体配置了一个定时器，`dueTime` 为 9 秒，`period` 为 3 秒。这意味着它将在 9 秒后首次触发，然后每 3 秒触发一次。
```json
{
  "dueTime":"0h0m9s0ms",
  "period":"0h0m3s0ms"
}
```

以下请求体配置了一个定时器，`period` 为 3 秒（ISO 8601 duration 格式）。它还将调用次数限制为 10 次。这意味着它将触发 10 次：首先在注册后立即触发，然后每 3 秒触发一次。
```json
{
  "period":"R10/PT3S",
}
```

以下请求体配置了一个定时器，`period` 为 3 秒（ISO 8601 duration 格式），`ttl` 为 20 秒。这意味着它在注册后立即触发，然后在 20 秒的持续时间内每 3 秒触发一次。
```json
{
  "period":"PT3S",
  "ttl":"20s"
}
```

以下请求体配置了一个定时器，`dueTime` 为 10 秒，`period` 为 3 秒，`ttl` 为 10 秒。它还将调用次数限制为 4 次。这意味着它将在 10 秒后首次触发，然后在 10 秒的持续时间内每 3 秒触发一次，但总共不超过 4 次。
```json
{
  "dueTime":"10s",
  "period":"R4/PT3S",
  "ttl":"10s"
}
```

你可以通过调用以下命令来删除 actor 定时器

```md
DELETE http://localhost:3500/v1.0/actors/<actorType>/<actorId>/timers/<name>
```

有关更多详细信息，请参阅 [API 规范]({{% ref "actors_api#invoke-timer" %}})。

## Actor 提醒

提醒是一种在指定时间在 actor 上触发*持久*回调的机制。它们的功能类似于定时器。但与定时器不同，提醒在所有情况下都会被触发，直到 actor 显式注销它们或调用次数用尽。具体来说，提醒会在 actor 停用和故障转移期间触发，因为 Dapr actor 运行时使用 Dapr [Scheduler 服务]({{% ref scheduler.md %}}) 持久化关于 actor 提醒的信息。

你可以通过调用对 Dapr 的 HTTP/gRPC 请求为 actor 创建持久提醒，如下所示，或通过 Dapr SDK。

```md
POST/PUT http://localhost:3500/v1.0/actors/<actorType>/<actorId>/reminders/<name>
```

与定时器不同，提醒支持 `overwrite` 选项，允许你替换同名的现有提醒，以及 `failurePolicy` 选项，定义提醒调用失败时的行为。

### 检索 actor 提醒

你可以通过调用以下命令来检索 actor 提醒

```md
GET http://localhost:3500/v1.0/actors/<actorType>/<actorId>/reminders/<name>
```

### 删除 actor 提醒

你可以通过调用以下命令来删除 actor 提醒

```md
DELETE http://localhost:3500/v1.0/actors/<actorType>/<actorId>/reminders/<name>
```

如果触发 actor 提醒且应用未向运行时返回 2** 代码（例如，由于连接问题），actor 提醒将根据其失败策略进行重试，默认情况下是三次，每次尝试之间的退避间隔为 1 秒。
根据任何可选应用的 [actor 弹性策略]({{% ref "override-default-retries" %}})，可能会尝试额外的重试。

有关更多详细信息，请参阅 [API 规范]({{% ref "actors_api#invoke-reminder" %}})。

## 错误处理

当 actor 的方法成功完成时，运行时将继续按照指定的定时器或提醒计划调用该方法。
为了允许 actor 从故障中恢复并在崩溃或重启后重试，你可以通过配置状态存储（例如 Redis 或 Azure Cosmos DB）来持久化 actor 的状态。

如果方法的调用失败，定时器不会被删除。定时器仅在以下情况下被删除：
- sidecar 终止
- 执行次数用尽
- 你显式删除它

## 使用 CLI 管理提醒

Actor 提醒持久化在 Scheduler 中。
你可以使用 dapr scheduler CLI 命令管理它们。

#### 列出 actor 提醒

```bash
dapr scheduler list --filter actor
NAME                                  BEGIN     COUNT  LAST TRIGGER
actor/MyActorType/actorid1/test1      -3.89s    1      2025-10-03T16:58:55Z
actor/MyActorType/actorid2/test2      -3.89s    1      2025-10-03T16:58:55Z
```

获取提醒详细信息

```bash
dapr scheduler get actor/MyActorType/actorid1/test1 -o yaml
```

#### 删除提醒

删除单个提醒：

```bash
dapr scheduler delete actor/MyActorType/actorid1/test1
```

删除给定 actor 类型的所有提醒：

```bash
dapr scheduler delete-all actor/MyActorType
```

## 使用 CLI 管理提醒

Actor 提醒持久化在 Scheduler 中。
你可以使用 dapr scheduler CLI 命令管理它们。

#### 列出 actor 提醒

```bash
dapr scheduler list --filter actor
NAME                                  BEGIN     COUNT  LAST TRIGGER
actor/MyActorType/actorid1/test1      -3.89s    1      2025-10-03T16:58:55Z
actor/MyActorType/actorid2/test2      -3.89s    1      2025-10-03T16:58:55Z
```

获取提醒详细信息

```bash
dapr scheduler get actor/MyActorType/actorid1/test1 -o yaml
```

#### 删除提醒

删除单个提醒：

```bash
dapr scheduler delete actor/MyActorType/actorid1/test1
```

删除给定 actor 类型的所有提醒：

```bash
dapr scheduler delete-all actor/MyActorType
```

删除特定 actor 实例的所有提醒：

```bash
dapr scheduler delete-all actor/MyActorType/actorid1
```

删除特定 actor 类型的所有提醒：

```bash
dapr scheduler delete-all actor/MyActorType
```

删除所有提醒

```bash
dapr scheduler delete-all actor
```


#### 备份和恢复提醒

导出所有提醒：

```bash
dapr scheduler export -o reminders-backup.bin
```

从备份文件恢复：

```bash
dapr scheduler import -f reminders-backup.bin
```

#### 总结

- 提醒存储在 Dapr Scheduler 中，而不是应用中。
- 通过 Actors API 创建提醒
- 使用 `dapr scheduler` CLI 管理现有提醒（列出、获取、删除、备份/恢复）。

## 后续步骤

{{< button text="配置 actor 运行时行为 >>" page="actors-runtime-config.md" >}}

## 相关链接

- [Actors API 参考]({{% ref actors_api %}})
- [Actors 概述]({{% ref actors-overview %}})
