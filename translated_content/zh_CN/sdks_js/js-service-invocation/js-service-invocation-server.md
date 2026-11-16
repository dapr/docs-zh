---
type: docs
title: "操作方法：使用 JavaScript SDK 接收服务调用"
linkTitle: "接收调用"
weight: 20
description: "注册 HTTP 或 gRPC 调用处理程序，并理解回调请求与响应"
---

使用 `DaprServer.invoker.listen(methodName, callback, options?)` 注册调用处理程序。这些示例使用 `@dapr/dapr` 3.19.0 或更高版本。

## 启动 HTTP 服务

将以下完整示例保存为 `server.mjs`：

```javascript
import { DaprServer, HttpMethod } from "@dapr/dapr";

async function main() {
  const server = new DaprServer({
    serverHost: "127.0.0.1",
    serverPort: "3000",
    clientOptions: {
      daprHost: "127.0.0.1",
      daprPort: "3500",
    },
  });

  await server.invoker.listen(
    "orders",
    async (request) => {
      if (!request.body) {
        throw new Error("An order request body is required");
      }
      const order = JSON.parse(request.body);
      console.log("Received order:", order);
      console.log("Correlation ID:", request.headers?.["x-correlation-id"]);
      return { orderId: order.orderId, status: "accepted" };
    },
    { method: HttpMethod.POST },
  );

  await server.invoker.listen("health", async () => ({ healthy: true }));
  await server.start();

  async function stop() {
    await server.stop();
    await server.client.stop();
  }

  process.once("SIGINT", () => {
    stop().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

运行服务及其边车：

```sh
dapr run --app-id invocation-service --app-port 3000 --app-protocol http --dapr-http-port 3500 --dapr-grpc-port 50001 -- node server.mjs
```

请在 `server.start()` 之前注册处理程序。`listen()` 方法默认使用 GET；对于 `orders` 处理程序，需要显式设置 `{ method: HttpMethod.POST }`。调用方必须使用相同的方法名和动词。`health` 路由只是一个普通的示例调用路由，并不是对 Dapr 应用健康检查的配置。

可以使用[客户端示例]({{% ref js-service-invocation-howto.md %}})调用该服务，也可以通过 CLI 调用：

```sh
dapr invoke --app-id invocation-service --method health --verb GET
```

## 通过 gRPC 接收

要使用 Dapr 的 gRPC 应用回调 API，请将 `CommunicationProtocolEnum` 添加到导入项中，并将服务器构造替换为：

```javascript
const server = new DaprServer({
  serverHost: "127.0.0.1",
  serverPort: "3000",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
  clientOptions: {
    daprHost: "127.0.0.1",
    daprPort: "50001",
  },
});
```

保持相同的处理程序注册与启动代码。使用以下命令重启目标：

```sh
dapr run --app-id invocation-service --app-port 3000 --app-protocol grpc --dapr-http-port 3500 --dapr-grpc-port 50001 -- node server.mjs
```

除非在 `clientOptions` 中另有指定，嵌入式客户端的协议与服务器协议保持一致。`serverPort` 是应用的监听端口，`clientOptions.daprPort` 是边车端点；两者不要互换。HTTP 调用方仍然可以调用这个 gRPC 回调服务。

## 理解回调请求

TypeScript 处理程序接收从 `@dapr/dapr` 导出的 `DaprInvokerCallbackContent`。回调是异步的，并返回一个解析为响应值的 Promise。

| 字段 | HTTP 回调 | gRPC 回调 |
| --- | --- | --- |
| `body` | 通常为经过 HTTP 请求体解析器处理后的 `JSON.stringify(req.body)`；未解析出请求体时为 `undefined` | 对请求数据字节进行 UTF-8 解码；未发送数据时为 `""` |
| `metadata.contentType` | 传入的 `content-type` 请求头 | 调用请求的内容类型 |
| `query` | 原始 URL，包含路径和查询字符串 | HTTP 扩展的查询字符串字段 |
| `headers` | 传入的 HTTP 请求头；名称通常为小写 | 不填充 |

对于 JSON 请求，请像示例中那样显式解析 `request.body`。即使配置了自定义序列化器，调用处理程序也不会收到自动反序列化的领域对象。

对于 HTTP 回调，请将 URL 作为完整 URL 来解析查询参数，而不能只解析查询字符串：

```javascript
await server.invoker.listen("orders", async (request) => {
  const url = new URL(request.query ?? "/orders", "http://localhost");
  const status = url.searchParams.get("status");
  return { status };
}, { method: HttpMethod.GET });
```

对于 gRPC 回调，`query` 只包含扩展的查询字符串，可以用 `URLSearchParams` 读取。JavaScript gRPC 调用器本身不会填充该字段。

## 返回响应

直接返回应用的响应值：

```javascript
await server.invoker.listen("version", async () => ({ version: "1.0" }));
```

默认情况下，SDK 会对真值（truthy）的返回值进行 JSON 编码。不存在特殊的 `{ status, headers, body }` 响应包装格式：返回这样的对象时，这些属性会作为应用数据发送。回调 API 不提供 HTTP 响应对象，也不暴露 gRPC 响应元数据。

在没有自定义序列化器的情况下，`undefined`、`null`、`false`、`0` 和 `""` 不会生成对应的 JSON 值。HTTP 处理程序会改为返回 `{"closed":true}`；gRPC 处理程序则不返回任何数据。默认的 gRPC 客户端无法解析这种空响应。建议返回对象，例如 `{ accepted: false }`。

配置自定义序列化器后，除 `undefined` 之外的每个返回值都会被序列化，包括假值（falsy）。对于 `undefined`，HTTP 仍然返回闭包对象，gRPC 仍然不返回数据。参见[序列化指南]({{% ref "js-service-invocation-usage.md#serialization" %}})。

抛出的处理程序错误会传递给底层的 HTTP 错误中间件或 gRPC 传输层；它们不会作为成功的应用响应对象返回。如果调用方需要特定的 HTTP 状态码、响应头或流式响应，请改用常规的 HTTP 框架路由。

## 使用现有 HTTP 应用

Dapr 可以在不使用 `DaprServer` 的情况下调用现有的 HTTP 路由。使用 `--app-port` 和 `--app-protocol http` 运行该应用，并在 Dapr 客户端中将其路由路径用作 `methodName`。

要与 SDK 回调共享一个 Express 应用，请将 Express 实例作为 `serverHttp` 传入：

```javascript
import express from "express";
import { DaprServer } from "@dapr/dapr";

const app = express();
app.get("/orders/:id", (request, response) => {
  response.status(200).json({ orderId: request.params.id });
});

const server = new DaprServer({
  serverHost: "127.0.0.1",
  serverPort: "3000",
  serverHttp: app,
  clientOptions: { daprHost: "127.0.0.1", daprPort: "3500" },
});

await server.start();
```

为此备选示例，请将 `express` 安装为应用依赖项，并使用上面的 HTTP 启动命令。`server.start()` 会启动监听器，因此不要再调用 `app.listen()`。SDK 会向所提供的应用添加中间件和路由，请避免路由名称冲突。请在应用自身的关闭逻辑中依次调用 `server.stop()` 和 `server.client.stop()`。
