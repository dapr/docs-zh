---
type: docs
title: "Actors API 参考文档"
linkTitle: "Actors API"
description: "Actors API 的详细文档"
weight: 200
---

Dapr 提供了原生、跨平台且跨语言的 virtual Actor 功能。
除了[特定语言的 SDK]({{%ref sdks%}})外，开发者还可以使用以下 API 端点调用 Actor。

## 用户服务代码调用 Dapr

### 调用 Actor 方法

通过 Dapr 调用 Actor 方法。

#### HTTP 请求

```
POST/GET/PUT/DELETE http://localhost:<daprPort>/v1.0/actors/<actorType>/<actorId>/method/<method>
```

#### HTTP 响应码

代码 | 描述
---- | -----------
200  | 请求成功
403  | Actor 类型以 `dapr.internal.` 开头，该前缀保留给 Dapr workflow runtime 使用（`ERR_ACTOR_TYPE_RESERVED`）
500  | 请求失败
XXX  | 来自上游调用的状态码

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口。
`actorType` | Actor 类型。
`actorId` | Actor ID。
`method` | 要调用的方法名称。

> 注意，所有 URL 参数都区分大小写。

#### 示例

调用 Actor 方法的示例：

```shell
curl -X POST http://localhost:3500/v1.0/actors/stormtrooper/50/method/shoot \
  -H "Content-Type: application/json"
```

你可以在请求正文中提供方法参数和值，例如在 curl 中使用 `-d "{\"param\":\"value\"}"`。调用带参数的 Actor 方法的示例：

```shell
curl -X POST http://localhost:3500/v1.0/actors/x-wing/33/method/fly \
  -H "Content-Type: application/json" \
  -d '{
        "destination": "Hoth"
      }'
```

或

```shell
curl -X POST http://localhost:3500/v1.0/actors/x-wing/33/method/fly \
  -H "Content-Type: application/json" \
  -d "{\"destination\":\"Hoth\"}"
```

来自远程端点的响应（方法返回值）会在请求正文中返回。

### Actor state transactions

将 Actor 的状态更改作为多项事务持久化。

***请注意，此操作依赖于使用支持多项事务的 state store 组件。***

#### TTL

在[启用了 `ActorStateTTL` 功能]({{% ref
"support-preview-features.md" %}})的情况下，Actor 客户端可以在事务的 metadata 中设置 `ttlInSeconds`
字段，使状态在指定的秒数后过期。如果未设置 `ttlInSeconds` 字段，状态将不会过期。

在构建启用此功能的 Actor 应用程序时请注意；
目前，所有 Actor SDK 即使在状态过期之后，仍会在其本地缓存中保留 Actor 状态。这意味着，如果 TTL 已过期，Actor 状态不会从本地缓存中移除，直到 Actor 重新启动或被停用。此行为将在未来版本中更改。

有关 Actor state TTL 的更多详细信息，请参阅 Dapr Community Call 80 录像。

{{< youtube id=kVpQYkGemRc start=28 >}}

#### HTTP 请求

```
POST/PUT http://localhost:<daprPort>/v1.0/actors/<actorType>/<actorId>/state
```

#### HTTP 响应码

代码 | 描述
---- | -----------
204  | 请求成功
400  | Actor 未找到
500  | 请求失败

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口。
`actorType` | Actor 类型。
`actorId` | Actor ID。

> 注意，所有 URL 参数都区分大小写。

#### 示例

> 注意，以下示例使用了 `ttlInSeconds` 字段，该字段需要[启用了 `ActorStateTTL` 功能]({{% ref "support-preview-features.md" %}})。

```shell
curl -X POST http://localhost:3500/v1.0/actors/stormtrooper/50/state \
  -H "Content-Type: application/json" \
  -d '[
       {
         "operation": "upsert",
         "request": {
           "key": "key1",
           "value": "myData",
           "metadata": {
             "ttlInSeconds": "3600"
           }
         }
       },
       {
         "operation": "delete",
         "request": {
           "key": "key2"
         }
       }
      ]'
```

### 获取 Actor 状态

使用指定的键获取 Actor 的状态。

#### HTTP 请求

```
GET http://localhost:<daprPort>/v1.0/actors/<actorType>/<actorId>/state/<key>
```

#### HTTP 响应码

代码 | 描述
---- | -----------
200  | 请求成功
204  | 键未找到，响应将为空
400  | Actor 未找到
500  | 请求失败

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口。
`actorType` | Actor 类型。
`actorId` | Actor ID。
`key` | 状态值的键。

> 注意，所有 URL 参数都区分大小写。

#### 示例

```shell
curl http://localhost:3500/v1.0/actors/stormtrooper/50/state/location \
  -H "Content-Type: application/json"
```

上述命令返回状态：

```json
{
  "location": "Alderaan"
}
```

### 创建 Actor reminder

为 Actor 创建持久化的 reminder。

#### HTTP 请求

```
POST/PUT http://localhost:<daprPort>/v1.0/actors/<actorType>/<actorId>/reminders/<name>
```

#### Reminder 请求正文

包含以下字段的 JSON 对象：

| 字段 | 描述 |
|-------|--------------|
| `dueTime` | 指定 reminder 在此时间之后被触发。其格式应为 [time.ParseDuration](https://pkg.go.dev/time#ParseDuration)
| `period` | 指定不同调用之间的时间间隔。其格式应为 [time.ParseDuration](https://pkg.go.dev/time#ParseDuration) 或带有可选重复次数的 ISO 8601 持续时间格式。
| `ttl` | 设置 timer 或 reminder 到期并被删除的时间点或时间间隔。其格式应为 [time.ParseDuration 格式](https://pkg.go.dev/time#ParseDuration)、RFC3339 日期格式或 ISO 8601 持续时间格式。
| `data` |  一个字符串值，可以是任何相关内容。reminder 过期时会返回该内容。例如，这对于返回 URL 或与内容相关的任何其他信息可能很有用。

`period` 字段支持 `time.Duration` 格式和 ISO 8601 格式，但有一些限制。对于 `period`，仅支持 ISO 8601 持续时间 `Rn/PnYnMnWnDTnHnMnS` 的持续时间格式。`Rn/` 指定 reminder 将被调用 `n` 次。 

- `n` 应为大于 0 的正整数。 
- 如果某些值为 0，可以缩短 `period`；例如，10 秒可以在 ISO 8601 持续时间中写作 `PT10S`。

如果未指定 `Rn/`，reminder 将无限次运行，直到被删除。

如果只设置了 `ttl` 和 `dueTime`，reminder 仍会被接受。但是，只有 `dueTime` 生效。例如，reminder 在 `dueTime` 触发，而 `ttl` 被忽略。

如果设置了 `ttl`、`dueTime` 和 `period`，reminder 会先在 `dueTime` 触发，然后根据 `period` 和 `ttl` 重复触发并过期。

以下示例指定了 3 秒的 `dueTime` 和 7 秒的 period。

```json
{
  "dueTime":"0h0m3s0ms",
  "period":"0h0m7s0ms"
}
```

`dueTime` 为 0 表示立即触发。以下正文表示立即触发，然后每 9 秒触发一次。

```json
{
  "dueTime":"0h0m0s0ms",
  "period":"0h0m9s0ms"
}
```

要将 reminder 配置为仅触发一次，应将 period 设置为空字符串。以下内容指定了 3 秒的 `dueTime`，period 为空字符串，这意味着 reminder 将在 3 秒后触发，之后不再触发。

```json
{
  "dueTime":"0h0m3s0ms",
  "period":""
}
```

当你在 `period` 和 `ttl` 中都指定了重复次数时，timer 或 reminder 会在任一条件满足时停止。以下示例中的 timer 的 `period` 为 3 秒（ISO 8601 持续时间格式），`ttl` 为 20 秒。该 timer 在注册后立即触发，然后在 20 秒内每 3 秒触发一次，之后由于 `ttl` 已满足而不再触发。

```json
{
  "period":"PT3S",
  "ttl":"20s"
}
```

需要 data 的描述。

```json
{
  "data": "someData",
  "dueTime": "1m",
  "period": "20s"
}
```

#### HTTP 响应码

代码 | 描述
---- | -----------
204  | 请求成功
500  | 请求失败
400  | Actor 未找到或请求格式错误

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口。
`actorType` | Actor 类型。
`actorId` | Actor ID。
`name` | 要创建的 reminder 名称。

> 注意，所有 URL 参数都区分大小写。

#### 示例

```shell
curl http://localhost:3500/v1.0/actors/stormtrooper/50/reminders/checkRebels \
  -H "Content-Type: application/json" \
-d '{
      "data": "someData",
      "dueTime": "1m",
      "period": "20s"
    }'
```

### 获取 Actor reminder

获取 Actor 的 reminder。

#### HTTP 请求

```
GET http://localhost:<daprPort>/v1.0/actors/<actorType>/<actorId>/reminders/<name>
```

#### HTTP 响应码

代码 | 描述
---- | -----------
200  | 请求成功
500  | 请求失败

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口。
`actorType` | Actor 类型。
`actorId` | Actor ID。
`name` | 要获取的 reminder 名称。

> 注意，所有 URL 参数都区分大小写。

#### 示例

```shell
curl http://localhost:3500/v1.0/actors/stormtrooper/50/reminders/checkRebels \
  "Content-Type: application/json"
```

上述命令返回 reminder：

```json
{
  "dueTime": "1s",
  "period": "5s",
  "data": "0",
}
```

### 列出 Actor reminders

列出为 Actor 注册的所有 reminder。

#### HTTP 请求

```
GET http://localhost:<daprPort>/v1.0/actors/<actorType>/<actorId>/reminders
```

#### HTTP 响应码

代码 | 描述
---- | -----------
200  | 请求成功
403  | Actor 类型未由此应用托管
500  | 请求失败

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口。
`actorType` | Actor 类型。
`actorId` | Actor ID。

> 注意，所有 URL 参数都区分大小写。

#### 响应正文

包含 `reminders` 数组的 JSON 对象。每个条目包含以下字段；未在 reminder 上设置的可选字段会被省略。

| 字段 | 描述 |
|-------|-------------|
| `name` | reminder 的名称。 |
| `actorType` | Actor 类型。 |
| `actorID` | Actor ID。 |
| `dueTime` | 注册 reminder 时使用的 `dueTime`。 |
| `period` | 两次调用之间的间隔，格式与 Scheduler 报告的格式一致，例如 `@every 20s`。 |
| `ttl` | reminder 过期的时间，以 RFC3339 时间戳表示。 |
| `data` | 注册 reminder 时提供的 `data`，按原样返回。 |

当 Actor 没有 reminder 时，`reminders` 为空数组。

#### 示例

```shell
curl http://localhost:3500/v1.0/actors/stormtrooper/50/reminders \
  -H "Content-Type: application/json"
```

上述命令返回为该 Actor 注册的 reminder：

```json
{
  "reminders": [
    {
      "name": "checkRebels",
      "actorType": "stormtrooper",
      "actorID": "50",
      "dueTime": "1m",
      "period": "@every 20s",
      "data": "someData"
    },
    {
      "name": "patrol",
      "actorType": "stormtrooper",
      "actorID": "50",
      "dueTime": "2h",
      "ttl": "2026-12-31T23:59:59Z",
      "data": {
        "sector": 7
      }
    }
  ]
}
```

#### gRPC

对应的 gRPC 方法为 `dapr.proto.runtime.v1.Dapr/ListActorReminders`。

```proto
rpc ListActorReminders(ListActorRemindersRequest) returns (ListActorRemindersResponse) {}

message ListActorRemindersRequest {
  string actor_type = 1;
  optional string actor_id = 2;
}

message ListActorRemindersResponse {
  repeated NamedActorReminder reminders = 1;
}

message NamedActorReminder {
  string name = 1;
  ActorReminder reminder = 2;
}

message ActorReminder {
  string actor_type = 1;
  string actor_id = 2;
  optional string due_time = 4;
  optional string period = 5;
  google.protobuf.Any data = 6;
  optional string ttl = 7;
}
```

与 HTTP 端点不同，gRPC 请求中的 `actor_id` 是可选的：省略它即可列出给定类型所有 Actor 的 reminder。通过 gRPC 时，`data` 是一个 `google.protobuf.Any`，它包装了一个 `google.protobuf.BytesValue`，其中包含注册 reminder 时所用的 JSON 编码负载。

### 删除 Actor reminder

删除 Actor 的 reminder。

#### HTTP 请求

```
DELETE http://localhost:<daprPort>/v1.0/actors/<actorType>/<actorId>/reminders/<name>
```

#### HTTP 响应码

代码 | 描述
---- | -----------
204  | 请求成功
500  | 请求失败

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口。
`actorType` | Actor 类型。
`actorId` | Actor ID。
`name` | 要删除的 reminder 名称。

> 注意，所有 URL 参数都区分大小写。

#### 示例

```shell
curl -X DELETE http://localhost:3500/v1.0/actors/stormtrooper/50/reminders/checkRebels \
  -H "Content-Type: application/json"
```

### 创建 Actor timer

为 Actor 创建 timer。

#### HTTP 请求

```
POST/PUT http://localhost:<daprPort>/v1.0/actors/<actorType>/<actorId>/timers/<name>
```

#### Timer 请求正文：
timer 请求正文的格式与 [Actor reminders]({{% ref "#reminder-请求正文" %}}) 相同。例如：

以下内容指定了 3 秒的 `dueTime` 和 7 秒的 period。

```json
{
  "dueTime":"0h0m3s0ms",
  "period":"0h0m7s0ms"
}
```

`dueTime` 为 0 表示立即触发。以下正文表示立即触发，然后每 9 秒触发一次。

```json
{
  "dueTime":"0h0m0s0ms",
  "period":"0h0m9s0ms"
}
```

#### HTTP 响应码

代码 | 描述
---- | -----------
204  | 请求成功
500  | 请求失败
400  | Actor 未找到或请求格式错误
403  | Actor 未由此 sidecar 拥有（`ERR_ACTOR_TIMER_NOT_OWNED`）

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口。
`actorType` | Actor 类型。
`actorId` | Actor ID。
`name` | 要创建的 timer 名称。

> 注意，所有 URL 参数都区分大小写。

#### 示例

```shell
curl http://localhost:3500/v1.0/actors/stormtrooper/50/timers/checkRebels \
    -H "Content-Type: application/json" \
-d '{
      "data": "someData",
      "dueTime": "1m",
      "period": "20s",
      "callback": "myEventHandler"
    }'
```

### 获取 Actor timer

获取为 Actor 注册的 timer。

{{% alert title="注意" color="primary" %}}
timer 不会被持久化：它们保存在承载该 Actor 的 sidecar 的内存中。获取和列出请求必须发送到该 sidecar。如果 sidecar 承载该 Actor 类型但当前并不拥有该 Actor，它会以 `403` 拒绝请求，并返回 `ERR_ACTOR_TIMER_NOT_OWNED` 错误码；如果 sidecar 不承载该 Actor 类型，则返回 `403` 和 `ERR_ACTOR_TIMER_NON_HOSTED`。在注册时 `ttl` 已经过期的 timer 不会被存储，也不会被返回。
{{% /alert %}}

#### HTTP 请求

```
GET http://localhost:<daprPort>/v1.0/actors/<actorType>/<actorId>/timers/<name>
```

#### HTTP 响应码

代码 | 描述
---- | -----------
200  | 请求成功
403  | Actor 类型未由此应用托管，或 Actor 未由此 sidecar 拥有
404  | timer 未找到
500  | 请求失败

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口。
`actorType` | Actor 类型。
`actorId` | Actor ID。
`name` | 要获取的 timer 名称。

> 注意，所有 URL 参数都区分大小写。

#### 响应正文

包含以下字段的 JSON 对象；未在 timer 上设置的可选字段会被省略。

| 字段 | 描述 |
|-------|-------------|
| `actorType` | Actor 类型。 |
| `actorID` | Actor ID。 |
| `dueTime` | 注册 timer 时使用的 `dueTime`。 |
| `period` | 两次调用之间的间隔，格式与 reminder 相同，例如 `@every 20s`。 |
| `ttl` | timer 过期的时间，以 RFC3339 时间戳表示。 |
| `callback` | 注册 timer 时使用的 `callback`。 |
| `data` | 注册 timer 时提供的 `data`，按原样返回。 |

#### 示例

```shell
curl http://localhost:3500/v1.0/actors/stormtrooper/50/timers/checkRebels \
  -H "Content-Type: application/json"
```

上述命令返回 timer：

```json
{
  "actorType": "stormtrooper",
  "actorID": "50",
  "dueTime": "1m",
  "period": "@every 20s",
  "callback": "myEventHandler",
  "data": "someData"
}
```

#### gRPC

对应的 gRPC 方法为 `dapr.proto.runtime.v1.Dapr/GetActorTimer`。

```proto
rpc GetActorTimer(GetActorTimerRequest) returns (GetActorTimerResponse) {}

message GetActorTimerRequest {
  string actor_type = 1;
  string actor_id = 2;
  string name = 3;
}

message GetActorTimerResponse {
  string actor_type = 1;
  string actor_id = 2;
  optional string due_time = 3;
  optional string period = 4;
  optional string ttl = 5;
  optional string callback = 6;
  google.protobuf.Any data = 7;
}
```

请求不存在的 timer 会以 `NOT_FOUND` 失败。发送到不承载该 Actor 类型、或不拥有该 Actor 的 sidecar 的请求，会以 `PERMISSION_DENIED` 失败。通过 gRPC 时，`data` 是一个 `google.protobuf.Any`，它包装了一个 `google.protobuf.BytesValue`，其中包含注册 timer 时所用的 JSON 编码负载。

### 列出 Actor timers

列出为 Actor 注册的所有 timer。与[获取 Actor timer]({{% ref "#获取-actor-timer" %}})相同的归属规则适用：请求必须发送到当前承载该 Actor 的 sidecar。

#### HTTP 请求

```
GET http://localhost:<daprPort>/v1.0/actors/<actorType>/<actorId>/timers
```

#### HTTP 响应码

代码 | 描述
---- | -----------
200  | 请求成功
403  | Actor 类型未由此应用托管，或 Actor 未由此 sidecar 拥有
500  | 请求失败

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口。
`actorType` | Actor 类型。
`actorId` | Actor ID。

> 注意，所有 URL 参数都区分大小写。

#### 响应正文

包含 `timers` 数组的 JSON 对象。每个条目与[获取 Actor timer]({{% ref "#获取-actor-timer" %}})响应包含相同的字段，另外还有一个 `name` 字段，表示 timer 的名称。当 Actor 没有 timer 时，`timers` 为空数组。

#### 示例

```shell
curl http://localhost:3500/v1.0/actors/stormtrooper/50/timers \
  -H "Content-Type: application/json"
```

上述命令返回为该 Actor 注册的 timer：

```json
{
  "timers": [
    {
      "name": "checkRebels",
      "actorType": "stormtrooper",
      "actorID": "50",
      "dueTime": "1m",
      "period": "@every 20s",
      "callback": "myEventHandler",
      "data": "someData"
    },
    {
      "name": "recharge",
      "actorType": "stormtrooper",
      "actorID": "50",
      "dueTime": "30s",
      "ttl": "2026-12-31T23:59:59Z"
    }
  ]
}
```

#### gRPC

对应的 gRPC 方法为 `dapr.proto.runtime.v1.Dapr/ListActorTimers`。

```proto
rpc ListActorTimers(ListActorTimersRequest) returns (ListActorTimersResponse) {}

message ListActorTimersRequest {
  string actor_type = 1;
  string actor_id = 2;
}

message ListActorTimersResponse {
  repeated NamedActorTimer timers = 1;
}

message NamedActorTimer {
  string name = 1;
  ActorTimer timer = 2;
}

message ActorTimer {
  string actor_type = 1;
  string actor_id = 2;
  optional string due_time = 3;
  optional string period = 4;
  optional string ttl = 5;
  optional string callback = 6;
  google.protobuf.Any data = 7;
}
```

请求发送到不承载该 Actor 类型、或不拥有该 Actor 的 sidecar 时，会以 `PERMISSION_DENIED` 失败。

### 删除 Actor timer

删除 Actor 的 timer。

#### HTTP 请求

```
DELETE http://localhost:<daprPort>/v1.0/actors/<actorType>/<actorId>/timers/<name>
```

#### HTTP 响应码

代码 | 描述
---- | -----------
204  | 请求成功
500  | 请求失败
403  | Actor 未由此 sidecar 拥有（`ERR_ACTOR_TIMER_NOT_OWNED`）

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口。
`actorType` | Actor 类型。
`actorId` | Actor ID。
`name` | 要删除的 timer 名称。

> 注意，所有 URL 参数都区分大小写。

```shell
curl -X DELETE http://localhost:3500/v1.0/actors/stormtrooper/50/timers/checkRebels \
  -H "Content-Type: application/json"
```

### 跨度名称

启用跟踪后，Dapr 会按如下方式为 HTTP Actor 端点的跨度命名。从 Dapr 1.19 开始，reminder 和 timer 的跨度名称仅包含 API 名称和 Actor 类型，而不包含 Actor ID 或 reminder、timer 的名称，从而使不同跨度名称的数量保持有限。请更新与旧跨度名称匹配的仪表盘和告警。

端点 | 跨度名称
-------- | ---------
调用 Actor 方法 | `CallActor/<actorType>/<method>`
创建 Actor reminder | `RegisterActorReminder/<actorType>`
获取 Actor reminder | `GetActorReminder/<actorType>`
列出 Actor reminders | `ListActorReminders/<actorType>`
删除 Actor reminder | `UnregisterActorReminder/<actorType>`
创建 Actor timer | `RegisterActorTimer/<actorType>`
获取 Actor timer | `GetActorTimer/<actorType>`
列出 Actor timers | `ListActorTimers/<actorType>`
删除 Actor timer | `UnregisterActorTimer/<actorType>`

通过 gRPC 时，这些跨度以完整的 gRPC 方法命名，例如 `/dapr.proto.runtime.v1.Dapr/RegisterActorTimer`。

## Dapr 调用用户服务代码

### 获取已注册的 Actor

获取此应用已注册的 Actor 类型以及 Dapr Actor 配置设置。

#### HTTP 请求

```
GET http://localhost:<appPort>/dapr/config
```

#### HTTP 响应码

代码 | 描述
---- | -----------
200  | 请求成功
500  | 请求失败

#### URL 参数

参数 | 描述
--------- | -----------
`appPort` | 应用端口。

#### 示例

获取已注册 Actor 的示例：

```shell
curl -X GET http://localhost:3000/dapr/config \
  -H "Content-Type: application/json"
```

上述命令返回配置（所有字段都是可选的）：

参数 | 描述
----------|------------
`entities`  | 此应用支持的 Actor 类型。
`actorIdleTimeout` | 指定在停用空闲 Actor 之前等待的时间。如果没有 Actor 方法调用，也没有 reminder 触发，则该 Actor 处于空闲状态。
`actorScanInterval` | 指定扫描 Actor 以停用空闲 Actor 的时间间隔。空闲时间超过 actorIdleTimeout 的 Actor 将被停用。
`drainOngoingCallTimeout` | 在 draining 重新平衡的 Actor 过程中使用的时长。它指定等待当前活动的 Actor 方法完成的时间。如果当前没有 Actor 方法调用，则忽略此项。默认值：2 秒。
`drainRebalancedActors` | 布尔值。如果为 true，Dapr 将等待 `drainOngoingCallTimeout`，以允许当前 Actor 调用在尝试停用 Actor 之前完成。如果为 false，则不等待。
`reentrancy` | 一个配置对象，包含 Actor 重入的选项。
`enabled` | 重入配置中的一个标志，启用重入时需要设置。
`maxStackDepth` | 重入配置中的一个值，控制对同一 Actor 可进行的重入调用次数。
`entitiesConfig` | 实体配置数组，允许按 Actor 类型进行设置。此处定义的任何配置都必须对应一个映射回根级 entities 的实体。


{{% alert title="注意" color="primary" %}}
配置中用于超时和间隔的 Actor 设置使用 [time.ParseDuration](https://pkg.go.dev/time#ParseDuration) 格式。你可以使用字符串格式表示持续时间。例如：
- `1h30m` 或 `1.5h`：1 小时 30 分钟的持续时间
- `1d12h`：1 天 12 小时的持续时间
- `500ms`：500 毫秒的持续时间
- `-30m`：30 分钟的负持续时间

{{% /alert %}}

```json
{
  "entities":["actorType1", "actorType2"],
  "actorIdleTimeout": "1h",
  "actorScanInterval": "30s",
  "drainOngoingCallTimeout": "5s",
  "drainRebalancedActors": true,
  "reentrancy": {
    "enabled": true,
    "maxStackDepth": 32
  },
  "entitiesConfig": [
      {
          "entities": ["actorType1"],
          "actorIdleTimeout": "1m",
          "drainOngoingCallTimeout": "5s",
          "reentrancy": {
              "enabled": false
          }
      }
  ]
}
```

### 停用 Actor

通过将 Actor 实例持久化到具有指定 actorId 的 state store 中来停用 Actor。

#### HTTP 请求

```
DELETE http://localhost:<appPort>/actors/<actorType>/<actorId>
```

#### HTTP 响应码

代码 | 描述
---- | -----------
200  | 请求成功
400  | Actor 未找到
500  | 请求失败

#### URL 参数

参数 | 描述
--------- | -----------
`appPort` | 应用端口。
`actorType` | Actor 类型。
`actorId` | Actor ID。

> 注意，所有 URL 参数都区分大小写。

#### 示例

以下示例停用 `actorId` 为 50 的 Actor 类型 `stormtrooper`。

```shell
curl -X DELETE http://localhost:3000/actors/stormtrooper/50 \
  -H "Content-Type: application/json"
```

### 调用 Actor 方法

使用指定的 `methodName` 为 Actor 调用一个方法，其中：

- 方法的参数在请求消息的正文中传递。
- 返回值在响应消息的正文中提供。

如果 Actor 尚未运行，应用端应[激活](#激活-actor)它。

#### HTTP 请求

```
PUT http://localhost:<appPort>/actors/<actorType>/<actorId>/method/<methodName>
```

#### HTTP 响应码

代码 | 描述
---- | -----------
200  | 请求成功
500  | 请求失败
404  | Actor 未找到

#### URL 参数

参数 | 描述
--------- | -----------
`appPort` | 应用端口。
`actorType` | Actor 类型。
`actorId` | Actor ID。
`methodName` | 要调用的方法的名称。

> 注意，所有 URL 参数都区分大小写。

#### 请求标头

Header | Description
------ | -----------
`Dapr-Reentrancy-Id` | 为该 Actor 类型启用[重入]({{% ref actor-reentrancy %}})时发送。在你的 handler 发起的任何 Actor 调用中原样传递，使该调用沿当前调用链重入，而不是等待 Actor 的锁。
`Dapr-Actor-Activation-Id` | 始终发送。Dapr 每次激活 Actor 时都会生成新的 ID。如果该 ID 与你的 Actor runtime 上次为该 Actor 看到的 ID 不同，说明 Dapr 在此期间已经停用并重新激活了该 Actor，因此应丢弃你为其缓存的任何 Actor 对象和状态，而不是复用它们。Dapr 会替换调用方设置的任何值。在 1.19 中，没有任何 Dapr SDK 读取此标头。

#### 示例

以下示例调用 `actorId` 为 50 的 Actor 类型 `stormtrooper` 的 `performAction` 方法。

```shell
curl -X POST http://localhost:3000/actors/stormtrooper/50/method/performAction \
  -H "Content-Type: application/json"
```

### 调用 reminder

使用指定的 reminderName 为 Actor 调用 reminder。如果 Actor 尚未运行，应用端应[激活](#激活-actor)它。

#### HTTP 请求

```
PUT http://localhost:<appPort>/actors/<actorType>/<actorId>/method/remind/<reminderName>
```

#### HTTP 响应码

代码 | 描述
---- | -----------
200  | 请求成功
500  | 请求失败
404  | Actor 未找到

#### URL 参数

参数 | 描述
--------- | -----------
`appPort` | 应用端口。
`actorType` | Actor 类型。
`actorId` | Actor ID。
`reminderName` | 要调用的 reminder 名称。

> 注意，所有 URL 参数都区分大小写。

#### 请求标头

Header | Description
------ | -----------
`Dapr-Reentrancy-Id` | 为该 Actor 类型启用[重入]({{% ref actor-reentrancy %}})时发送。在你的 handler 发起的任何 Actor 调用中原样传递，使该调用沿当前调用链重入，而不是等待 Actor 的锁。
`Dapr-Actor-Activation-Id` | 始终发送。Dapr 每次激活 Actor 时都会生成新的 ID。如果该 ID 与你的 Actor runtime 上次为该 Actor 看到的 ID 不同，说明 Dapr 在此期间已经停用并重新激活了该 Actor，因此应丢弃你为其缓存的任何 Actor 对象和状态，而不是复用它们。在 1.19 中，没有任何 Dapr SDK 读取此标头。

#### 示例

以下示例调用 `actorId` 为 50 的 Actor 类型 `stormtrooper` 上的 `checkRebels` reminder 方法。

```shell
curl -X POST http://localhost:3000/actors/stormtrooper/50/method/remind/checkRebels \
  -H "Content-Type: application/json"
```

### 调用 timer

使用指定的 `timerName` 为 Actor 调用 timer。如果 Actor 尚未运行，应用端应[激活](#激活-actor)它。

#### HTTP 请求

```
PUT http://localhost:<appPort>/actors/<actorType>/<actorId>/method/timer/<timerName>
```

#### HTTP 响应码

代码 | 描述
---- | -----------
200  | 请求成功
500  | 请求失败
404  | Actor 未找到

#### URL 参数

参数 | 描述
--------- | -----------
`appPort` | 应用端口。
`actorType` | Actor 类型。
`actorId` | Actor ID。
`timerName` | 要调用的 timer 名称。

> 注意，所有 URL 参数都区分大小写。

#### 请求标头

Header | Description
------ | -----------
`Dapr-Reentrancy-Id` | 为该 Actor 类型启用[重入]({{% ref actor-reentrancy %}})时发送。在你的 handler 发起的任何 Actor 调用中原样传递，使该调用沿当前调用链重入，而不是等待 Actor 的锁。
`Dapr-Actor-Activation-Id` | 始终发送。Dapr 每次激活 Actor 时都会生成新的 ID。如果该 ID 与你的 Actor runtime 上次为该 Actor 看到的 ID 不同，说明 Dapr 在此期间已经停用并重新激活了该 Actor，因此应丢弃你为其缓存的任何 Actor 对象和状态，而不是复用它们。在 1.19 中，没有任何 Dapr SDK 读取此标头。

#### 示例

以下示例调用 `actorId` 为 50 的 Actor 类型 `stormtrooper` 上的 `checkRebels` timer 方法。

```shell
curl -X POST http://localhost:3000/actors/stormtrooper/50/method/timer/checkRebels \
  -H "Content-Type: application/json"
```

### 健康检查

探测应用以获取响应，向 Dapr 表明应用健康且正在运行。
除 `200` 以外的任何响应状态码都会被视为不健康的响应。

不需要响应正文。

#### HTTP 请求

```
GET http://localhost:<appPort>/healthz
```

#### HTTP 响应码

代码 | 描述
---- | -----------
200  | 应用健康

#### URL 参数

参数 | 描述
--------- | -----------
`appPort` | 应用端口。

#### 示例

从应用获取健康检查响应的示例：

```shell
curl -X GET http://localhost:3000/healthz \
```

## SubscribeActorEventsAlpha1 (gRPC)

{{% alert title="Alpha" color="warning" %}}
`SubscribeActorEventsAlpha1` 处于 **alpha** 阶段。API 形态可能会在未来版本中更改。
{{% /alert %}}

`SubscribeActorEventsAlpha1` 是 **Dapr 服务**（`dapr.proto.runtime.v1.Dapr`）上的双向 gRPC 流式 RPC。应用是 gRPC _客户端_：它连接 daprd、打开流，并通过这一条连接接收所有 Actor 回调，包括方法调用、reminder、timer 和停用。使用此 RPC 的应用无需暴露 HTTP 或 gRPC 服务端口。

有关用法指导和代码示例，请参阅 [Actor 应用发起的流概念文档]({{% ref "actors-app-initiated-streams" %}})和[操作指南]({{% ref "howto-actors-app-initiated-streams" %}})。

### gRPC 服务定义

```protobuf
// 位于 Dapr 服务上（应用连接 daprd）：
rpc SubscribeActorEventsAlpha1(stream SubscribeActorEventsRequestAlpha1)
    returns (stream SubscribeActorEventsResponseAlpha1) {}
```

### 应用 → Dapr：SubscribeActorEventsRequestAlpha1

**从应用发送到 daprd** 的消息。第一条消息必须是 `initial_request`；之后的所有消息都必须是通过 `id` 关联的响应。

| 字段（`request_type` 的 oneof） | 发送时机 |
|---|---|
| `initial_request`（`SubscribeActorEventsRequestInitialAlpha1`） | **仅作为第一条消息。** 注册 Actor 类型和运行时配置。 |
| `invoke_response`（`SubscribeActorEventsRequestInvokeResponseAlpha1`） | 对 `invoke_request` 回调的响应。 |
| `reminder_response`（`SubscribeActorEventsRequestReminderResponseAlpha1`） | 对 `reminder_request` 回调的响应。 |
| `timer_response`（`SubscribeActorEventsRequestReminderResponseAlpha1`） | 对 `timer_request` 回调的响应。 |
| `deactivate_response`（`SubscribeActorEventsRequestDeactivateResponseAlpha1`） | 对 `deactivate_request` 回调的响应。 |
| `request_failed`（`SubscribeActorEventsRequestFailedAlpha1`） | 当应用无法处理回调时发送，替代任何类型化的响应。 |

#### SubscribeActorEventsRequestInitialAlpha1

| 字段 | 类型 | 必填 | 描述 |
|-------|------|----------|-------------|
| `entities` | `[]string` | 是 | 由此应用承载的 Actor 类型。 |
| `actor_idle_timeout` | `Duration` | 否 | 停用前的空闲超时时间。未设置时使用 Dapr 默认值（60 分钟）。 |
| `drain_ongoing_call_timeout` | `Duration` | 否 | 重新平衡期间等待进行中调用完成的时长。未设置时使用 Dapr 默认值（2 秒）。 |
| `drain_rebalanced_actors` | `bool` | 否 | 在停用重新平衡的 Actor 之前 drain 进行中的调用。未设置时使用 Dapr 默认值。 |
| `reentrancy` | `ActorReentrancyConfig` | 否 | 此流上所有 Actor 类型的重入配置。 |
| `entities_config` | `[]ActorEntityConfig` | 否 | 按 Actor 类型的覆盖配置。每个条目都必须引用 `entities` 中列出的类型。 |

#### SubscribeActorEventsRequestInvokeResponseAlpha1

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `id` | `string` | 来自原始 `invoke_request` 的关联 ID。 |
| `data` | `bytes` | 响应负载。 |
| `metadata` | `map<string,string>` | 响应级别的标头，包括 `content-type`。 |
| `error` | `bool` | 为 `true` 时，`data` 是应用定义的错误负载，会原样传递给调用方。 |

#### SubscribeActorEventsRequestReminderResponseAlpha1

同时用于 `reminder_response` 和 `timer_response`。

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `id` | `string` | 来自原始 reminder 或 timer 请求的关联 ID。 |
| `cancel` | `bool` | 为 `true` 时，指示 Dapr 在本次触发之后取消该 reminder 或 timer。 |

#### SubscribeActorEventsRequestDeactivateResponseAlpha1

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `id` | `string` | 来自原始 `deactivate_request` 的关联 ID。 |

#### SubscribeActorEventsRequestFailedAlpha1

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `id` | `string` | 来自原始请求的关联 ID。 |
| `code` | `uint32` | gRPC 状态码。`codes.NotFound`（5）表示永久性的、不可重试的失败。 |
| `message` | `string` | 可读的错误描述。 |

### Dapr → 应用：SubscribeActorEventsResponseAlpha1

**从 daprd 发送到应用**的消息。第一条消息是 `initial_response`；之后的所有消息都是回调请求。

| 字段（`response_type` 的 oneof） | 描述 |
|---|---|
| `initial_response`（`SubscribeActorEventsResponseInitialAlpha1`） | 空的确认消息，表示注册成功。错误会以 gRPC 流错误的形式呈现。 |
| `invoke_request`（`SubscribeActorEventsResponseInvokeRequestAlpha1`） | Actor 方法调用。 |
| `reminder_request`（`SubscribeActorEventsResponseReminderRequestAlpha1`） | Actor reminder 已触发。 |
| `timer_request`（`SubscribeActorEventsResponseTimerRequestAlpha1`） | Actor timer 已触发。 |
| `deactivate_request`（`SubscribeActorEventsResponseDeactivateRequestAlpha1`） | Actor 实例正在被停用。 |

#### SubscribeActorEventsResponseInvokeRequestAlpha1

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `id` | `string` | 唯一的关联 ID。在 `invoke_response` 中原样回传。 |
| `actor_type` | `string` | Actor 类型。 |
| `actor_id` | `string` | Actor ID。 |
| `method` | `string` | 要调用的方法名称。 |
| `data` | `bytes` | 请求负载。 |
| `metadata` | `map<string,string>` | 请求级别的标头，包括 `content-type`、`Dapr-Reentrancy-Id`（启用重入时）和 `Dapr-Actor-Activation-Id`（始终发送）。 |

#### SubscribeActorEventsResponseReminderRequestAlpha1

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `id` | `string` | 唯一的关联 ID。在 `reminder_response` 中原样回传。 |
| `actor_type` | `string` | Actor 类型。 |
| `actor_id` | `string` | Actor ID。 |
| `name` | `string` | reminder 名称。 |
| `due_time` | `string` | reminder 的到期时间（time.ParseDuration 格式）。 |
| `period` | `string` | reminder 的周期（time.ParseDuration 格式）。 |
| `data` | `google.protobuf.Any` | reminder 的数据负载。 |
| `metadata` | `map<string,string>` | 请求级别的标头，包括 `Dapr-Reentrancy-Id`（启用重入时）和 `Dapr-Actor-Activation-Id`（始终发送）。 |

#### SubscribeActorEventsResponseTimerRequestAlpha1

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `id` | `string` | 唯一的关联 ID。在 `timer_response` 中原样回传。 |
| `actor_type` | `string` | Actor 类型。 |
| `actor_id` | `string` | Actor ID。 |
| `name` | `string` | timer 名称。 |
| `due_time` | `string` | timer 的到期时间。 |
| `period` | `string` | timer 的周期。 |
| `callback` | `string` | 注册 timer 时使用的回调方法名称。 |
| `data` | `google.protobuf.Any` | timer 的数据负载。 |
| `metadata` | `map<string,string>` | 请求级别的标头，包括 `Dapr-Reentrancy-Id`（启用重入时）和 `Dapr-Actor-Activation-Id`（始终发送）。 |

#### SubscribeActorEventsResponseDeactivateRequestAlpha1

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `id` | `string` | 唯一的关联 ID。在 `deactivate_response` 中原样回传。 |
| `actor_type` | `string` | Actor 类型。 |
| `actor_id` | `string` | Actor ID。 |

## 激活 Actor

从概念上讲，激活 Actor 意味着创建 Actor 的对象，并将 Actor 添加到跟踪表中。[查看 .NET SDK 中的示例](https://github.com/dapr/dotnet-sdk/blob/6c271262231c41b21f3ca866eb0d55f7ce8b7dbc/src/Dapr.Actors/Runtime/ActorManager.cs#L199)。

## 外部查询 Actor 状态

为了使 Actor 的状态可见，并支持状态聚合等复杂场景，Dapr 会将 Actor 状态保存在外部 state store 中，例如数据库。因此，可以通过组合正确的键或查询，从外部查询 Actor 状态。

Dapr 为 Actor 创建的 state namespace 由以下部分组成：

- App ID：表示分配给 Dapr 应用的唯一 ID。
- Actor 类型：表示 Actor 的类型。
- Actor ID：表示某个 Actor 类型下 Actor 实例的唯一 ID。
- 键：特定状态值的键。一个 Actor ID 可以保存多个状态键。

以下示例展示了如何为 `myapp` App ID namespace 下的 Actor 实例状态构造键：

`myapp||cat||hobbit||food`

在上面的示例中，我们获取的是 `myapp` App ID namespace 下、Actor 类型为 `cat`、Actor ID 为 `hobbit` 的状态键 `food` 的值。
