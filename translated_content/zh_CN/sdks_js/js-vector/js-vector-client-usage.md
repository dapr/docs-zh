---
type: docs
title: "向量客户端用法"
linkTitle: "客户端用法"
weight: 53100
description: 配置和使用 JavaScript 向量客户端的核心指南
---

在 JavaScript SDK 3.19.0 或更高版本中，可通过 `DaprClient.vector` 使用向量功能。HTTP 和 gRPC 均使用 Alpha 阶段的向量 API，并且需要 1.19 发布系列或更高版本、支持向量的 Dapr 运行时。仅安装 JavaScript SDK 并不能启用向量 API。

## 客户端生命周期与配置

请复用长期存活的 `DaprClient`，而不是为每次操作都创建一个客户端。在应用关闭时，请先等待所有未完成的操作，再调用 `await client.stop()`。

默认协议为 HTTP。若要显式配置 gRPC 连接：

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
  daprApiToken: process.env.DAPR_API_TOKEN,
});
```

若使用 HTTP，请使用 `CommunicationProtocolEnum.HTTP` 以及边车的 HTTP 端口（默认为 `"3500"`）。端口值须以字符串形式提供。

如果省略显式的主机和端口选项，SDK 可以为所选协议使用 `DAPR_HTTP_ENDPOINT` 或 `DAPR_GRPC_ENDPOINT`。否则，它将使用已配置的主机和端口；若未配置，则回退到 `127.0.0.1` 以及 `DAPR_HTTP_PORT` 或 `DAPR_GRPC_PORT`（默认值分别为 `3500` 和 `50001`）。如果未提供 `daprApiToken`，API 令牌默认取自 `DAPR_API_TOKEN`。向量请求使用与其他客户端操作相同的认证设置。

## 选择操作

每个方法都接受组件名称。涉及集合的操作还需要集合名称。选项对象是最后一个参数。

| 方法 | 结果 |
|------|------|
| `createCollection(storeName, collection, options)` | `Promise<void>` |
| `getCollection(storeName, collection, options?)` | `Promise<VectorCollection>` |
| `listCollections(storeName, options?)` | `Promise<string[]>` |
| `deleteCollection(storeName, collection, options?)` | `Promise<void>` |
| `upsertVectors(storeName, collection, records, options?)` | `Promise<VectorUpsertResult>` |
| `getVectors(storeName, collection, ids, options?)` | `Promise<VectorRecord[]>` |
| `deleteVectors(storeName, collection, ids, options?)` | `Promise<VectorIndexAck>` |
| `queryVectors(storeName, collection, query, options?)` | `Promise<VectorQueryResult>` |
| `batchQueryVectors(storeName, collection, queries, options?)` | `Promise<VectorBatchQueryResult[]>` |

TypeScript 应用可以从 `@dapr/dapr` 中以类型形式导入这些结果类型，以及 `IClientVector`、`VectorRecord`、`VectorQuery`、`VectorDistanceMetric`、`VectorOptions`、`VectorCreateCollectionOptions`、`VectorIndexingOptions`、`VectorError` 和 `VectorErrorDetail`。

`VectorOptions` 提供 `metadata?: Readonly<Record<string, string>>` 和 `signal?: AbortSignal`。请求元数据与组件相关，取值为字符串；它与附加在每条记录上、可用于过滤的结构化元数据是分开的。

## 集合与记录

创建集合时需要指定 `dimensions`，它是一个正整数，且不大于 `4294967295`。支持的度量名称为 `"cosine"`、`"dotProduct"` 和 `"euclidean"`。省略 `metric` 时，将使用组件文档中规定的默认值；组件不支持的度量会被运行时以无效参数拒绝。传给 `createCollection` 的 `metadata` 用于承载组件特定的集合设置，例如索引参数。`getCollection` 会返回集合的 `dimensions`、实际生效的 `metric`、近似的 `recordCount`（某些组件会报告为 `0`），以及组件特定的 `properties`。组件的能力和限制可能比 SDK 接受的输入范围更窄。

Alpha 阶段的 API 仅涵盖稠密向量。稀疏向量、命名向量、混合融合以及结果分页目前均不可用。

`VectorRecord` 包含非空字符串 `id`、数字数组 `values`、可选的 `payload` 负载字节，以及可选的结构化 JSON `metadata`。ID 的作用域为集合内。对已存在的 ID 执行 Upsert 会替换其记录，而不是逐字段合并；请提供你希望保留的全部 values、负载和元数据。

稠密嵌入向量应以普通数字数组提供，而非 `Float32Array`。坐标必须是有限值，并且位于有限的 float32 范围内；float32 序列化可能会对其进行舍入。向量长度必须与集合的 dimensions 一致；对于余弦相似度，组件通常会拒绝模长为零的向量。维度不匹配以及其他运行时记录校验失败，可能出现在 `failedItems` 中，而不会导致 Upsert 被拒绝。

负载接受 `Uint8Array` 或 Node.js `Buffer`，返回时为 `Uint8Array`。SDK 不会应用自定义序列化器，也不会根据负载生成嵌入向量。应用内容需要由你显式地编码和解码。记录的元数据和查询过滤条件必须是 JSON 对象。

`getVectors` 始终会获取负载和元数据。设置 `{ includeValues: true }` 可获取嵌入向量；否则 `values` 为空数组。缺失的 ID 会被省略，已找到的记录保持请求中的顺序。删除不存在的 ID 同样会成功。

## 索引确认与部分失败

`upsertVectors` 和 `deleteVectors` 接受 `VectorIndexingOptions`。默认模式为 `"returnOnAcceptance"`，允许写入操作在索引完成之前返回。确认结果为 `"queued"` 表示工作已被接受，但并不代表其已成功或已可查询。排队中的工作仍可能在之后失败；此 API 不会公开其最终结果。

对于写后读（read-after-write）的流程，请显式等待操作完成：

```javascript
const write = await client.vector.upsertVectors(
  "vectorstore",
  "documents",
  [{ id: "doc-1", values: [1, 0, 0], metadata: { category: "guide" } }],
  {
    mode: "waitForCompletion",
    waitTimeout: "10s",
    onWaitTimeout: "failRequest",
  },
);

if (write.failedItems.length > 0) {
  console.error("Failed records:", write.failedItems);
  throw new Error("Vector upsert had partial failures");
}
if (write.ack !== "completed") {
  throw new Error("Vector indexing has not completed");
}
```

此代码片段假定已存在 `client` 和集合。请在 async 函数内或 ES 模块中运行。

等待需要一个正的 protobuf 时长字符串，例如 `"10s"` 或 `"0.250s"`，并且必须明确指定超时处理方式。`waitTimeout` 必须短于剩余的请求截止时间。当存储配置了弹性策略中的超时策略时，waitTimeout 必须比该超时至少短十分之一，并且至少短 100 毫秒。

| `onWaitTimeout` | 行为 |
|-----------------|----------|
| `"continueAsync"` | 若等待超时，则返回 `"queued"` 确认；工作可以异步继续进行。当组件没有排队确认时，此选项无效。 |
| `"failRequest"` | 若等待超时，则使请求失败，返回截止时间已超时错误（HTTP `504`，gRPC `DeadlineExceeded`）。无法保证提供方侧的工作会被取消。 |

请勿在 `"returnOnAcceptance"` 模式下提供 `waitTimeout` 或 `onWaitTimeout`，也不要在未显式选择 `"waitForCompletion"` 时提供它们；SDK 会在发送请求之前拒绝这些组合。

`upsertVectors` 返回 `{ ack, failedItems }`。即使 Promise 已解析且 `ack` 为 `"completed"`，也应检查 `failedItems`：完成并不意味着每条记录都已成功。每个失败项都包含其 `id` 和结构化的 `error`。报告的失败仅限于在确认边界处已知的失败；排队确认并不是最终的逐条记录报告。

`deleteVectors` 仅返回 `"queued"` 或 `"completed"`。支持空的 upsert 和 delete 数组。运行时会拒绝 upsert 请求中的重复 ID；请勿依赖批次内的“最后写入者获胜”顺序。

## 查询、分数与包含标志

`VectorQuery` 必须且只能指定一个查询来源：`vector: number[]` 或 `byId: string`。`vector` 数组必须非空；运行时会将空数组视为无效参数而拒绝。其余字段均为可选：

| 字段 | 行为 |
|-------|----------|
| `topK` | 非负 uint32。省略或为 `0` 时，使用组件的默认匹配数量。 |
| `filter` | 作用于记录元数据的可移植过滤 DSL，支持带点号的路径。负载不可过滤。 |
| `includeValues` | 默认为 `false`；省略时，嵌入向量以 `values: []` 返回。 |
| `includePayload` | 默认为 `false`；省略时，负载以 `undefined` 返回。 |
| `metric` | 省略时使用集合的度量；不受支持的覆盖值会明确失败。 |
| `scoreThreshold` | 基于该度量未归一化尺度的有限闭区间阈值（包含边界）。 |

无论 values 和负载标志如何设置，查询结果中的匹配项都会返回记录元数据。结果为 `{ matches, metric }`；每个匹配项包含 `{ record, score }`，即使查询中省略了它，`metric` 也会标明实际生效的度量。

余弦相似度和点积的分数越高越好；欧几里得距离则越低越好。对于余弦相似度和点积，阈值是最低分数；对于欧几里得距离，阈值是最大距离。不要把分数当作归一化的概率，也不要将不同度量的分数当作处于同一尺度上进行比较。`byId` 查询是否会返回源记录本身，取决于具体组件。

`batchQueryVectors` 中的所有查询都针对同一存储和同一集合，各自拥有独立的查询字段。结果保持请求顺序，且每个槽位恰好包含 `{ response: VectorQueryResult }` 或 `{ error: VectorError }` 之一。空的查询数组会返回空的结果数组。请检查每一个槽位：单个运行时或提供方的失败不会使整个批次被拒绝，但请求级别的失败会。

## 取消

每个向量操作的选项对象中都接受 `signal`。当应用的截止时间到期或调用方断开连接时，可传入 `AbortSignal` 取消请求：

```javascript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30_000);

try {
  const result = await client.vector.queryVectors(
    "vectorstore",
    "documents",
    { vector: [1, 0, 0], topK: 5 },
    { signal: controller.signal },
  );
  console.log(result.matches);
} finally {
  clearTimeout(timeout);
}
```

此代码片段假定已存在 `client` 和集合。请在 async 函数内或 ES 模块中运行。取消会使请求被拒绝，但不保证取消或回滚提供方侧的索引工作。不要假设两种协议会以相同的错误类报告取消。

## 错误

请对每个操作执行 await，并在应用的错误处理边界处理请求失败。对于不会导致调用被拒绝的失败，请同时检查 `upsertVectors().failedItems` 以及 `batchQueryVectors()` 的每个结果。

- **HTTP 请求失败：** 运行时失败会以 JavaScript `Error` 实例的形式抛出，其 `message` 是一个 JSON 字符串，包含 `status`（HTTP 状态码）、`error`（状态文本）以及 `error_msg`（运行时响应正文）。传输错误和取消错误的结构可能不同；不要假设每条错误消息都是 JSON。
- **gRPC 请求失败：** 运行时失败会保留来自 `@connectrpc/connect` 的 `ConnectError` 代码。不要将它们当作 HTTP 状态码处理。
- **结构化的条目或查询失败：** `VectorError` 包含一个非 OK 的规范 `google.rpc.Code` 数值（`1` 至 `16`）、`message` 和 `details`。这些代码不是 HTTP 状态码。每个 detail 包含 `typeUrl` 和 `value`：HTTP 保留不含 `@type` 的 protobuf JSON 字段，gRPC 则将原始 protobuf 字节保留为 `Uint8Array`。
- **无效参数：** 存储名或集合名为空、记录 ID 为空、存储名或集合名等于 `.` 或 `..`、无效的负载类型、不受支持的度量名称、非有限数值、无效 JSON，以及有歧义的查询来源，都会在发送请求之前被拒绝。无效的维度、`topK`，或超出有限 float32 范围的坐标同样会被拒绝。类型与范围错误使用 `TypeError` 或 `RangeError`；格式错误的 protobuf 时长字符串可能产生解析错误。

创建已存在的集合（HTTP `409`，gRPC `AlreadyExists`）、访问不存在的集合或通过不存在的 ID 进行查询（HTTP `404`，gRPC `NotFound`）、组件不支持的能力，以及无效过滤条件（HTTP `400`，gRPC `InvalidArgument`），都会导致运行时失败。在批次中，缺失的 `byId` 来源只会使该槽位以 `VectorError` 代码 `5` 失败。没有匹配项的有效查询则会返回空的 `matches` 数组。集合计数超出 JavaScript 安全整数范围，以及格式错误的响应，都会被拒绝，而不会悄悄丢失精度或替换为默认值。

有关完整的设置和可运行示例，请参阅 [向量操作指南]({{% ref js-vector-howto.md %}})。
