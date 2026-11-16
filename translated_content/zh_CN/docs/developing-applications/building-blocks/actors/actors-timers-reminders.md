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

定时器和提醒的功能非常相似。主要区别在于，Dapr Actor 运行时在 Actor 停用后不保留关于定时器的任何信息，而是使用 Dapr [Scheduler]({{% ref scheduler.md %}}) 持久化关于提醒的信息。

这一区别让用户可以在轻量但无状态的定时器与资源消耗更大但有状态的提醒之间做出权衡。

定时器和提醒的调度配置概要如下：

---
`data` 是一个可选参数，包含在调用提醒回调方法时传递的数据。

---
`dueTime` 是一个可选参数，设置首次调用回调的时间点或时间间隔。如果省略 `dueTime`，回调将在定时器/提醒注册后立即被调用。

支持的格式：
- RFC3339 日期格式，例如 `2020-10-02T15:00:00Z`
- time.Duration 格式，例如 `2h30m`
- [ISO 8601 duration](https://en.wikipedia.org/wiki/ISO_8601#Durations) 格式，例如 `PT2H30M`

---
`period` 是一个可选参数，设置两次连续回调调用之间的时间间隔。使用 `ISO 8601-1 duration` 格式指定时，你还可以配置重复次数，以限制回调调用的总次数。
如果省略 `period`，回调将只被调用一次。

支持的格式：
- time.Duration 格式（使用时长值时支持亚秒级精度），例如 `2h30m`、`500ms`
- [ISO 8601 duration](https://en.wikipedia.org/wiki/ISO_8601#Durations) 格式，例如 `PT2H30M`、`R5/PT1M30S`

---
`ttl` 是一个可选参数，设置定时器/提醒到期并被删除的时间点或时间间隔。如果省略 `ttl`，则不施加任何限制。

支持的格式：
* RFC3339 日期格式，例如 `2020-10-02T15:00:00Z`
* time.Duration 格式，例如 `2h30m`
* [ISO 8601 duration](https://en.wikipedia.org/wiki/ISO_8601#Durations) 格式。例如：`PT2H30M`

---
仅适用于**提醒**。

`overwrite` 是一个可选布尔参数，指示是否覆盖同名的现有提醒。
如果 `overwrite` 设置为 `true`，同名的现有提醒将被新配置替换。
如果 `overwrite` 设置为 `false` 或省略，且已存在同名提醒，操作将失败并返回“已存在”错误。
请注意，覆盖现有提醒会重置其 an error.state，包括调用次数和下次触发时间，与创建新提醒的效果相同。

---
仅适用于**提醒**。

`failurePolicy` 是一个可选参数，定义提醒调用失败时的行为。
支持的失败策略包括：
- `drop`：丢弃失败的调用，提醒继续按计划进行下一次调用，就好像失败从未发生过一样。
- `constant`：提醒将按固定间隔重试失败的调用，重试次数为指定值。
  * `interval`：每次重试尝试之间的时间间隔。如果未指定，间隔为“0s”，即立即重试。
  * `maxRetries`：最大重试次数。如果未指定，调用将以指定间隔无限重试，直到成功为止。

如果未指定失败策略，将应用默认失败策略，即重试 3 次，间隔为 1 秒。

---

Actor 运行时会校验调度配置的正确性，输入无效时返回错误。

当你在 `period` 中指定重复次数并同时设置 `ttl` 时，定时器/提醒会在任一条件先满足时停止。

## Actor 定时器

你可以为 Actor 注册一个基于定时器执行的回调。

Dapr Actor 运行时确保回调方法遵守基于轮次的并发保证。这意味着在此回调执行完成之前，不会有其他 Actor 方法或定时器/提醒回调正在进行。

Dapr Actor 运行时会在回调结束时保存 Actor 状态的变更。如果保存状态时发生错误，该 Actor 对象将被停用，并激活一个新实例。

作为垃圾回收的一部分，Actor 被停用时所有定时器都会停止，之后不再调用定时器回调。此外，Dapr Actor 运行时不会保留关于停用前正在运行的定时器的任何信息。Actor 在将来重新激活时，需要自行注册所需的定时器。

你可以像下面这样通过调用 Dapr 的 HTTP/gRPC 请求为 Actor 创建定时器，也可以通过 Dapr SDK 创建。

```md
POST/PUT http://localhost:3500/v1.0/actors/<actorType>/<actorId>/timers/<name>
```

### 示例

定时器参数在请求体中指定。

以下请求体配置了一个定时器，其 `dueTime` 为 9 秒，`period` 为 3 秒。这意味着它将在 9 秒后首次触发，之后每 3 秒触发一次。
```json
{
  "dueTime":"0h0m9s0ms",
  "period":"0h0m3s0ms"
}
```

以下请求体配置了一个定时器，其 `period` 为 3 秒（ISO 8601 duration 格式），并将调用次数限制为 10 次。这意味着它将触发 10 次：首先在注册后立即触发，之后每 3 秒触发一次。
```json
{
  "period":"R10/PT3S",
}
```

以下请求体配置了一个定时器，其 `period` 为 3 秒（ISO 8601 duration 格式），`ttl` 为 20 秒。这意味着它在注册后立即触发，之后在 20 秒的时长内每 3 秒触发一次。
```json
{
  "period":"PT3S",
  "ttl":"20s"
}
```

以下请求体配置了一个定时器，其 `dueTime` 为 10 秒，`period` 为 3 秒，`ttl` 为 10 秒。它还将调用次数限制为 4 次。这意味着它将在 10 秒后首次触发，之后在 10 秒的时长内每 3 秒触发一次，但总共不超过 4 次。
```json
{
  "dueTime":"10s",
  "period":"R4/PT3S",
  "ttl":"10s"
}
```

### 获取 Actor 定时器

你可以通过调用以下请求获取为 Actor 注册的单个定时器：

```md
GET http://localhost:3500/v1.0/actors/<actorType>/<actorId>/timers/<name>
```

### 列出 Actor 定时器

你可以通过调用以下请求列出为 Actor 注册的所有定时器：

```md
GET http://localhost:3500/v1.0/actors/<actorType>/<actorId>/timers
```

定时器保存在托管该 Actor 的边车的内存中，不会持久化。因此，这两个请求都必须发送给当前拥有该 Actor 的边车。托管该 Actor 类型但不拥有此 Actor 的边车会返回 `403` 和 `ERR_ACTOR_TIMER_NOT_OWNED`；不托管该 Actor 类型的边车会返回 `403` 和 `ERR_ACTOR_TIMER_NON_HOSTED`。注册时 `ttl` 已经过期的定时器不会被存储，也不会被返回。对应的 gRPC 方法为 `GetActorTimer` 和 `ListActorTimers`。

### 删除 Actor 定时器

你可以通过调用以下请求删除 Actor 定时器：

```md
DELETE http://localhost:3500/v1.0/actors/<actorType>/<actorId>/timers/<name>
```

更多详细信息，请参阅 [API 规范]({{% ref "actors_api#invoke-timer" %}})。

## Actor 提醒

提醒是一种在指定时间对 Actor 触发*持久化*回调的机制。它们的功能与定时器类似。但与定时器不同，提醒会在任何情况下被触发，直到 Actor 显式注销它们或调用次数耗尽为止。具体来说，由于 Dapr Actor 运行时使用 Dapr [Scheduler 服务]({{% ref scheduler.md %}}) 持久化 Actor 提醒的信息，提醒会在 Actor 停用和故障转移期间继续触发。

你可以像下面这样通过调用 Dapr 的 HTTP/gRPC 请求为 Actor 创建持久化提醒，也可以通过 Dapr SDK 创建。

```md
POST/PUT http://localhost:3500/v1.0/actors/<actorType>/<actorId>/reminders/<name>
```

与定时器不同，提醒支持 `overwrite` 选项，可用于替换同名的现有提醒；同时支持 `failurePolicy` 选项，用于定义提醒调用失败时的行为。

{{% alert title="注意" color="primary" %}}
从 Dapr 1.19 开始，提醒名称和 Actor ID 可以包含竖线字符（`|`）和 `@`。如果名称或 Actor ID 包含在 HTTP 路径段中不安全的字符（例如 `/`、`\`、`#`、`?`、换行符或 NUL 字节），或者是 `.` 或 `..`，或者超过最大长度，仍会被拒绝。
{{% /alert %}}

### 获取 Actor 提醒

你可以通过调用以下请求获取 Actor 提醒：

```md
GET http://localhost:3500/v1.0/actors/<actorType>/<actorId>/reminders/<name>
```

### 列出 Actor 提醒

你可以通过调用以下请求列出为 Actor 注册的所有提醒：

```md
GET http://localhost:3500/v1.0/actors/<actorType>/<actorId>/reminders
```

gRPC 对应的方法 `ListActorReminders` 也接受不带 Actor ID 的请求，用于列出给定 Actor 类型的所有 Actor 的提醒。

### 删除 Actor 提醒

你可以通过调用以下请求删除 Actor 提醒：

```md
DELETE http://localhost:3500/v1.0/actors/<actorType>/<actorId>/reminders/<name>
```

如果触发了 Actor 提醒，而应用没有向运行时返回 2** 状态码（例如由于连接问题），Actor 提醒将按其失败策略重试，默认重试三次，每次尝试之间的退避间隔为一秒。
此外，根据所应用的任何 [Actor 弹性策略]({{% ref "override-default-retries" %}})，还可能进行额外的重试。

更多详细信息，请参阅 [API 规范]({{% ref "actors_api#invoke-reminder" %}})。

## 错误处理

当 Actor 的方法成功完成时，运行时会继续按照指定的定时器或提醒计划调用该方法。
为了让 Actor 能够从故障中恢复，并在崩溃或重启后重试，你可以配置状态存储（例如 Redis 或 Azure Cosmos DB）来持久化 Actor 的状态。

如果方法调用失败，定时器不会被删除。只有在以下情况下定时器才会被删除：
- 边车终止
- 执行次数用尽
- 你显式删除它
- Actor 迁移到另一台主机（从 Dapr 1.19 开始）

从 Dapr 1.19 开始，当 Actor 迁移到另一台主机时，原主机会删除该 Actor 的定时器，因此这些定时器不会再在原主机上触发。在 1.19 之前，原主机会继续触发这些定时器，一旦在新主机上重新注册定时器，Actor 就会运行两次。所有定时器请求（包括创建和删除）都必须发送给拥有该 Actor 的边车：托管该 Actor 类型但不拥有该 Actor 的边车会以 `403` 和 `ERR_ACTOR_TIMER_NOT_OWNED`（gRPC 为 `PermissionDenied`）拒绝这些请求。Dapr 丢弃的定时器触发（例如因为定时器已被删除，或 Actor 已不再托管于该边车，比如迁移期间正在等待的触发）会计入 `dapr_runtime_actor_timers_dropped_total` 指标。

## 使用 CLI 管理提醒

Actor 提醒持久化在调度器中。
你可以使用 dapr scheduler CLI 命令管理它们。

#### 列出 Actor 提醒

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

删除给定 Actor 类型的所有提醒：

```bash
dapr scheduler delete-all actor/MyActorType
```

## 使用 CLI 管理提醒

Actor 提醒持久化在调度器中。
你可以使用 dapr scheduler CLI 命令管理它们。

#### 列出 Actor 提醒

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

删除给定 Actor 类型的所有提醒：

```bash
dapr scheduler delete-all actor/MyActorType
```

删除特定 Actor 实例的所有提醒：

```bash
dapr scheduler delete-all actor/MyActorType/actorid1
```

删除特定 Actor 类型的所有提醒：

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
- 通过 Actors API 创建、获取、列出和删除提醒。
- 使用 `dapr scheduler` CLI 管理现有提醒（列出、获取、删除、备份/恢复）。

## 后续步骤

{{< button text="配置 Actor 运行时行为 >>" page="actors-runtime-config.md" >}}

## 相关链接

- [Actors API 参考]({{% ref actors_api %}})
- [Actors 概述]({{% ref actors-overview %}})
