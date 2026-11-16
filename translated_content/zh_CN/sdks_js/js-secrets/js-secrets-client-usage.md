---
type: docs
title: "机密客户端用法"
linkTitle: "客户端用法"
weight: 52900
description: 配置 JavaScript 机密客户端，理解元数据、响应结构、协议差异与错误
---

机密可通过 `DaprClient.secret` 访问；没有单独的机密客户端包或构建器。本指南面向 `@dapr/dapr` 3.19.0 或更高版本。

## 客户端生命周期与配置

请在各项操作之间复用长期存活的 `DaprClient`。其机密客户端与父客户端共享连接及认证设置。应用关闭时，请在调用 `await client.stop()` 之前等待所有尚未完成的操作；不要在每次查询机密后都停止共享客户端。

HTTP 是默认协议。若要显式配置 gRPC：

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
  daprApiToken: process.env.DAPR_API_TOKEN,
});
```

使用 `CommunicationProtocolEnum.HTTP` 并配合 HTTP 端口（默认 `"3500"`）即可使用 HTTP。端口值为字符串。选择 SDK 协议只控制客户端与边车之间的通信，不需要应用服务器。

若既未提供 `daprHost`，也未提供 `daprPort`，SDK 可以根据所选协议使用 `DAPR_HTTP_ENDPOINT` 或 `DAPR_GRPC_ENDPOINT`。显式的主机或端口选项优先于端点环境变量。否则，SDK 默认使用 `127.0.0.1`，以及 `DAPR_HTTP_PORT` 或 `DAPR_GRPC_PORT`，若未设置则回退到 `3500` 或 `50001`。省略 `daprApiToken` 时，令牌默认取自 `DAPR_API_TOKEN`。

API 令牌用于向 Dapr 边车认证，而不是直接向机密存储提供方认证。请在[机密存储组件]({{% ref setup-secret-store.md %}})中配置提供方凭据与访问权限。使用[机密作用域]({{% ref secrets-scopes.md %}})限制应用可以检索的机密，使用[组件作用域]({{% ref component-scopes.md %}})限制哪些应用可以使用某个组件。

## 可用操作

公开签名如下：

```typescript
get(secretStoreName: string, key: string, metadata?: string): Promise<object>;
getBulk(secretStoreName: string): Promise<object>;
```

以 `client.secret.get(...)` 和 `client.secret.getBulk(...)` 的形式调用这些方法。

| 能力 | HTTP | 3.19.0 中的 gRPC |
|------------|------|--------------------|
| 检索单个机密 | 返回完整的数据映射 | 仅返回第一个键值对；若数据映射为空则返回 `{}` |
| `get` 的每次请求元数据 | 带有 `metadata.` 前缀键的查询字符串 | 参数被接受但被忽略 |
| 批量检索 | 嵌套的机密数据映射 | 嵌套的机密数据映射，保留所有值 |
| `getBulk` 的每次请求元数据 | 不提供 | 不提供 |

这些限制同时存在于 [3.19.0 HTTP 实现](https://github.com/dapr/js-sdk/blob/v3.19.0/src/implementation/Client/HTTPClient/secret.ts) 和 [gRPC 实现](https://github.com/dapr/js-sdk/blob/v3.19.0/src/implementation/Client/GRPCClient/secret.ts) 中，并且在本指南所审阅的最新源码中依然存在。升级时请检查实现与发行说明。

SDK 不提供机密写入、删除、订阅、类型化机密生成或自动机密刷新功能。请在底层提供方中管理机密的创建与轮换。如果你的应用缓存了检索到的值，它必须自行决定何时重新获取。

## 元数据与名称

HTTP `get` 会将元数据字符串直接追加到请求 URL 的 `?` 之后。不要包含前导 `?`、不要传入对象，也不要省略 `metadata.` 前缀。例如：

```javascript
const metadata = new URLSearchParams({
  "metadata.namespace": "payments",
}).toString();

const secret = await client.secret.get(
  "kubernetes",
  "database-credentials",
  metadata,
);
```

这要求使用 Kubernetes 机密存储，并且已存在一个 HTTP 客户端。元数据键取决于具体组件；请参阅 [机密 API 参考]({{% ref secrets_api.md %}}) 和[组件参考]({{% ref supported-secret-stores %}})。

存储名称和机密名称区分大小写。HTTP 实现会将它们插入 URL 路径中，且不做编码。如果机密名称包含 URL 保留字符，请在将其传给 HTTP `get` 之前使用 `encodeURIComponent` 对机密名称进行编码。不要对 gRPC 机密名称进行编码，它们以 protobuf 字段的形式发送。

## 响应结构与 TypeScript

对于成功的单个机密请求，数据是字符串键到字符串值的映射。有些存储会将机密名称作为唯一的键返回；另一些（例如 Kubernetes）则会返回多个字段，且不以机密名称作为包装。HTTP 会保留所有这些字段。不要依赖 gRPC 的第一条目选择来从多值机密中挑选某个特定字段。

成功的批量响应是从机密名称到其数据映射的映射。它不是扁平的映射，每个机密内部的字段名由组件决定。批量检索是否可用以及返回哪些机密，取决于组件及访问配置。

这两个方法都声明为 `Promise<object>`，而不是泛型或强类型字典。TypeScript 调用方在索引响应之前应先校验，而不要假定声明保证了字段为字符串值：

```typescript
function isStringMap(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

const secret = await client.secret.get("local-secret-store", "api-key");
if (!isStringMap(secret) || typeof secret["api-key"] !== "string") {
  throw new Error("The required api-key secret was not returned");
}

const apiKey = secret["api-key"];
```

此代码片段假定已存在 `client`，并运行在 async 函数或 ES 模块中。对于批量响应，应先校验外层对象，再校验你所需的每个机密的数据映射。仅检查响应是否为对象，并不能保证所需的机密一定存在。

## 错误与缺失的机密

请在应用的错误边界处等待每个操作并处理失败。缺失组件、访问被拒绝、不支持的批量检索、提供方故障以及边车连接失败，都可能使 Promise 被拒绝。

- **HTTP 运行时错误：** 非成功响应会变成 JavaScript `Error` 实例，其 `message` 是一个 JSON 字符串，包含 `status`（HTTP 状态码）、`error`（状态文本）和 `error_msg`（运行时响应体）。网络错误与启动错误的结构可能不同；不要假定每条错误消息都是 JSON。
- **gRPC 运行时错误：** RPC 失败会使用来自 `@connectrpc/connect` 的 `ConnectError`，其中包含 gRPC/Connect 错误码，而不是 HTTP 状态码。
- **缺失或空的机密：** 不要假定缺失的机密一定会使 Promise 被拒绝。其行为取决于组件与运行时响应。在本 SDK 中，HTTP `204 No Content` 会解析为空字符串，尽管声明为 `Promise<object>`。gRPC 会将空数据映射解析为 `{}`。请校验必需字段，并明确报告其缺失。

请参阅 [机密 API 参考]({{% ref secrets_api.md %}}) 了解运行时状态码。避免记录返回的机密，或可能包含敏感提供方信息的原始错误负载。

## 取消与批量检索限制

两个方法都不提供 `AbortSignal`、单次调用超时或请求选项参数。不要假定其他 SDK 构建块上的取消支持也适用于机密。让请求与定时器竞争，只能限制应用的等待时长，并不会取消底层请求。

`getBulk` 会将整个响应一次性返回到内存中，不分页、不流式传输，也不提供键过滤。当你只需要少量机密时，请优先使用单独的请求。若为了绕过 gRPC 的多值限制而使用批量检索，可能会检索到超出应用所需的机密；HTTP `get` 通常是范围更窄的选择。

## 测试你的应用

请将机密访问放在应用自有的接口之后，或注入代码所需的方法。测试单值与多值响应、嵌套的批量响应、缺失必需字段的情况以及被拒绝的 Promise。请使用实际的 `object` 返回类型，而不是假定一个带类型的机密模型。

对于集成测试，请使用开发用机密存储运行边车，例如[本地文件示例]({{% ref js-secrets-howto.md %}})。如果你的应用同时支持 HTTP 和 gRPC，请分别测试两者；单值成功的情况并不会覆盖元数据及多值响应的差异。
