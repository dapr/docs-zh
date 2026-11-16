---
type: docs
title: "操作指南：使用 Dapr JavaScript SDK 存储与查询向量"
linkTitle: "操作指南：存储与查询向量"
weight: 53050
description: "了解如何使用 Dapr JavaScript SDK 管理集合、存储嵌入向量并查询相似向量"
---

使用 `DaprClient.vector` 存储预先计算好的嵌入向量，并通过 Dapr 向量存储组件查找相似记录。本指南涵盖集合配置、写入（upsert）、读取记录、相似性查询、批量查询和删除。

## 先决条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化的 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})，并使用 1.19 发行线或更高版本、支持向量 API 的运行时
- [Node.js](https://nodejs.org/) 18 或更高版本
- [`@dapr/dapr`](https://www.npmjs.com/package/@dapr/dapr) 包，版本 3.19.0 或更高
- 已配置的向量存储组件，例如下面的 in-memory 组件

{{% alert title="运行时支持" color="warning" %}}
请使用包含向量 API 的 Dapr 运行时。仅安装 JavaScript SDK 3.19.0 并不能启用运行时对向量的支持。
{{% /alert %}}

在应用目录中，如果还没有 npm 项目，请先初始化一个，然后安装 SDK：

```sh
npm init -y
npm install @dapr/dapr@3.19.0
```

示例使用 JavaScript ES 模块，以 `.mjs` 文件运行，无需 TypeScript 编译器。同样的 API 在 TypeScript 中也可用。

## 配置内存向量存储

在应用目录中创建 `components` 目录，并将以下内容保存为其中的 `vectorstore.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vectorstore
spec:
  type: vector.in-memory
  version: v1
```

该组件把集合和记录存储在边车的内存中。边车停止后数据即丢失，且不会在多个边车之间共享。它适用于本地开发和测试，不适用于持久化存储。

组件的 `metadata.name`（即 `vectorstore`）是每次客户端操作时传入的存储名称，它既不是组件的类型，也不是 YAML 文件名。集合则是该存储内一组独立命名的记录。

## 创建集合并查询向量

将以下内容保存为 `app.mjs`：

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "3500",
  communicationProtocol: CommunicationProtocolEnum.HTTP,
});

const storeName = "vectorstore";
const collection = "documents";
const writeOptions = {
  mode: "waitForCompletion",
  waitTimeout: "10s",
  onWaitTimeout: "failRequest",
};

try {
  await client.vector.createCollection(storeName, collection, {
    dimensions: 3,
    metric: "cosine",
  });

  const write = await client.vector.upsertVectors(
    storeName,
    collection,
    [
      {
        id: "doc-1",
        values: [1, 0, 0],
        payload: Buffer.from("Introduction to Dapr"),
        metadata: { category: "guide", details: { language: "en" } },
      },
      {
        id: "doc-2",
        values: [0.8, 0.6, 0],
        payload: Buffer.from("Building applications with Dapr"),
        metadata: { category: "guide", details: { language: "en" } },
      },
      {
        id: "doc-3",
        values: [0, 1, 0],
        metadata: { category: "reference", details: { language: "en" } },
      },
    ],
    writeOptions,
  );

  if (write.failedItems.length > 0) {
    console.error("Vector upsert failures:", write.failedItems);
    throw new Error("Not all vector records were stored");
  }
  if (write.ack !== "completed") {
    throw new Error("Vector indexing has not completed");
  }

  const result = await client.vector.queryVectors(storeName, collection, {
    vector: [1, 0, 0],
    topK: 2,
    includePayload: true,
    filter: { category: { $eq: "guide" } },
  });

  console.log("Metric:", result.metric);
  for (const match of result.matches) {
    console.log(
      match.record.id,
      match.score,
      match.record.payload === undefined
        ? "(no payload)"
        : Buffer.from(match.record.payload).toString("utf8"),
    );
  }
} finally {
  await client.stop();
}
```

使用 Dapr 边车启动应用，并从 `components` 目录加载组件：

{{< tabpane text=true >}}
{{% tab "Linux/MacOS" %}}
```sh
dapr run --app-id vector-example --dapr-http-port 3500 --dapr-grpc-port 50001 --resources-path ./components -- node app.mjs
```
{{% /tab %}}
{{% tab "Windows" %}}
```powershell
dapr run --app-id vector-example --dapr-http-port 3500 --dapr-grpc-port 50001 --resources-path .\components -- node app.mjs
```
{{% /tab %}}
{{< /tabpane >}}

该示例创建了一个三维、使用余弦度量的集合，等待索引完成，并找出与之最接近的两条类别为 guide 的记录。使用 in-memory 组件时，`doc-1` 的分数约为 `1`，`doc-2` 约为 `0.8`。这些示例向量是直接提供的，SDK 不会生成嵌入向量。

如需改用 gRPC，请将 `communicationProtocol` 改为 `CommunicationProtocolEnum.GRPC`，并将 `daprPort` 改为 `"50001"`。所有向量方法在两种协议下都可用。

下面的示例会复用 `client`、`storeName`、`collection` 和 `writeOptions`。请把它们加在 `try` 块中、查询之后、客户端停止之前。删除示例请最后运行。创建已存在的集合会失败；如果要在同一个边车上重新运行，请复用已有集合，或先显式删除它。

## 查看集合并获取记录

```javascript
console.log(await client.vector.listCollections(storeName));

const info = await client.vector.getCollection(storeName, collection);
console.log(info.collection, info.dimensions, info.metric, info.recordCount);

const records = await client.vector.getVectors(
  storeName,
  collection,
  ["doc-2", "missing", "doc-1"],
  { includeValues: true },
);
console.log(records);
```

`getCollection` 返回集合名称、维度、实际生效的度量方式、近似记录数，以及组件特定的 `properties`。无法获取时记录数为 `0`。

`getVectors` 会省略不存在的 ID，并保持找到的记录的请求顺序。它总会获取负载（payload）和记录元数据，但除非 `includeValues` 为 `true`，否则返回 `values: []`。负载以 `Uint8Array` 形式返回，不会自动解码为文本或 JSON。

## 以已有记录查询并过滤元数据

如果不想提供向量，可以使用 `byId`，以已存储记录的向量进行搜索：

```javascript
const similar = await client.vector.queryVectors(storeName, collection, {
  byId: "doc-1",
  topK: 5,
  includeValues: true,
  includePayload: true,
  scoreThreshold: 0.5,
  filter: {
    $and: [
      { category: { $eq: "guide" } },
      { "details.language": { $eq: "en" } },
    ],
  },
});
console.log(similar.matches);
```

`vector` 和 `byId` 必须且只能提供其一。源记录不存在时，该次查询会失败。`byId` 查询的结果中是否包含源记录本身，取决于具体组件。

过滤条件作用于记录元数据，而不是负载字节。可移植的过滤 DSL 支持 `$eq`、`$ne`、`$gt`、`$gte`、`$lt`、`$lte`、`$in`、`$nin`、`$exists`，以及布尔运算符 `$and`、`$or` 和 `$not`。嵌套的元数据字段请使用点号路径。

对于余弦和点积，分数越高越好；对于欧氏距离，距离越小越好。`scoreThreshold` 以度量的原始刻度计算且包含边界值：对于余弦或点积，它是最低分数；对于欧氏距离，它是最大距离。它不是归一化的概率。

## 运行多个查询

`batchQueryVectors` 会对同一存储和集合运行多个查询，并按请求顺序为每个查询返回一个结果：

```javascript
const results = await client.vector.batchQueryVectors(storeName, collection, [
  { vector: [1, 0, 0], topK: 1 },
  { byId: "missing", topK: 1 },
]);

for (const [index, result] of results.entries()) {
  if (result.error !== undefined) {
    console.error("Query failed:", index, result.error.code, result.error.message);
  } else {
    console.log("Query matches:", index, result.response.matches);
  }
}
```

单个查询的运行时或提供方失败只会留在该查询对应的结果槽位中。针对整个请求的失败会使整个调用被拒绝。不要把批量调用返回的已解析（resolved）Promise 当作所有查询都成功的证明。

## 删除记录和集合

```javascript
const ack = await client.vector.deleteVectors(
  storeName,
  collection,
  ["doc-1", "missing"],
  writeOptions,
);
console.log("Delete acknowledgement:", ack);

await client.vector.deleteCollection(storeName, collection);
```

删除不存在的记录 ID 不会报错。删除集合会同时移除该集合及其中的记录；对不存在的集合执行操作会失败。

## 后续步骤

请阅读[客户端使用指南]({{% ref js-vector-client-usage.md %}})，了解索引确认、记录替换、查询默认值、取消和错误处理。
