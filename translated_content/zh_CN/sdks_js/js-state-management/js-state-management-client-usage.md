---
type: docs
title: "状态客户端用法"
linkTitle: "客户端用法"
weight: 53100
description: JavaScript 状态客户端的配置、选项、序列化、响应结构以及协议相关的行为
---

State Management 可通过 `DaprClient.state` 使用。本页描述 3.19.0 中的实现，以及在使用该包或后续兼容版本时需要注意的行为。

## 客户端生命周期与配置

请复用一个长期存活的 `DaprClient`，而不是为每次操作都新建一个。关闭时，请在调用 `await client.stop()` 之前等待所有未完成的请求结束。

HTTP 是默认协议。若要使用 gRPC：

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
  daprApiToken: process.env.DAPR_API_TOKEN,
});
```

若使用 HTTP，请使用 `CommunicationProtocolEnum.HTTP` 并指定 sidecar 的 HTTP 端口，通常为 `"3500"`。端口选项均为字符串。

若省略显式的主机和端口选项，客户端可以根据所选协议读取 `DAPR_HTTP_ENDPOINT` 或 `DAPR_GRPC_ENDPOINT`。否则，客户端会使用主机和端口选项，其默认值为 `127.0.0.1`，端口默认取自 `DAPR_HTTP_PORT` 或 `DAPR_GRPC_PORT`（通常分别为 `3500` 和 `50001`）。API 令牌默认取自 `DAPR_API_TOKEN`。

## 选择操作

每个方法的第一个参数都是 state store component 的名称。

| 方法 | 用途 | 成功时的结果 |
|--------|---------|-------------------|
| `save(storeName, items, options?)` | 保存一个或多个键值项。 | `{}` |
| `get(storeName, key, options?)` | 读取单个值。 | 值本身，而不是包含 ETag 的项。 |
| `getBulk(storeName, keys, options?)` | 读取多个键的值和 ETag。 | 结果项数组。 |
| `delete(storeName, key, options?)` | 删除一个键，可选择检查 ETag。 | `{}` |
| `deleteBulk(storeName, items, options?)` | 在不提供值的情况下删除多个键。 | `{}` |
| `transaction(storeName, operations?, metadata?)` | 在支持的 state store 中原子地执行 upsert 和删除操作。 | `undefined`（`Promise<void>`）。 |
| `query(storeName, query)` | 在支持的 state store 中进行过滤、排序和分页。 | `{ results, token? }` |

SDK 不提供单独的单项保存方法、`getWithETag` 方法、返回布尔值的条件写入方法，也不提供通用的 `get<T>` 方法。单项保存以及需要 ETag 的批量读取，请使用只含一个元素的数组。宽泛类型的读取结果不会进行运行时的结构校验。

## 状态选项

请从 `@dapr/dapr` 导入 `StateConsistencyEnum` 和 `StateConcurrencyEnum`，而不是直接传入 HTTP 传输格式的字符串：

| 选项 | 取值 | 含义 |
|--------|--------|---------|
| `consistency` | `CONSISTENCY_UNSPECIFIED`、`CONSISTENCY_EVENTUAL`、`CONSISTENCY_STRONG` | 选择 state store 的默认一致性、最终一致性或强一致性。 |
| `concurrency` | `CONCURRENCY_UNSPECIFIED`、`CONCURRENCY_FIRST_WRITE`、`CONCURRENCY_LAST_WRITE` | 选择 state store 的默认并发策略、借助 ETag 检测冲突写入，或使用最后写入者胜出的行为。 |

以上均为对应枚举的成员。是否支持取决于 state store。ETag 是不透明的版本字符串，请勿自行构造或递增。

选项的放置位置因操作而异：

| 操作 | 选项的放置位置 |
|-----------|----------------------|
| `save` | 每个项的 `options: { concurrency, consistency }` 和可选的字符串 `etag`。最后一个参数只接受共享的 `metadata`。 |
| `get` | 最后一个参数为 `{ consistency, metadata }`，两个字段均可省略。 |
| `getBulk` | 最后一个参数为 `{ parallelism, metadata }`。没有 consistency 选项。 |
| `delete` | 最后一个参数为 `{ concurrency, consistency, etag, metadata }`，字段均可省略。 |
| `deleteBulk` | 每个项的 `options`、`etag` 和 `metadata`；最后一个参数只接受共享的 `metadata`。 |
| `transaction` | 每个操作的 `request.options`；事务级别的 metadata 是第三个参数。参见下文的限制。 |

在 TypeScript 中为某个项提供 `options` 时，其 `IStateOptions` 类型要求同时提供 `concurrency` 和 `consistency`。若希望其中某一项使用 state store 的默认值，请使用对应的 `UNSPECIFIED` 枚举成员。

## metadata 与 TTL

请使用 component 支持的字符串键值 metadata，例如 `ttlInSeconds`、`partitionKey` 或 `contentType`。状态 metadata 并不是任意的 HTTP 头集合。

| 操作 | HTTP 行为 | gRPC 行为 |
|-----------|---------------|---------------|
| `save` | 在请求正文中发送项的 metadata，并以查询参数的形式发送共享 metadata。 | 将共享 metadata 合并到每个项中，重复的键以共享 metadata 为准。 |
| `get` | 转发 `options.metadata`。 | 在当前实现中**不**转发 `options.metadata`。 |
| `getBulk` | 转发 `options.metadata`。 | 转发 `options.metadata`。 |
| `delete` | 转发 `options.metadata`。 | 在当前实现中**不**转发 `options.metadata`。 |
| `deleteBulk` | 将共享 metadata 合并到项的 metadata 之上，然后在各个删除请求中转发。 | 在一次批量删除 RPC 中，将共享 metadata 合并到项的 metadata 之上。 |
| `transaction` | 转发事务级别的 metadata 以及每个请求的 metadata。 | 转发事务级别的 metadata，但不转发每个请求的 metadata。 |
| `query` | 没有单独的 metadata 参数。 | 没有单独的 metadata 参数。 |

对于保存操作，共享 metadata 优先于项 metadata 中同名的键。TTL 值应放在 metadata 中，而不是状态选项中。参见 [state store TTL]({{% ref state-store-ttl.md %}})。

如果某个 component 需要依靠每个请求的 metadata 来定位条目，请不要假定单键读取和删除在不同协议下的行为完全一致。遇到这种情况，请使用 HTTP；或在合适的情况下，为 `getBulk` 和 `deleteBulk` 附带 metadata。

## 响应结构

### 单个读取

`get` 返回反序列化后的值；若默认的 JSON 解析失败，则返回文本。它不会返回 HTTP 响应头或 gRPC 响应信封。在标准的无数据响应中，缺失的键会返回空字符串，而不是保证的 `undefined` 或 `null`。

请勿用真值判断来区分缺失的键与合法存储的值（例如 `false`、`0` 或 `""`）。若应用需要明确的存在性检查，请存储一个文档信封，并结合 component 的能力，使用批量读取来检查项和 ETag。

### 批量读取

项包含 `key`、`data` 和可选的 `etag`。HTTP 返回运行时的项对象，其中还可能包含 `error` 和 `metadata`。HTTP 中缺失项的 data 可能不存在，也可能为 `null`；gRPC 则会把空数据映射为 `""`。

未配置序列化器时，gRPC 批量读取只返回 `key`、`data` 和 `etag`；该映射不会保留每个项的 `error` 和 `metadata`。配置序列化器后，gRPC 也会保留这些字段。若可用，即使整体请求成功，也应检查每个项的 `error`。请按键而不是按数组位置匹配项。

若应用需要为批量读取指定特定的并发上限，请显式设置 `parallelism`。省略时，两种协议在当前实现中的表现不同：gRPC 会发送 SDK 默认值 `10`，而 HTTP 则不发送该字段，由运行时的默认值生效。

### 写入与删除

`save`、`delete` 和 `deleteBulk` 返回 `StateSaveResponseType`：成功时为空对象，HTTP 失败时可能带有 `error`。它们不会返回新的 ETag。请在下一次条件更新之前重新读取 ETag。

### 查询

`query` 返回 `results` 和可选的分页 `token`。每个结果包含 `key`、`data`，以及可选的 `etag` 和 `error`。数据解码取决于协议和序列化器配置；参见[查询指南]({{% ref js-state-management-query.md %}})。

## 批量删除

`deleteBulk` 接受只读的项数组，其项的结构与保存项相同，但**不包含**必需的 `value`。已有的键值数组同样可以接受；其中的值会被忽略，且不会调用序列化器。

HTTP 会并发发送各个删除请求，并等待所有请求结束。它返回的是按**输入顺序**排列的第一个错误，而不一定是最先失败的请求。gRPC 只发送一次 `DeleteBulkState` RPC，RPC 失败时拒绝。空批次会直接返回 `{}`，而不会初始化 sidecar 连接。

两种协议下，批量删除都不是原子操作。报告失败并不意味着没有删除任何键，而且响应也不提供完整的逐键结果列表。若应用需要安全地重试，请核对部分完成的情况。

## 事务

请使用 `upsert` 和 `delete` 作为操作名称。底层 component 必须支持事务；`save` 和 `deleteBulk` 并不提供等效的原子性。

当前实现中有以下重要差异：

- 未显式配置序列化器时，gRPC 事务中的 upsert 会将传入的值直接交给 `Buffer.from`，而不会应用 `save` 的对象序列化。若事务中的值是对象，请配置 `JsonSerializer`，或为该协议提供经过适当编码的数据。
- gRPC 不会转发各个 `request.metadata` 字段。若 component 支持，请改用事务级别的 metadata。
- 事务请求类型将 `etag` 声明为 `{ value: string }`，但 gRPC 实现调用的是该对象的 `toString()`，而不是读取其 `value`。在本版本中，请勿依赖事务 ETag 来实现可移植的条件写入。若不需要多键原子条件，请使用文档中记载的单项保存/删除模式；若必须使用条件事务，请先确认后续 SDK 是否已修复该问题。

## 序列化

未配置序列化器时，SDK 保留其旧版行为：

| 操作 | HTTP | gRPC |
|-----------|------|------|
| 保存 | 值是 JSON 请求正文的一部分。 | 对象会被 JSON 字符串化；基本类型会被转换为字符串。 |
| 获取 | 尽可能解析 JSON，否则返回文本。 | 尽可能解析 JSON，否则返回文本。 |
| 批量获取 | 返回运行时的 JSON 项数据。 | 尽可能将每个项的字节解析为 JSON，否则返回文本。 |
| 查询 | 返回运行时的 JSON 项数据。 | 返回原始的 `Uint8Array` 项数据。 |

为了保证 JSON 值编码的一致性，请显式配置导出的 `JsonSerializer`：

```javascript
import { DaprClient, JsonSerializer } from "@dapr/dapr";

const client = new DaprClient({
  serializer: new JsonSerializer(),
});
```

序列化器是**客户端级别**的设置，而不是每次状态调用的选项。对于状态操作，它会序列化保存的值和事务中 upsert 的值，并反序列化单个读取、批量读取和查询返回的值。它不会序列化键、ETag、metadata、删除操作的值或查询过滤表达式。

TypeScript 应用可以实现导出的 `IDaprSerializer` 接口，该接口包含同步的 `serialize<T>(value): string` 和 `deserialize<T>(data: string): T` 方法，以及可选的 `contentType`。若使用 JSON 媒体类型（默认的 `application/json`，或任何 `+json` 媒体类型），则必须生成有效的 JSON。非 JSON 序列化器的输出会以 JSON 字符串的形式存储在 Dapr 信封中；二进制格式请编码为文本，例如使用 base64。这并不会使 State Management 变成流式文件 API。

序列化器的 `contentType` 控制的是 SDK 的编码方式；它不会自动添加状态 component 的 `contentType` metadata。若 state store 要求该 metadata（例如存储可查询的 JSON 文档时），请显式提供。

所有读取方和写入方都必须就存储的表示形式达成一致。选择使用 `JsonSerializer` 可能会改变现有字符串的行为，尤其是此前以未加引号文本形式存储的 gRPC 值。迁移前，请测试旧数据以及跨协议的读取方。自定义序列化器还可能改变状态查询可用的文档字段。类型参数既不提供运行时的结构校验，也不会自动恢复类实例。

## 错误处理

请等待操作完成，并同时处理返回的写入错误和 Promise 拒绝：

```javascript
try {
  const result = await client.state.save("statestore", [
    { key: "widget-a", value: { color: "blue" } },
  ]);
  if (result.error) {
    throw result.error;
  }
} catch (error) {
  console.error("Could not save widget-a:", error);
  throw error;
}
```

此示例假定已存在 `client`，并处于 async 函数或 ES 模块中。

| 失败路径 | 行为 |
|--------------|----------|
| HTTP 的 `save` 和 `delete` 请求失败 | 由 SDK 记录日志，并以 `{ error }` 的形式返回。 |
| HTTP 的 `deleteBulk` 请求失败 | 各个删除操作会记录日志；所有删除完成后，批量调用返回按输入顺序排列的第一个错误。 |
| HTTP 的 `get`、`getBulk`、`transaction` 和 `query` 请求失败 | 拒绝该 Promise。 |
| gRPC 状态 RPC 失败 | 拒绝该 Promise，并保留传输层错误，通常为 `ConnectError`。 |
| 序列化或本地构造请求失败 | 可能在请求发出之前就拒绝，写入操作也包括在内。 |

HTTP 运行时错误的 `Error.message` 通常是 JSON 编码的内容，其中包含 `status`、`error` 和 `error_msg`。传输层错误的结构可能有所不同；请勿无条件地把每条错误消息都当作 JSON 解析。也不要把 gRPC 错误码解释为 HTTP 状态码。

ETag 冲突是一种错误，而不是返回 `false`。读取或查询调用在请求层面可能成功，但其中包含项级别的错误。在未考虑部分完成情况的前提下，请避免整批重试非原子的批处理。

## 取消

本版本的状态方法**不**接受 `AbortSignal`、取消令牌或单次操作的截止时间。请勿把 Binary Store 客户端的 `signal` 选项复制到状态调用中。让 Promise 与 timer 竞速并不会取消底层的状态请求。在合适的情况下，请使用运行时的 [resiliency 策略]({{% ref resiliency-overview.md %}}) 来处理 component 的超时和重试，并考虑操作本身的语义。
