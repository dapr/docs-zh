---
type: docs
title: "操作方法：使用 Dapr JavaScript SDK 查询状态"
linkTitle: "操作方法：查询状态"
weight: 53150
description: 使用 JavaScript SDK 的 Alpha 阶段状态查询 API 对状态进行筛选、排序和分页
---

使用 `client.state.query` 在支持[状态查询 API]({{% ref howto-state-query-api.md %}})的状态存储中查询 JSON 文档。HTTP 和 gRPC 在 3.19.0 中均已实现。这是 **Alpha 阶段**的状态查询 API，而不是通用的 SQL 或原生数据库查询接口。

## 前提条件

按照[状态管理操作方法]({{% ref js-state-management-howto.md %}})安装 SDK，并运行一个带边车的应用。本指南需要配置一个支持查询的组件，名为 `state-mongodb`，配置方法参见 [MongoDB 状态存储参考]({{% ref setup-mongodb.md %}})。操作方法中的基础 Redis 组件本身并不包含查询支持的配置。

使用 JSON 兼容的已存储文档表示形式。某些组件需要额外的查询配置或元数据，请查阅组件参考。

## 配置客户端

在 ES 模块中使用以下客户端配置，并按照状态管理操作方法中的做法，用错误边界包裹应用操作，并在 `finally` 中调用 `await client.stop()`：

```javascript
import { CommunicationProtocolEnum, DaprClient, JsonSerializer } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "3500",
  communicationProtocol: CommunicationProtocolEnum.HTTP,
  serializer: new JsonSerializer(),
});
```

若使用 gRPC，将协议改为 `CommunicationProtocolEnum.GRPC`，端口改为 `"50001"`。显式的序列化器在两种协议下都会反序列化查询结果值。若不提供序列化器，gRPC 的查询结果将是原始的 `Uint8Array` 数据，而不是已解析的文档。

## 保存可查询的文档

当存储要求保留 JSON 文档时，提供 `contentType` 元数据：

```javascript
const saved = await client.state.save(
  "state-mongodb",
  [
    {
      key: "widget-a",
      value: { size: "small", color: "blue", warehouse: { region: "west" } },
    },
    {
      key: "widget-b",
      value: { size: "large", color: "blue", warehouse: { region: "east" } },
    },
  ],
  { metadata: { contentType: "application/json" } },
);
if (saved.error) {
  throw saved.error;
}
```

## 筛选与排序

SDK 接受包含 `filter`、`sort` 和 `page` 字段的对象。TypeScript 的 `StateQueryType` 要求这三个字段都存在。以下查询会找出位于任一地区的蓝色 widget，并按尺寸排序：

```javascript
const query = {
  filter: {
    AND: [
      { EQ: { color: "blue" } },
      { IN: { "warehouse.region": ["west", "east"] } },
    ],
  },
  sort: [{ key: "size", order: "ASC" }],
  page: { limit: 10 },
};

const response = await client.state.query("state-mongodb", query);
for (const item of response.results) {
  if (item.error) {
    throw new Error(`Unable to read query result ${item.key}: ${item.error}`);
  }
  console.log(item.key, item.data, item.etag);
}
```

筛选中使用的是**已存储文档**中的字段路径。SDK 不会通过自定义序列化器转换筛选路径。例如，若序列化器把每个值包装在 `payload` 属性中，则筛选路径需要与这种表示形式一致。

SDK 声明的筛选操作符包括 `EQ`、`IN`、`AND` 和 `OR`。排序项接受 `ASC` 或 `DESC`；省略时默认为升序（即运行时的默认值）。运行时查询 API 文档中列出了更多操作符，但不要假设本 SDK 版本的顶层筛选类型中也能表示它们。

对于不带筛选、不排序的单页查询，使用 `filter: {}`、`sort: []` 和 `page: { limit: 10 }`。包含 `language` 和 `query` 的 SQL 字符串或对象，都不是本 API 接受的 `StateQueryType`。

在 TypeScript 中，若将查询提取到变量中，请保留字面量排序方向，例如使用 `order: "ASC" as const`；或者直接把查询对象传给 `client.state.query`。

## 获取下一页

响应包含 `results` 和可选的 `token`。将 token 视为不透明值，把它放入 `page.token` 中传回，同时保留原来的筛选、排序和页大小：

```javascript
if (response.token) {
  const nextPage = await client.state.query("state-mongodb", {
    ...query,
    page: { ...query.page, token: response.token },
  });

  for (const item of nextPage.results) {
    if (item.error) {
      throw new Error(`Unable to read query result ${item.key}: ${item.error}`);
    }
    console.log(item.key, item.data);
  }
}
```

持续请求，直到不再返回延续令牌。这里没有自动分页器；不应因为 `results` 是空数组就代替对令牌的检查。

## 响应与协议注意事项

每个查询结果包含 `key`、`data`，以及可选的 `etag` 和 `error`。除了捕获 Promise 拒绝之外，还要检查每条结果中的 error。

配置了序列化器后，SDK 会对成功且非空的结果值进行反序列化。若未配置，HTTP 返回运行时的 JSON 结果数据，而 gRPC 返回字节。对于 gRPC 上未配置序列化器的已知 JSON 数据，需要显式解码成功条目的 data：`JSON.parse(Buffer.from(item.data).toString("utf8"))`；不要对 HTTP 结果应用这一转换，因为它们已经是对象。

声明的响应只暴露 `results` 和 `token`，没有可移植的响应元数据映射。`query` 也没有单独的请求元数据参数。存储的支持情况、索引、筛选行为以及分页语义都取决于具体组件。

有关配置、序列化兼容性和错误处理，请参阅[状态客户端用法]({{% ref js-state-management-client-usage.md %}})。
