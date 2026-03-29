---
type: docs
title: "特性与概念"
linkTitle: "特性与概念"
weight: 2000
description: "详细了解 Dapr Jobs 特性与概念"
---

现在你已经大致了解了 [jobs 构建块]({{% ref jobs-overview %}}) ，让我们深入了解 Dapr Jobs 和各种 SDK 包含的特性和概念。Dapr Jobs：
- 提供了一个强大且可扩展的 API，用于调度未来要触发的操作。
- 暴露了在所有支持的语言中都通用的多项功能。
- 使用持续时间值时支持亚秒级精度（例如 `500ms`）。实际触发精度可能因运行时而异；基于 Cron 的调度仅支持秒级精度。

## 作业标识

所有作业都使用区分大小写的作业名称进行注册。这些名称在整个与 Dapr 运行时交互的服务中应该是唯一的。名称用作创建和修改作业时的标识符，也用于指示触发的调用与哪个作业相关联。

任意时刻一个名称只能关联一个作业。默认情况下，尝试创建与现有作业同名的作业会报错。然而，如果 `overwrite` 标志设置为 `true`，则新作业会覆盖同名作业。

## 调度作业
可以通过以下方式调度作业：
- 使用 Cron 表达式、持续时间值或周期表达式的间隔
- 特定的日期和时间

对于所有基于时间的调度，如果通过 RFC3339 规范提供了带时区的时间戳，则使用该时区。如果未提供，则使用运行 Dapr 的服务器所在的时区。换句话说，除非在调度作业时另有指定，否则**不要**假设时间以 UTC 时区运行。

### 使用 Cron 表达式调度
使用 Cron 表达式调度作业按特定间隔执行时，表达式使用 6 个字段，字段值范围见下表：

| seconds | minutes | hours | day of month | month | day of week |
| -- | -- | -- | -- | -- | -- |
| 0-59 | 0-59 | 0-23 | 1-31 | 1-12/jan-dec | 0-6/sun-sat |

#### 示例 1
`"0 30 * * * *"` 每小时的半点触发。

#### 示例 2
`"0 15 3 * * *"` 每天 03:15 触发。

### 使用持续时间值调度
可以使用 [Go 持续时间字符串](https://pkg.go.dev/time#ParseDuration) 调度作业，其中字符串由一个（可能有符号的）十进制数字序列组成，每个数字可带有可选的小数部分和单位后缀。有效的时间单位为 `"ns"`、`"us"`、`"ms"`、`"s"`、`"m"` 或 `"h"`。

#### 示例 1
`"2h45m"` 每 2 小时 45 分钟触发一次。

#### 示例 2
`"37m25s"` 每 37 分钟 25 秒触发一次。

### 使用周期表达式调度
支持以下周期表达式。"@every" 表达式也接受 [Go 持续时间字符串](https://pkg.go.dev/time#ParseDuration)。

| 表达式 | 描述 | 等效 Cron 表达式 |
| -- | -- | -- |
| @every | 每隔指定时间运行（例如 "@every 1h30m"） | 不适用 |
| @yearly（或 @annually） | 每年一次，1 月 1 日午夜 | 0 0 0 1 1 * |
| @monthly | 每月一次，月初午夜 | 0 0 0 1 * * |
| @weekly | 每周一次，周日午夜 | 0 0 0 * * 0 |
| @daily 或 @midnight | 每天午夜运行一次 | 0 0 0 * * * |
| @hourly | 每小时整点运行一次 | 0 0 * * * * |

### 使用特定日期/时间调度
也可以通过使用 [RFC3339 规范](https://www.rfc-editor.org/rfc/rfc3339) 提供日期，将作业调度到特定时间点执行。

#### 示例 1
`"2025-12-09T16:09:53+00:00"` 表示作业应在 2025 年 12 月 9 日 UTC 时间下午 4:09:53 执行。

## 定时触发器
当预定的 Dapr 作业被触发时，运行时根据服务启动时向 Dapr 注册的方式，通过 HTTP 或 gRPC 向调度该作业的服务发送消息。

### gRPC
当作业到达预定的触发时间时，触发的作业通过以下回调函数发送回应用程序：

> **注意：** 以下示例使用 Go 语言，但适用于任何支持 gRPC 的编程语言。

```go
import rtv1 "github.com/dapr/dapr/pkg/proto/runtime/v1"
...
func (s *JobService) OnJobEventAlpha1(ctx context.Context, in *rtv1.JobEventRequest) (*rtv1.JobEventResponse, error) {
    // Handle the triggered job
}
```

此函数在 gRPC 服务器的上下文中处理触发的作业。设置服务器时，请确保注册回调服务器，该服务器在作业被触发时调用此函数：

```go
...
js := &JobService{}
rtv1.RegisterAppCallbackAlphaServer(server, js)
```

在此设置下，你可以完全控制如何接收和处理触发的作业，因为它们通过此 gRPC 方法直接路由。

### HTTP
如果应用程序启动时未向 Dapr 注册 gRPC 服务器，则 Dapr 会通过向端点 `/job/<job-name>` 发送 POST 请求来触发作业。请求体包含以下作业信息：
- `Schedule`：作业触发的时间
- `RepeatCount`：可选值，指示作业应重复的次数
- `DueTime`：可选的时间点，表示作业应执行的单次时间（如果非重复），或者调度生效的最早开始时间
- `Ttl`：可选值，指示作业何时过期
- `Payload`：包含作业调度时原始存储数据的字节集合
- `Overwrite`：标志，允许请求的作业覆盖已存在的同名作业
- `FailurePolicy`：作业的可选失败策略

`DueTime` 和 `Ttl` 字段将反映 RFC3339 时间戳值，反映作业最初调度时提供的时区。如果未提供时区，这些值表示运行 Dapr 的服务器使用的时区。

### 管理作业

虽然作业通过 API 调用创建，但你可以通过 dapr scheduler CLI 命令管理（列出、检查、删除、备份和恢复）作业。

#### 列出作业

```bash
dapr scheduler list --filter app
NAME                           BEGIN     COUNT  LAST TRIGGER
app/my-app/my-job              -3.89s    1      2025-10-03T16:58:55Z
app/my-app/another-job         -3.89s    1      2025-10-03T16:58:55Z
```

```bash
dapr scheduler list -o wide
NAMESPACE  NAME                     BEGIN                 EXPIRATION   SCHEDULE     DUE TIME                   TTL   REPEATS  COUNT  LAST TRIGGER
default    app/my-app/my-job        2025-10-03T16:58:55Z               @every 5s   2025-10-03T17:58:55+01:00        100      1      2025-10-03T16:58:55Z
```

```bash
dapr scheduler get app/my-app/my-job -o yaml
```

#### 删除作业

删除指定作业：

```bash
dapr scheduler delete app/my-app/my-job
```

删除应用的所有作业：

```bash
dapr scheduler delete-all app/my-app
```

#### 备份和恢复作业

导出所有作业：

```bash
dapr scheduler export -o jobs-backup.bin
```

之后导入：

```bash
dapr scheduler import -f jobs-backup.bin
```

#### 摘要

- 使用 Jobs API 从应用程序创建或更新作业。
- 使用 dapr scheduler CLI 查看、检查、备份或删除作业。
- 作业存储在 Dapr Scheduler 中，确保在重启和部署时的可靠性。
