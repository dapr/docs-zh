---
type: docs
title: "操作方法：使用 Dapr JavaScript SDK 调用服务"
linkTitle: "调用服务"
weight: 10
description: "通过 HTTP 或 gRPC 客户端调用应用方法，并传递标头和查询参数"
---

`DaprClient.invoker.invoke()` 会通过调用方的边车，把请求发送到目标应用。这些示例使用 `@dapr/dapr` 3.19.0 或更高版本。请按照[接收调用指南]({{% ref js-service-invocation-server.md %}})启动下文使用的 `invocation-service` 目标应用。

## 通过 HTTP 调用应用

将以下完整示例保存为 `client.mjs`：

```javascript
import { DaprClient, HttpMethod } from "@dapr/dapr";

async function main() {
  const client = new DaprClient({
    daprHost: "127.0.0.1",
    daprPort: "3501",
  });

  try {
    const response = await client.invoker.invoke(
      "invocation-service",
      "orders",
      HttpMethod.POST,
      { orderId: "101", quantity: 2 },
      { headers: { "X-Correlation-ID": "order-101" } },
    );
    console.log(response);
  } finally {
    await client.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

在另一个终端中，使用其自身的边车运行调用方：

```sh
dapr run --app-id invocation-caller --dapr-http-port 3501 --dapr-grpc-port 50002 -- node client.mjs
```

调用方不需要 `--app-port`，因为它不接收回调。它的边车端口与目标服务的边车端口不同。

## 调用参数

公开的签名如下：

```typescript
invoke(
  appId: string,
  methodName: string,
  method: HttpMethod,
  data?: object,
  options?: InvokerOptions,
): Promise<object>;
```

| 参数 | 含义 |
| --- | --- |
| `appId` | 目标 Dapr app ID，而非调用方的 app ID 或主机地址。 |
| `methodName` | 目标方法或相对 HTTP 路径，例如 `orders` 或 `orders/101`。不要使用前导斜杠。 |
| `method` | `HttpMethod.GET`、`POST`、`PUT`、`PATCH` 或 `DELETE`。必须显式提供；各实现默认为 GET，但公开的 TypeScript 接口要求必须传入该参数。 |
| `data` | 可选的负载。对象和数组默认使用 JSON。 |
| `options` | `InvokerOptions` 对象，包含可选的 `headers`。它没有单次调用的超时、取消或重试字段。 |

结果是解码后的响应体，而不是响应封装对象。尽管公开的返回类型为 `object`，但 HTTP 可能返回文本，序列化器也可能返回其他 JavaScript 值。不存在 `invoke<T>()` 重载，TypeScript 类型也不会在运行时校验响应。

## 选择 HTTP 动词

以下代码片段假设已存在 `client`，且目标应用上有相匹配的路由：

```javascript
const order = await client.invoker.invoke("invocation-service", "orders/101", HttpMethod.GET);

const replaced = await client.invoker.invoke(
  "invocation-service", "orders/101", HttpMethod.PUT, { quantity: 4 },
);

const updated = await client.invoker.invoke(
  "invocation-service", "orders/101", HttpMethod.PATCH, { quantity: 3 },
);

await client.invoker.invoke("invocation-service", "orders/101", HttpMethod.DELETE);
```

不要为 HTTP GET 请求提供请求体。省略 `data` 的 gRPC 调用会发送默认负载 `{}`，而不是不带请求体。

## 通过 HTTP 传递标头和查询参数

使用第五个参数传递标头。若要省略请求体，请将第四个参数传为 `undefined`：

```javascript
const query = new URLSearchParams({ status: "pending", customer: "Ada Lovelace" });
const response = await client.invoker.invoke(
  "invocation-service",
  `orders?${query.toString()}`,
  HttpMethod.GET,
  undefined,
  { headers: { "X-Correlation-ID": "query-101" } },
);
```

对各个动态路径段使用 `encodeURIComponent()` 进行编码，对查询值使用 `URLSearchParams` 进行编码。SDK 会将 `methodName` 插入 HTTP 调用的 URL 中，但不会替你编码。

HTTP 实现支持自定义标头。gRPC 实现不会将 `options.headers` 作为请求元数据转发。配置了序列化器时，它只会使用 `headers["Content-Type"]` 覆盖负载的内容类型。它也不会填充请求中单独的 gRPC HTTP 扩展查询字符串字段，因此不要在 gRPC 客户端中使用 HTTP 查询字符串示例。

## 通过 gRPC 边车端点调用

将 `client.mjs` 中的客户端构造替换为：

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "50002",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
});
```

保留原示例中的 `HttpMethod` 导入和 `invoke()` 调用，但省略 HTTP 标头选项。调用方的启动命令保持不变：它同时暴露两个边车端点。接收方应用可以继续使用 HTTP。

默认情况下，gRPC 客户端会将响应字节按 UTF-8 解码，并解析为 JSON。即使远程操作已经成功，空响应体或纯文本响应也会以 `COULD_NOT_PARSE_RESULT` 被拒绝。请让目标返回 JSON 值，或配置兼容的[序列化器]({{% ref "js-service-invocation-usage.md#serialization" %}})。

## 跨命名空间调用

在 Dapr 的名称解析配置支持的情况下，使用其命名空间限定目标应用 ID：

```javascript
const response = await client.invoker.invoke(
  "invocation-service.production", "orders", HttpMethod.POST, { orderId: "101" },
);
```

命名空间路由是运行时的能力，而不是单独的 SDK 选项。请参阅[跨命名空间的服务调用]({{% ref service-invocation-namespaces.md %}})。

## 调用非 Dapr HTTP 端点

使用 HTTP 客户端时，若运行时支持，同一 API 可以按名称或完整限定的 URL 指向 `HTTPEndpoint` 资源：

```javascript
const configuredEndpoint = await client.invoker.invoke(
  "external-orders", "orders/101", HttpMethod.GET,
);

const urlEndpoint = await client.invoker.invoke(
  "https://api.example.com", "orders/101", HttpMethod.GET,
);
```

这些是可供选择的示例：运行前请先配置 `external-orders`，或替换示例中的 URL。目标不需要 Dapr 边车。有关资源配置、身份验证和运行时要求，请参阅[调用非 Dapr 端点]({{% ref howto-invoke-non-dapr-endpoints.md %}})。
