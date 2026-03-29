---
type: docs
title: "Jobs API 参考"
linkTitle: "Jobs API"
description: "Jobs API 的详细文档"
weight: 900
---

{{% alert title="注意" color="primary" %}}
Jobs API 目前处于 alpha 阶段。
{{% /alert %}}

使用 jobs API，您可以在将来安排作业和任务。

> HTTP API 仅用于开发和测试。对于生产场景，强烈建议使用 SDK，因为它们实现了 gRPC API，提供了比 HTTP API 更高的性能和功能。这是因为 HTTP 进行 JSON 序列化可能会很昂贵，而使用 gRPC，数据按原样传输和存储，性能更高。

## 调度作业

使用名称调度作业。作业基于运行 Scheduler 服务的服务器时钟进行调度。时间戳不会转换为 UTC。您可以在 RFC3339 格式的时间戳中提供时区，以指定作业应遵循的时区。如果未提供时区，则使用服务器的本地时间。

```
POST http://localhost:<daprPort>/v1.0-alpha1/jobs/<name>
```

### URL 参数

{{% alert title="注意" color="primary" %}}
必须至少提供 `schedule` 或 `dueTime` 之一，但它们也可以一起提供。
{{% /alert %}}

参数 | 描述
--------- | -----------
`name` | 您正在调度的作业的名称
`data` | JSON 序列化值或对象。
`schedule` | 作业运行的可选调度。格式详情见下文。
`dueTime` | 作业应激活的可选时间，或在未提供其他调度类型字段时的"一次性"时间。接受 RFC3339 格式的"时间点"字符串、Go duration 字符串（从创建时间计算）或非重复的 ISO8601 格式。
`repeats` | 作业应触发的可选次数。如果未设置，作业将无限期运行或直到过期。
`ttl` | 作业的可选生存时间或过期时间。接受 RFC3339 格式的"时间点"字符串、Go duration 字符串（从作业创建时间计算）或非重复的 ISO8601 格式。
`overwrite` | 一个布尔值，指定作业是否可以覆盖同名的现有作业。默认值为 `false`
`failure_policy` | 作业的可选失败策略。格式详情见下文。如果未设置，作业将重试最多 3 次，重试之间延迟 1 秒。

#### schedule
`schedule` 接受 systemd timer 风格的 cron 表达式以及人类可读的"@"前缀周期字符串，定义如下。

Systemd timer 风格的 cron 接受 6 个字段：
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

#### failure_policy

`failure_policy` 指定作业应如何处理失败。

它可以设置为 `constant` 或 `drop`。
- `constant` 策略使用以下配置选项持续重试作业。
  - `max_retries` 配置作业应重试的次数。默认为无限重试。`nil` 表示无限重试，而 `0` 表示不会重试请求。
  - `interval` 配置重试之间的延迟。默认为立即重试。有效值的形式为 `200ms`、`15s`、`2m` 等。
- `drop` 策略在第一次失败后丢弃作业，不进行重试。

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
`500`  | 请求格式正确，但 dapr 代码或 Scheduler 控制平面服务中出现错误

### 响应内容

以下示例 curl 命令创建一个作业，将作业命名为 `jobforjabba` 并指定 `schedule`、`repeats` 和 `data`。

```bash
$ curl -X POST \
  http://localhost:3500/v1.0-alpha1/jobs/jobforjabba \
  -H "Content-Type: application/json" \
  -d '{
        "data": "{\"value\":\"Running spice\"}",
        "schedule": "@every 1m",
        "repeats": 5
    }'
```

## 获取作业数据

根据名称获取作业。

```
GET http://localhost:<daprPort>/v1.0-alpha1/jobs/<name>
```

### URL 参数

参数 | 描述
--------- | -----------
`name` | 您正在检索的已调度作业的名称

### HTTP 响应代码

代码 | 描述
---- | -----------
`200`  | 已接受
`400`  | 请求格式错误
`500`  | 请求格式正确，作业不存在或 dapr 代码或 Scheduler 控制平面服务中出现错误

### 响应内容

运行以下示例 curl 命令后，返回的响应是包含作业的 `name`、`dueTime` 和 `data` 的 JSON。

```bash
$ curl -X GET http://localhost:3500/v1.0-alpha1/jobs/jobforjabba -H "Content-Type: application/json"
```

```json
{
  "name": "jobforjabba",
  "schedule": "@every 1m",
  "repeats": 5,
  "data": 123
}
```
## 删除作业

删除命名作业。

```
DELETE http://localhost:<daprPort>/v1.0-alpha1/jobs/<name>
```

### URL 参数

参数 | 描述
--------- | -----------
`name` | 您正在删除的作业的名称

### HTTP 响应代码

代码 | 描述
---- | -----------
`204`  | 已接受
`400`  | 请求格式错误
`500`  | 请求格式正确，但 dapr 代码或 Scheduler 控制平面服务中出现错误

### 响应内容

在以下示例 curl 命令中，将删除名为 `test1` 且 app-id 为 `sub` 的作业

```bash
$ curl -X DELETE http://localhost:3500/v1.0-alpha1/jobs/jobforjabba -H "Content-Type: application/json"
```


## 后续步骤

[Jobs API 概述]({{% ref jobs-overview.md %}})
