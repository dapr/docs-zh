---
type: docs
title: "特性与概念"
linkTitle: "特性与概念"
weight: 2000
description: "详细了解 Dapr Jobs 特性与概念"
---

现在你已经大致了解了 [jobs building block]({{% ref jobs-overview %}})，让我们深入了解 Dapr Jobs 和各种 SDK 所包含的特性和概念。Dapr Jobs：
- 提供了一个强大且可扩展的 API，用于调度未来要触发的操作。
- 暴露了在所有受支持的语言中都通用的多项能力。
- 使用持续时间值时支持亚秒级精度（例如 `500ms`）。实际触发精度可能因运行时而异；基于 Cron 的调度仅支持秒级精度。

## job 标识

所有 job 都使用区分大小写的 job 名称进行注册。这些名称在所有与 Dapr 运行时交互的服务中应当是唯一的。名称在创建和修改 job 时用作标识符，也用于指明被触发的调用与哪个 job 相关联。

任意时刻，一个名称只能关联一个 job。默认情况下，若使用与现有 job 相同的名称创建新 job，会返回错误。但如果将 `overwrite` 标志设置为 `true`，新 job 将覆盖同名的现有 job。

## 调度 job
可以通过以下任一机制调度 job：
- 使用 Cron 表达式、持续时间值或周期表达式定义的间隔
- 特定的日期和时间

对于所有基于时间的调度，如果通过 RFC3339 规范提供了带时区的时间戳，则使用该时区。未提供时，则使用运行 Dapr 的服务器所在的时区。换句话说，除非在调度 job 时另行指定，否则**不要**假设时间以 UTC 时区运行。

### 使用 Cron 表达式调度
使用 Cron 表达式让 job 按特定间隔执行时，表达式由 6 个字段组成，各字段的取值范围见下表：

| seconds | minutes | hours | day of month | month | day of week |
| -- | -- | -- | -- | -- | -- |
| 0-59 | 0-59 | 0-23 | 1-31 | 1-12/jan-dec | 0-6/sun-sat |

#### 示例 1
`"0 30 * * * *"` 每小时的半点触发。

#### 示例 2
`"0 15 3 * * *"` 每天 03:15 触发。

### 使用持续时间值调度
你可以使用 [Go 持续时间字符串](https://pkg.go.dev/time#ParseDuration) 调度 job。该字符串由一串（可能带符号的）十进制数字组成，每个数字可带可选的小数部分和单位后缀。有效的时间单位为 `"ns"`、`"us"`、`"ms"`、`"s"`、`"m"` 或 `"h"`。

#### 示例 1
`"2h45m"` 每 2 小时 45 分钟触发一次。

#### 示例 2
`"37m25s"` 每 37 分钟 25 秒触发一次。

### 使用周期表达式调度
支持以下周期表达式。"@every" 表达式还接受 [Go 持续时间字符串](https://pkg.go.dev/time#ParseDuration)。

| 表达式 | 描述 | 等效 Cron 表达式 |
| -- | -- | -- |
| @every | 每隔指定时间运行（例如 "@every 1h30m"） | 不适用 |
| @yearly（或 @annually） | 每年一次，1 月 1 日午夜 | 0 0 0 1 1 * |
| @monthly | 每月一次，月初午夜 | 0 0 0 1 * * |
| @weekly | 每周一次，周日午夜 | 0 0 0 * * 0 |
| @daily 或 @midnight | 每天午夜运行一次 | 0 0 0 * * * |
| @hourly | 每小时整点运行一次 | 0 0 * * * * |

### 使用特定日期/时间调度
也可以使用 [RFC3339 规范](https://www.rfc-editor.org/rfc/rfc3339) 提供日期，将 job 调度到特定的时间点执行。

#### 示例 1
`"2025-12-09T16:09:53+00:00"` 表示 job 应在 2025 年 12 月 9 日 UTC 时间下午 4:09:53 执行。

## 定时触发器
当预定的 Dapr job 被触发时，运行时会根据服务启动时向 Dapr 注册的方式，通过 HTTP 或 gRPC 向调度该 job 的服务发送一条消息。

### gRPC
当 job 到达预定的触发时间时，被触发的 job 会通过以下回调函数发送回应用程序：

> **注意：** 以下示例使用 Go 语言，但适用于任何支持 gRPC 的编程语言。

```go
import rtv1 "github.com/dapr/dapr/pkg/proto/runtime/v1"
...
func (s *JobService) OnJobEvent(ctx context.Context, in *rtv1.JobEventRequest) (*rtv1.JobEventResponse, error) {
    // 处理被触发的 job
}
```

此函数在 gRPC 服务器的上下文中处理被触发的 job。设置服务器时，请确保注册回调服务器，使其在 job 被触发时调用此函数：

```go
...
js := &JobService{}
rtv1.RegisterAppCallbackServer(server, js)
```

在这种设置下，你可以完全控制如何接收和处理被触发的 job，因为它们会直接经由此 gRPC 方法路由。

### HTTP
如果应用程序启动时没有向 Dapr 注册 gRPC 服务器，Dapr 会改为向端点 `/job/<job-name>` 发送 POST 请求来触发 job。请求体包含以下 job 信息：
- `Schedule`：job 触发的时间
- `RepeatCount`：可选值，表示 job 应重复的次数
- `DueTime`：可选的时间点，表示 job 应执行的单次时间（如果不是重复 job），或者调度开始生效的最早时间（not-before time）
- `Ttl`：可选值，表示 job 何时过期
- `Payload`：字节集合，包含 job 调度时存储的原始数据
- `Overwrite`：标志，允许请求的 job 覆盖已存在的同名 job
- `FailurePolicy`：job 的可选失败策略

`DueTime` 和 `Ttl` 字段会反映一个 RFC3339 时间戳，其时区与 job 最初调度时提供的时区一致。若未提供时区，这些值则表示运行 Dapr 的服务器所使用的时区。

### 管理 job

虽然 job 是通过 API 调用创建的，但你可以使用 dapr scheduler CLI 命令来管理（列出、检查、删除、备份和恢复）job。

#### 列出 job

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

#### 删除 job

删除指定 job：

```bash
dapr scheduler delete app/my-app/my-job
```

删除应用的所有 job：

```bash
dapr scheduler delete-all app/my-app
```

#### 备份和恢复 job

导出所有 job：

```bash
dapr scheduler export -o jobs-backup.bin
```

之后导入：

```bash
dapr scheduler import -f jobs-backup.bin
```

#### 摘要

- 使用 Jobs API 从应用程序创建或更新 job。
- 使用 dapr scheduler CLI 查看、检查、备份或删除 job。
- job 存储在 Dapr Scheduler 中，确保在重启和部署过程中依然可靠。
