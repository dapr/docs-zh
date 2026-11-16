---
type: docs
title: "JavaScript 作业客户端与回调用法"
linkTitle: "客户端与回调用法"
weight: 59000
description: 配置 JavaScript 作业客户端，理解调度选项、负载、失败策略和错误
---

作业功能是 `DaprClient` 和 `DaprServer` 的一部分，适用于 **`@dapr/dapr` 3.19.0 或更高版本**。使用 `client.jobs` 管理计划作业，使用 `server.jobs` 注册回调。[操作指南]({{% ref js-jobs-howto.md %}})包含一个完整的可运行应用。

## 客户端配置与生命周期

请创建一个长期存活的 `DaprClient`，而不是为每次操作都新建客户端。作业功能复用客户端已有的边车连接与 API 令牌：

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
  daprApiToken: process.env.DAPR_API_TOKEN,
});

try {
  await client.start();
  await client.jobs.schedule("cleanup", { dueTime: "1h" });
  const job = await client.jobs.get("cleanup");
  console.log(job);
  await client.jobs.delete("cleanup");
} finally {
  await client.stop();
}
```

若使用 HTTP，请使用 `CommunicationProtocolEnum.HTTP` 并指定边车的 HTTP 端口，通常为 `"3500"`。仅进行客户端管理不需要应用侧监听器，但作业触发时，目标应用必须暴露其回调服务器。

使用 `DaprServer` 时，通过 `clientOptions` 配置其嵌入式客户端，并复用 `server.client.jobs`。`server.start()` 会同时启动回调服务器和嵌入式客户端。`server.stop()` 只停止服务器；应用关闭时还应调用 `server.client.stop()`。这两个操作都不会删除已存储的作业。

### 客户端协议与回调协议

这两条连接分别独立配置：

| 连接 | SDK 设置 | Dapr CLI 设置 |
| --- | --- | --- |
| 应用到边车 | `DaprClient.communicationProtocol`，或 `DaprServer.clientOptions.communicationProtocol`，并搭配对应的 `daprPort` | `--dapr-http-port` 或 `--dapr-grpc-port` |
| 边车到应用 | `DaprServer.communicationProtocol` 与 `serverPort` | 匹配的 `--app-protocol` 与 `--app-port` |

JSON 负载支持 HTTP 和 gRPC 的任意组合。若要传输任意字节，请在两条连接上都使用 gRPC。仅为客户端选择 gRPC 并不会改变边车的回调协议。

## 运行时兼容性与 API 选择

作业功能需要 **Dapr 运行时 1.16 或更高版本**，并且需要正在运行的 Scheduler 服务。在发出作业请求之前，SDK 会读取边车的元数据以选择 API：

| 运行时版本 | HTTP API 前缀 | gRPC 管理方法 |
| --- | --- | --- |
| 1.16 和 1.17 | `v1.0-alpha1` | `ScheduleJobAlpha1`、`GetJobAlpha1`、`DeleteJobAlpha1` |
| 1.18 预发布版 | `v1.0-alpha1` | Alpha1 方法 |
| 1.18 正式版及更高版本 | `v1.0` | `ScheduleJob`、`GetJob`、`DeleteJob` |

1.18 之后的预发布版以及 `edge` 运行时标识符会选择正式 API。`DaprServer` 会同时注册正式版和 Alpha1 的 gRPC 回调服务。

SDK 会按客户端缓存成功的 API 选择结果。元数据查询失败、版本缺失或无法识别、运行时版本不受支持时，操作会被拒绝，而不会去猜测 API。后续调用可以重试失败的元数据查询。失败的作业请求不会自动改用其他 API 版本重放。

SDK 包版本与运行时版本是两项独立要求：仅为使用作业功能，使用 SDK 3.19.0 并不要求运行时必须是 1.19。

## 调度选项

`schedule(name, options)` 返回 `Promise<void>`。`schedule` 与 `dueTime` 至少提供一个，两者也可以同时提供。

| 选项 | 类型 | 行为 |
| --- | --- | --- |
| `schedule` | `string` 或 `CronExpressionBuilder` | 六字段的 cron 表达式、`@daily` 之类的描述符，或 `@every 5m` 之类的间隔。构建器会被转换为字符串。 |
| `dueTime` | `string` | 作业开始生效的时间；若未提供 `schedule`，则为一次性作业的触发时间。 |
| `ttl` | `string` | 作业的过期时间。相对值从作业创建时开始计算。 |
| `repeats` | `number` | 限制计划触发的次数。省略表示无限重复；传入零会原样发送给运行时，而不会被当作省略。 |
| `data` | JSON 值或 `Uint8Array` | 可选的回调负载。gRPC 也接受 Node.js 的 `Buffer`。 |
| `overwrite` | `boolean` | 默认为 `false`。设为 `true` 时会替换同名的已有作业。 |
| `failurePolicy` | `JobFailurePolicy` | 控制回调处理失败时的重试行为。省略则使用运行时默认策略。 |

`dueTime` 和 `ttl` 接受 RFC3339 时间戳、Go 风格的时长字符串（如 `"30s"` 或 `"1h30m"`），以及不重复的 ISO8601 时长（如 `"PT30M"`）。请传入字符串，而不是 JavaScript 的 `Date` 对象。若要指定绝对时间，请使用 `date.toISOString()`，或带明确时区偏移的 RFC3339 时间戳。

运行时会校验原始 cron 表达式、时间字符串以及调度组合。作业是持久化调度器，而不是精确定时器：触发不会早于其到期时间，但可能晚于该时间。

### 作业名称与输入校验

名称区分大小写。请传入原始名称，而不是 URL 编码后的值；HTTP 客户端会对路径段进行编码。

SDK 会拒绝空名称、首尾含空白字符的名称、`.` 和 `..`、控制字符，以及字符 `/`、`\`、`?`、`#`、`%` 和 `|`。名称内部的空格是支持的。即使更新的运行时允许更多字符（例如 `|`），这些 SDK 限制依然适用。

SDK 还会校验以下内容：

- 若提供了 `schedule`、`dueTime` 和 `ttl`，在转换构建器后，它们必须是非空字符串。
- `repeats` 和 `failurePolicy.maxRetries` 必须是 `0` 到 `4294967295` 之间的整数。
- 若提供了 `overwrite`，它必须是布尔值。
- 负载和失败策略必须使用受支持的值。

无效选项会在发出作业请求之前使异步操作被拒绝。[cron 构建器]({{% ref js-jobs-cron.md %}})还会对其字段进行额外的本地校验。

## 获取和删除作业

`get(name)` 返回 `Promise<Job>`，其中包含 `name`，以及可选的 `schedule`、`dueTime`、`ttl`、`repeats`、`data` 和 `failurePolicy` 属性。SDK 为 TypeScript 调用方导出了相关类型：

```typescript
import type { Job, JobFailurePolicy, JobOptions } from "@dapr/dapr";

const failurePolicy: JobFailurePolicy = {
  type: "constant",
  interval: "1s",
  maxRetries: 3,
};

const options: JobOptions = { dueTime: "1h", failurePolicy };
await client.jobs.schedule("cleanup", options);

const job: Job = await client.jobs.get("cleanup");
console.log(job.name, job.failurePolicy);
```

`JobOptions` 描述调度输入，`Job` 描述取回的配置。`overwrite` 是调度选项，而不是返回作业的属性。返回的时间字符串使用运行时的表示形式，可能与输入不同；构建器的 schedule 会以字符串的形式返回。

取回的是配置，而不是执行历史、下一次运行时间的计算结果，也不是已完成回调的计数。作业不存在时，`get` 会拒绝，而不是返回 `undefined`。`delete(name)` 返回 `Promise<void>`；删除一个已不存在的作业会被受支持的运行时接受，但传输和服务错误仍会向上传递。

## 负载序列化

### JSON 负载

客户端的两种传输方式和两种回调协议都支持 JSON 值：普通对象、数组、字符串、有限数字、布尔值和 `null`。请直接传入该值，而不要手动进行 JSON 字符串化：

```javascript
await client.jobs.schedule("create-report", {
  dueTime: "30s",
  data: { reportId: "report-123", includeArchived: false },
});
```

`get(name).data` 与回调参数会返回解码后的值。`false`、`0`、`""` 和 `null` 等值会被保留，而不会被当作缺失的负载。

SDK 会拒绝非 JSON 数据，例如 `Date` 实例、`BigInt`、非有限数字、嵌套的 `undefined` 值以及循环引用。请先将此类值转换为与 JSON 兼容的表示形式。

作业使用自己的负载编码，而不是客户端的自定义序列化器。对于 gRPC，JSON 负载会被打包为 `google.protobuf.Value`；解码器也能理解其他客户端发送的 `google.protobuf.Struct` 负载。你无需自行构造 protobuf 封装。

在不同传输方式下，省略 `data` 的效果并不相同。为兼容旧版运行时，HTTP 调度会发送 JSON `null`；gRPC 则不发送负载。请勿依赖跨协议区分“省略的负载”与 `null`。

### 不透明的二进制负载

使用 gRPC 调度并获取原始的 `Uint8Array` 或 Node.js `Buffer` 负载，包括空缓冲区：

```javascript
const data = Buffer.from([0x00, 0x80, 0xff]);

await client.jobs.schedule("process-bytes", {
  dueTime: "1h",
  data,
});

const job = await client.jobs.get("process-bytes");
console.log(Buffer.isBuffer(job.data)); // 输出 true
```

在本示例中，请为 `client` 配置 gRPC。若要在回调中接收相同的字节，请使用 gRPC 的 `DaprServer` 并设置 `--app-protocol grpc`。Dapr 的 HTTP 应用通道会将作业回调正文视为 JSON，因此不适用于任意字节。

HTTP 调度会拒绝字节负载，而不会将其转换为 JSON。不透明的 gRPC 负载会以 Node.js 缓冲区的形式返回。SDK 使用 .NET Jobs SDK 同样使用的类型 URL `dapr.io/schedule/jobpayload`；它不会对这些字节进行 JSON 序列化或文本编码。若需跨语言互操作，应事先约定负载是 protobuf 封装的 JSON 还是原始字节，并据此解码。

## 失败策略

SDK 接受以下策略：

| 策略 | 行为 |
| --- | --- |
| 省略 | 交由 Dapr 的默认策略处理。运行时的默认策略会以一秒的延迟最多重试三次。 |
| `{ type: "drop" }` | 投递失败后不再重试。 |
| `{ type: "constant", interval: "1s", maxRetries: 3 }` | 以固定延迟重试，最多重试指定的次数（不含首次尝试）。 |

对于 constant 策略，省略 `maxRetries` 表示无限重试。设置 `maxRetries: 0` 会禁用重试。省略 `interval`，或将其设为 `"0s"`，表示立即重试。

与 `dueTime` 和 `ttl` 不同，重试间隔使用的是 **protobuf 时长的 JSON 语法**：以 `s` 为后缀的秒数，最多可带九位小数。使用 `"0.2s"` 表示 200 毫秒，`"60s"` 表示一分钟，`"0.000000001s"` 表示一纳秒。这里会拒绝 `"200ms"` 和 `"1m"` 这类 Go 风格的字符串，负的时长同样会被拒绝。

```javascript
await client.jobs.schedule("retryable-task", {
  dueTime: "30s",
  failurePolicy: {
    type: "constant",
    interval: "0.5s",
    maxRetries: 2,
  },
});
```

该策略允许首次尝试加上两次重试。`repeats` 控制计划触发的次数，并非重试次数上限。

## 回调行为

`server.jobs.listen(name, callback)` 返回 `Promise<void>`，并注册一个异步的 `(data) => Promise<void>` 处理程序。注册本身不会调度作业。请在启动服务器之前注册，且名称必须与已调度作业的名称完全一致。

SDK 会等待处理程序返回的 Promise，然后才确认投递。处理程序成功解析即表示成功；其返回值既不是响应负载，也不是重试指令。若要表示失败，请抛出异常或拒绝该 Promise。如果希望 Dapr 进行重试，请勿启动未等待的后台工作后提前返回，也不要捕获处理错误而不再向上抛出。

对同一名称重复注册会被拒绝，而不会替换已有的处理程序。SDK 未提供移除处理程序的 API。

| 情形 | HTTP 回调响应 | gRPC 回调响应 |
| --- | --- | --- |
| 处理程序完成 | `200` | 成功的 `JobEventResponse` |
| 没有匹配的处理程序 | `404` | `NotFound` |
| 处理程序抛出异常或被拒绝 | `500` | `Internal` |

缺失的处理程序和失败的处理程序都会被记录日志并报告为错误，而不会被确认为成功投递。请按至少一次投递来设计处理程序；若处理过程存在非幂等的副作用，请在应用层进行去重。

## 错误处理

所有作业方法都返回 Promise。请对它们使用 await，以便校验错误、元数据失败、边车错误和调度器错误都能进入应用的错误处理逻辑。

输入校验可能产生 `TypeError` 或 `RangeError`；格式错误的运行时响应同样会导致拒绝。远程失败会通过所选的传输方式向上传递。HTTP 失败会在错误信息中包含状态和响应详情；gRPC 失败则使用 gRPC 传输层提供的错误信息。不存在跨传输方式通用的、作业专用的异常类。

不要想当然地认为调度请求失败就说明什么都没有被存储：服务器接受请求之后，响应可能丢失。重试之前请按名称核对状态，并谨慎选择 `overwrite`。失败策略管理的是回调投递，而不是客户端管理请求的重试。

这些作业方法不接受 `AbortSignal`、超时参数或取消令牌。放弃本地等待并不会取消作业；若要移除其未来的调度，请使用 `delete(name)`。
