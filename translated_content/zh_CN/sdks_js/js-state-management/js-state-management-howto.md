---
type: docs
title: "How to: Manage state with the Dapr JavaScript SDK"
linkTitle: "操作方法：管理状态"
weight: 53050
description: "了解如何保存、读取和删除状态，使用 ETag，并执行批量操作和事务"
---

使用 `DaprClient.state` 管理键值形式的应用状态，无需依赖特定的数据库客户端。本指南使用 Redis，涵盖基本操作、乐观并发控制、批量操作、TTL 和事务。

## 前提条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化的 [Dapr environment]({{% ref install-dapr-selfhost.md %}})
- [Node.js](https://nodejs.org/) 18 或更高版本
- [`@dapr/dapr`](https://www.npmjs.com/package/@dapr/dapr) 包，版本需为 3.19.0 或更高
- Redis 实例，例如由 `dapr init` 创建的本地 Redis 容器

在应用目录中，如有需要，请初始化 npm 项目并安装 SDK：

```sh
npm init -y
npm install @dapr/dapr@3.19.0
```

示例使用 `.mjs` 文件中的 JavaScript ES 模块。相同的 API 同样可在 TypeScript 中使用。

## 配置 state store

创建 `components` 目录，并将此 component 保存为 `components\statestore.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "localhost:6379"
    - name: redisPassword
      value: ""
```

请根据你的 Redis 实例调整连接设置。有关身份验证和生产环境配置，请参阅 [Redis component 参考]({{% ref setup-redis.md %}})。

component 的 `metadata.name`（即 `statestore`）是客户端调用中使用的存储名称。它既不是 component 类型，也不是文件名。在多次运行之间保持相同的 Dapr 应用 ID，才能读取之前保存的状态；默认情况下，Dapr 会使用应用 ID 为键加上前缀。

## 保存、读取和删除状态

将以下内容保存为 `app.mjs`：

```javascript
import { CommunicationProtocolEnum, DaprClient, JsonSerializer } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "3500",
  communicationProtocol: CommunicationProtocolEnum.HTTP,
  serializer: new JsonSerializer(),
});
const storeName = "statestore";

try {
  const saved = await client.state.save(storeName, [
    { key: "widget-a", value: { size: "small", color: "blue" } },
    { key: "widget-b", value: { size: "large", color: "white" } },
  ]);
  if (saved.error) {
    throw saved.error;
  }

  const widget = await client.state.get(storeName, "widget-a");
  console.log("Loaded widget:", widget);

  const deleted = await client.state.delete(storeName, "widget-b");
  if (deleted.error) {
    throw deleted.error;
  }
} catch (error) {
  console.error("State operation failed:", error);
  process.exitCode = 1;
} finally {
  await client.stop();
}
```

使用 Dapr sidecar 启动应用：

```sh
dapr run --app-id state-example --dapr-http-port 3500 --dapr-grpc-port 50001 --resources-path .\components -- node app.mjs
```

若要使用 gRPC，请将 `communicationProtocol` 改为 `CommunicationProtocolEnum.GRPC`，并将 `daprPort` 改为 `"50001"`。显式指定的 `JsonSerializer` 可使各示例中的值序列化保持一致，包括对象类型的事务和查询结果。该设置是可选的，但启用它可能改变已有值的解释方式。在修改现有应用的配置之前，请先阅读[序列化指南]({{% ref "js-state-management-client-usage.md#serialization" %}})。

后续示例复用 `client` 和 `storeName`。请将它们放在 `try` 代码块中、客户端停止之前。它们假定初始保存已经完成。

## 读取多个条目

`save` 已经支持数组形式的批量写入。使用 `getBulk` 读取多个键：

```javascript
const items = await client.state.getBulk(
  storeName,
  ["widget-a", "widget-b"],
  { parallelism: 4 },
);

for (const item of items) {
  if (item.error) {
    throw new Error(`Unable to read ${item.key}: ${item.error}`);
  }
  console.log(item.key, item.data, item.etag);
}
```

每个结果是一个包含 `key`、`data` 和可选 `etag` 的条目，而不仅仅是保存的值。请通过 `key` 匹配结果，而不要依赖数组顺序。在本例中，`widget-b` 已被删除；不同协议下缺失值的表现有所不同。详情请参阅[响应结构]({{% ref "js-state-management-client-usage.md#response-shapes" %}})。

## 使用 ETag 的乐观并发控制

`get` 只返回值，而不返回响应的 ETag。要同时读取值及其 ETag，请对单个键使用 `getBulk`。将返回的 ETag 传给后续的保存或删除操作，以检测并发修改。

```javascript
import { StateConcurrencyEnum, StateConsistencyEnum } from "@dapr/dapr";
```

请将此导入保留在模块作用域中。在 `try` 代码块中：

```javascript
const itemsWithEtags = await client.state.getBulk(storeName, ["widget-a"]);
const current = itemsWithEtags.find((item) => item.key === "widget-a");
if (!current || current.error || !current.etag) {
  throw new Error("Could not read widget-a with an ETag");
}

const updated = await client.state.save(storeName, [
  {
    key: "widget-a",
    value: { ...current.data, color: "green" },
    etag: current.etag,
    options: {
      concurrency: StateConcurrencyEnum.CONCURRENCY_FIRST_WRITE,
      consistency: StateConsistencyEnum.CONSISTENCY_STRONG,
    },
  },
]);
if (updated.error) {
  throw updated.error;
}
```

state store 必须支持 ETag。在先写入（first-write）并发模式下，ETag 不匹配表示另一个写入者修改了该值。请根据应用的规则处理冲突，例如读取最新的值并重新计算更新。不要盲目重试过期的 ETag。

对于条件删除，在任何一次成功更新之后，请读取**最新的** ETag：

```javascript
const latestItems = await client.state.getBulk(storeName, ["widget-a"]);
const latest = latestItems.find((item) => item.key === "widget-a");
if (!latest || latest.error || !latest.etag) {
  throw new Error("Could not read widget-a with an ETag");
}

const removed = await client.state.delete(storeName, "widget-a", {
  etag: latest.etag,
  concurrency: StateConcurrencyEnum.CONCURRENCY_FIRST_WRITE,
  consistency: StateConsistencyEnum.CONSISTENCY_STRONG,
});
if (removed.error) {
  throw removed.error;
}
```

HTTP 写入失败可能通过 `result.error` 返回，而 gRPC 失败会使 Promise 被拒绝。示例会检查结果，并且还有外层错误 handler，因此两种路径都不会被忽略。

## 删除多个条目

`deleteBulk` 接受仅包含键的条目，可选择性地提供 ETag、每个条目的 metadata 以及状态选项。它不需要值，也不会对值进行序列化：

```javascript
const bulkDeleted = await client.state.deleteBulk(storeName, [
  { key: "widget-a" },
  { key: "widget-b" },
]);
if (bulkDeleted.error) {
  throw bulkDeleted.error;
}
```

空数组会直接返回成功，而不会与 sidecar 通信。通过 HTTP 时，SDK 会逐个发出删除请求，并等待全部完成；通过 gRPC 时，则只发送一次批量删除 RPC。两者都不是原子操作，失败时可能只删除了部分条目。如需全有或全无的行为，请使用事务。

## 执行 state transaction

在支持事务的存储中，使用 `transaction` 原子地执行多个 `upsert` 和 `delete` 操作：

```javascript
await client.state.transaction(storeName, [
  {
    operation: "upsert",
    request: {
      key: "widget-a",
      value: { size: "medium", color: "green" },
    },
  },
  {
    operation: "delete",
    request: { key: "widget-b" },
  },
]);
```

本例使用上文配置的 `JsonSerializer`。如果没有显式指定序列化器，gRPC 事务实现需要已编码的字符串或字节，而不会像 `save` 那样对对象值进行序列化。

可选的第三个参数是事务范围的 metadata：

```javascript
await client.state.transaction(
  storeName,
  [
    {
      operation: "upsert",
      request: { key: "widget-c", value: { size: "small", color: "red" } },
    },
  ],
  { partitionKey: "widgets" },
);
```

metadata 和事务的约束取决于 component。例如，某个存储可能要求所有操作使用相同的分区。在事务中使用每个操作的 metadata 或 ETag 之前，请参阅[客户端用法限制]({{% ref "js-state-management-client-usage.md#transactions" %}})。

## 设置生存时间

对于支持 TTL 的存储，请将 `ttlInSeconds` 作为 metadata 传入。以下示例保存一个 60 秒后过期的条目：

```javascript
const expiring = await client.state.save(
  storeName,
  [{ key: "temporary-widget", value: { color: "blue" } }],
  { metadata: { ttlInSeconds: "60" } },
);
if (expiring.error) {
  throw expiring.error;
}
```

也可以在各个保存条目上提供 metadata。共享的保存 metadata 会覆盖同名的每个条目 metadata 键。有关 component 支持情况和过期语义，请参阅[state store TTL]({{% ref state-store-ttl.md %}})。

## 后续步骤

- [状态客户端用法]({{% ref js-state-management-client-usage.md %}})：选项、序列化、metadata、响应结构和错误。
- [Query State]({{% ref js-state-management-query.md %}})：在支持查询的存储中进行过滤、排序和分页。
