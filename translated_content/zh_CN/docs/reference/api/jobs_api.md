---
type: docs
title: "Jobs API 参考"
linkTitle: "Jobs API"
description: "Jobs API 的详细文档"
weight: 900
---

使用 jobs API，你可以在将来调度 job 和任务。

> HTTP API 仅用于开发和测试。对于生产场景，强烈建议使用 SDK，因为它们实现了 gRPC API，提供了比 HTTP API 更高的性能和功能。这是因为 HTTP 进行 JSON 序列化可能会很昂贵，而使用 gRPC，数据按原样传输和存储，性能更高。

## 调度 job

使用名称调度 job。job 基于运行 Scheduler service 的服务器时钟进行调度。时间戳不会转换为 UTC。你可以在 RFC3339 格式的时间戳中提供时区，以指定 job 应遵循的时区。如果未提供时区，则使用服务器的本地时间。

```
POST http://localhost:<daprPort>/v1.0/jobs/<name>
```

### URL 参数

{{% alert title="注意" color="primary" %}}
必须至少提供 `schedule` 或 `dueTime` 之一，但它们也可以一起提供。
{{% /alert %}}

参数 | 描述
--------- | -----------
`name` | 你正在调度的 job 的名称
`data` | 可选的 JSON 序列化值或对象，在 job 触发时发送给应用。
`schedule` | job 运行的可选调度。格式详情见下文。
`dueTime` | job 应激活的可选时间，或在未提供其他调度类型字段时的“一次性”时间。接受 RFC3339 格式的“时间点”字符串、Go duration 字符串（从创建时间计算）或非重复的 ISO8601 格式。
`repeats` | job 应触发的可选次数。如果未设置，job 将无限期运行或直到过期。
`ttl` | job 的可选生存时间或过期时间。接受 RFC3339 格式的“时间点”字符串、Go duration 字符串（从 job 创建时间计算）或非重复的 ISO8601 格式。
`overwrite` | 一个布尔值，指定 job 是否可以覆盖同名的现有 job。默认值为 `false`
`failure_policy` | job 的可选失败策略。格式详情见下文。如果未设置，job 将最多重试 3 次，每次重试之间延迟 1 秒。

{{% alert title="注意" color="primary" %}}
从 Dapr 1.19 开始，job 名称可以包含竖线字符（`|`）和 `@`。如果 job 名称包含在 HTTP 路径段中不安全的字符（例如 `/`、`\`、`#`、`?`、换行符或 NUL 字节），是 `.` 或 `..`，或超过最大长度，则仍会被拒绝。
{{% /alert %}}

#### schedule
`schedule` 接受 systemd timer 风格的 cron 表达式以及人类可读的“@”前缀周期字符串，定义如下。

systemd timer 风格的 cron 接受 6 个字段：
秒 | 分钟 | 小时 | 日（月） | 月          | 日（周）
---     | ---     | ---   | ---          | ---          | ---
0-59    | 0-59    | 0-23  | 1-31         | 1-12/jan-dec | 0-6/sun-sat

##### 示例 1
"0 30 * * * *" - 每小时的半小时时

##### 示例 2
"0 15 3 * * *" - 每天 03:15

周期字符串表达式：
条目                  | 描述                                | 等效于
-----                  | -----------                                | -------------
@every <duration>      | 每 <duration> 运行一次（例如 '@every 1h30m'） | N/A
@yearly（或 @annually） | 每年运行一次，1 月 1 日午夜        | 0 0 0 1 1 *
@monthly               | 每月运行一次，月初午夜 | 0 0 0 1 * *
@weekly                | 每周运行一次，周日午夜        | 0 0 0 * * 0
@daily（或 @midnight）  | 每天运行一次，午夜                   | 0 0 0 * * *
@hourly                | 每小时运行一次，小时开始        | 0 0 * * * *

##### 时区

默认情况下，`schedule` 按 Scheduler service 所在时区的本地时间计算。若要将 job 固定到特定时区，请在调度表达式前加上 `CRON_TZ=<timezone>`（或等效的 `TZ=<timezone>`），其中 `<timezone>` 是 [IANA 时区数据库](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)中的名称，例如 `Europe/Rome` 或 `Asia/Tokyo`。

```json
{
  "schedule": "CRON_TZ=Europe/Rome 0 0 9 * * *"
}
```

时区作用于挂钟时间，因此 job 在夏令时切换前后都保持本地时间不变。上面的调度表达式全年都在罗马时间 09:00 运行：当罗马结束夏令时时，对应的 UTC 时刻会从 07:00Z 变为 08:00Z，而无需重新调度 job。

前缀同样适用于映射到一天中固定时刻的 `@` 周期字符串，例如 `CRON_TZ=Europe/Rome @daily`。

{{% alert title="注意" color="primary" %}}
时区前缀不能与 `@every <duration>` 调度一起使用。这类调度按固定间隔触发，而不是按挂钟时间触发，因此时区没有可以应用的挂钟时间，job 在调度时会被拒绝。
{{% /alert %}}

无法识别的时区名称同样会导致 job 在调度时被拒绝。

#### failure_policy

`failure_policy` 指定 job 应如何处理失败。

它可以设置为 `constant` 或 `drop`。
- `constant` 策略使用以下配置选项持续重试 job。
  - `max_retries` 配置 job 应重试的次数。默认为无限重试。`nil` 表示无限重试，而 `0` 表示不会重试请求。
  - `interval` 配置重试之间的延迟。默认为立即重试。有效值的形式为 `200ms`、`15s`、`2m` 等。
- `drop` 策略在第一次失败后丢弃 job，不进行重试。

##### 示例 1

```json
{
  //...
  "failure_policy": {
    "constant": {
      "max_retries": 3,
      "interval": "10s"
    }
  }
}
```
##### 示例 2

```json
{
  //...
  "failure_policy": {
    "drop": {}
  }
}
```

### 请求体

```json
{
  "data": "some data",
  "dueTime": "30s"
}
```

### HTTP 响应代码

代码 | 描述
---- | -----------
`204`  | 已接受
`400`  | 请求格式错误
`500` | 请求格式正确，但 dapr 代码或 Scheduler control plane service 中出现错误

### 响应内容

以下示例 curl 命令创建一个 job，将 job 命名为 `jobforjabba` 并指定 `schedule`、`repeats` 和 `data`。

```bash
$ curl -X POST \
  http://localhost:3500/v1.0/jobs/jobforjabba \
  -H "Content-Type: application/json" \
  -d '{
        "data": "{\"value\":\"Running spice\"}",
        "schedule": "@every 1m",
        "repeats": 5
    }'
```

## 获取 job 数据

根据名称获取 job。

```
GET http://localhost:<daprPort>/v1.0/jobs/<name>
```

### URL 参数

参数 | 描述
--------- | -----------
`name` | 你正在检索的已调度 job 的名称

### HTTP 响应代码

代码 | 描述
---- | -----------
`200`  | 已接受
`400`  | 请求格式错误
`500` | 请求格式正确，但 job 不存在，或 dapr 代码或 Scheduler control plane service 中出现错误

### 响应内容

运行以下示例 curl 命令后，返回的响应是包含 job 的 `name`、`dueTime` 和 `data` 的 JSON。

```bash
$ curl -X GET http://localhost:3500/v1.0/jobs/jobforjabba -H "Content-Type: application/json"
```

```json
{
  "name": "jobforjabba",
  "schedule": "@every 1m",
  "repeats": 5,
  "data": 123
}
```
## 删除 job

删除命名 job。

```
DELETE http://localhost:<daprPort>/v1.0/jobs/<name>
```

### URL 参数

参数 | 描述
--------- | -----------
`name` | 你正在删除的 job 的名称

### HTTP 响应代码

代码 | 描述
---- | -----------
`204`  | 已接受
`400`  | 请求格式错误
`500` | 请求格式正确，但 dapr 代码或 Scheduler control plane service 中出现错误

### 响应内容

在以下示例 curl 命令中，将删除名为 `test1` 且 app-id 为 `sub` 的 job

```bash
$ curl -X DELETE http://localhost:3500/v1.0/jobs/jobforjabba -H "Content-Type: application/json"
```


## 后续步骤

[Jobs API 概述]({{% ref jobs-overview.md %}})
