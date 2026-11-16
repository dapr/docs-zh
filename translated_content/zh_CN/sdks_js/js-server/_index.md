---
type: docs
title: "JavaScript Server SDK"
linkTitle: "Server"
weight: 2000
description: 用于开发 Dapr 应用程序的 JavaScript Server SDK
---

## 简介

Dapr Server 允许你接收来自 Dapr 边车的通信，并访问其面向服务端的功能，例如：订阅事件、接收输入绑定以及更多功能。

使用 JavaScript SDK **3.19.0 或更高版本**时，可通过 `server.jobs.listen(name, callback)` 注册定时作业的回调。可运行的示例请参阅[作业操作指南]({{% ref js-jobs-howto.md %}})，关于确认、重试和协议要求，请参阅[回调用法指南]({{% ref js-jobs-client-usage.md %}})。

## 前置条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- [最新 LTS 版本的 Node 或更高版本](https://nodejs.org/en/)

## 安装和导入 Dapr 的 JS SDK

1. 使用 `npm` 安装 SDK：

```bash
npm i @dapr/dapr --save
```

2. 导入库：

```typescript
import { DaprServer, CommunicationProtocolEnum } from "@dapr/dapr";

const daprHost = "127.0.0.1"; // Dapr 边车主机
const daprPort = "3500"; // 此示例服务器的 Dapr 边车端口
const serverHost = "127.0.0.1"; // 此示例服务器的应用主机
const serverPort = "50051"; // 此示例服务器的应用端口

// HTTP 示例
const server = new DaprServer({
  serverHost,
  serverPort,
  communicationProtocol: CommunicationProtocolEnum.HTTP, // DaprClient 使用与 DaprServer 相同的通信协议，以防 DaprClient 未显式指定协议
  clientOptions: {
    daprHost,
    daprPort,
  },
});

// gRPC 示例
const server = new DaprServer({
  serverHost,
  serverPort,
  communicationProtocol: CommunicationProtocolEnum.GRPC,
  clientOptions: {
    daprHost,
    daprPort,
  },
});
```

## 运行

要运行这些示例，你可以使用两种不同的协议与 Dapr 边车交互：HTTP（默认）或 gRPC。

### 使用 HTTP（内置 express webserver）

```typescript
import { DaprServer } from "@dapr/dapr";

const server = new DaprServer({
  serverHost: appHost,
  serverPort: appPort,
  clientOptions: {
    daprHost,
    daprPort,
  },
});
// 在服务器启动前初始化订阅等内容
// Dapr 边车依赖这些内容
await server.start();
```

```bash
# 使用 dapr run
dapr run --app-id example-sdk --app-port 50051 --app-protocol http -- npm run start

# 或者，使用 npm 脚本
npm run start:dapr-http
```

> ℹ️ **注意：** 这里必须设置 `app-port`，因为服务器需要绑定到该端口。Dapr 会在完成启动前检查应用程序是否已绑定到此端口。

### 使用 HTTP（自带 express webserver）

除了使用 Dapr 边车内置的 Web 服务器与应用程序通信之外，你也可以使用自己的实例。当你在构建 REST API 后端并希望直接在其中集成 Dapr 时，这种方式很有帮助。

注意，目前仅支持 [`express`](https://www.npmjs.com/package/express)。

> 💡 **注意：** 使用自定义 Web 服务器时，SDK 会配置最大请求体大小等服务器属性，并向其中添加新路由。这些路由本身是唯一的，以避免与你的应用程序发生冲突，但不保证绝不会冲突。

```typescript
import { DaprServer, CommunicationProtocolEnum } from "@dapr/dapr";
import express from "express";

const myApp = express();

myApp.get("/my-custom-endpoint", (req, res) => {
  res.send({ msg: "My own express app!" });
});

const daprServer = new DaprServer({
      serverHost: "127.0.0.1", // 应用主机
      serverPort: "50002", // 应用端口
      serverHttp: myApp,
      clientOptions: {
        daprHost
        daprPort
      }
    });

// 在服务器启动前初始化订阅，Dapr 边车会使用这些订阅。
// 这也会初始化应用服务器本身（无需再调用 `app.listen`）。
await daprServer.start();
```

完成上述配置后，你可以像平常一样调用自定义端点：

```typescript
const res = await fetch(`http://127.0.0.1:50002/my-custom-endpoint`);
const json = await res.json();
```

### 使用 gRPC

由于 HTTP 是默认协议，若要使用 gRPC，需要调整通信协议。你可以通过向客户端或服务端构造函数传递额外参数来实现这一点。

```typescript
import { DaprServer, CommunicationProtocolEnum } from "@dapr/dapr";

const server = new DaprServer({
  serverHost: appHost,
  serverPort: appPort,
  communicationProtocol: CommunicationProtocolEnum.GRPC,
  clientOptions: {
    daprHost,
    daprPort,
  },
});
// 在服务器启动前初始化订阅等内容
// Dapr 边车依赖这些内容
await server.start();
```

```bash
# 使用 dapr run
dapr run --app-id example-sdk --app-port 50051 --app-protocol grpc -- npm run start

# 或者，使用 npm 脚本
npm run start:dapr-grpc
```

> ℹ️ **注意：** 这里必须设置 `app-port`，因为服务器需要绑定到该端口。Dapr 会在完成启动前检查应用程序是否已绑定到此端口。

## 构建块

JavaScript Server SDK 允许你与所有 [Dapr 构建块]({{% ref building-blocks %}}) 交互，重点是边车到应用程序的功能。

### Invocation API

对于 JavaScript SDK 3.19.0 或更高版本，关于 HTTP 和 gRPC 的能力，请参阅[服务调用概述]({{% ref js-service-invocation %}})。

#### 监听调用

```typescript
import { DaprServer, HttpMethod } from "@dapr/dapr";
import type { DaprInvokerCallbackContent } from "@dapr/dapr";

const daprHost = "127.0.0.1"; // Dapr 边车主机
const daprPort = "3500"; // 此示例服务器的 Dapr 边车端口
const serverHost = "127.0.0.1"; // 此示例服务器的应用主机
const serverPort = "50051"; // 此示例服务器的应用端口 "

async function start() {
  const server = new DaprServer({
    serverHost,
    serverPort,
    clientOptions: {
      daprHost,
      daprPort,
    },
  });

  const callbackFunction = async (data: DaprInvokerCallbackContent) => {
    console.log("Received body: ", data.body);
    console.log("Received metadata: ", data.metadata);
    console.log("Received query: ", data.query);
    console.log("Received headers: ", data.headers); // 仅在 HTTP 中可用
    return { received: true };
  };

  await server.invoker.listen("hello-world", callbackFunction, { method: HttpMethod.GET });

  // 现在你可以使用应用 ID 和方法 "hello-world" 调用此服务

  await server.start();
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

关于匹配的启动命令、回调字段结构、响应行为以及已有的 Express 应用程序，请参阅[接收调用]({{% ref js-service-invocation-server.md %}})。关于自定义序列化和故障处理，请参阅[配置与用法]({{% ref js-service-invocation-usage.md %}})。

### PubSub API

对于 JavaScript SDK 3.19.0 或更高版本，请参阅[发布与订阅概述]({{% ref js-pubsub %}})以选择投递模式。由客户端发起的[流式订阅]({{% ref js-pubsub-streaming-howto.md %}})不需要 `DaprServer`。

#### 订阅消息

请在 `server.start()` 之前为每个组件/主题组合注册一次。本示例使用端口 `50002` 上的 HTTP 监听器：

```typescript
import { DaprPubSubStatusEnum, DaprServer } from "@dapr/dapr";

async function start() {
  const server = new DaprServer({
    serverHost: "127.0.0.1",
    serverPort: "50002",
    clientOptions: { daprHost: "127.0.0.1", daprPort: "3500" },
  });

  await server.pubsub.subscribe("pubsub", "orders", async (data) => {
    console.log("Order received:", data);
    return DaprPubSubStatusEnum.SUCCESS;
  });

  await server.start();
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

关于对应的 `dapr run` 命令、gRPC 配置、注册方法以及回调的数据和标头，请参阅[服务端订阅指南]({{% ref js-pubsub-subscribe-howto.md %}})。关于序列化和关闭，请参阅[配置与用法]({{% ref js-pubsub-usage.md %}})。

#### 使用 SUCCESS/RETRY/DROP 状态订阅

请返回 `DaprPubSubStatusEnum` 的值，而不是响应对象。关于状态优先级、抛出的错误以及入站弹性策略，请参阅[确认与重试]({{% ref "js-pubsub-subscribe-howto.md#acknowledge-retry-or-drop" %}})。

#### 基于规则订阅消息

使用 `subscribeWithOptions()` 声明路由，使用 `subscribeToRoute()` 绑定处理程序。请参阅[基于内容的路由示例]({{% ref "js-pubsub-subscribe-howto.md#content-based-routing" %}})。

#### 通配符订阅

关于 MQTT 风格的 `#` 和 `+` 示例以及组件要求，请参阅[通配符主题]({{% ref "js-pubsub-subscribe-howto.md#wildcard-topics" %}})。

#### 批量订阅消息

`subscribeBulk()` 会逐条将条目投递给你的回调，并为每个条目生成确认。关于批处理选项和 HTTP 负载限制，请参阅[批量订阅]({{% ref "js-pubsub-subscribe-howto.md#bulk-subscriptions" %}})。

#### 死信主题

在源订阅上设置 `deadLetterTopic`，并为处理失败的消息注册一个单独的消费者。完整示例以及 `deadLetterCallback` 的限制，请参阅[死信主题]({{% ref "js-pubsub-subscribe-howto.md#dead-letter-topics" %}})。

### Bindings API

#### 接收输入绑定

```typescript
import { DaprServer } from "@dapr/dapr";

const daprHost = "127.0.0.1";
const daprPort = "3500";
const serverHost = "127.0.0.1";
const serverPort = "5051";

async function start() {
  const server = new DaprServer({
    serverHost,
    serverPort,
    clientOptions: {
      daprHost,
      daprPort,
    },
  });

  const bindingName = "my-binding-name";

  const response = await server.binding.receive(bindingName, async (data: any) =>
    console.log(`Got Data: ${JSON.stringify(data)}`),
  );

  await server.start();
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

> 有关输出绑定的完整指南，请参阅[操作指南：使用绑定]({{% ref howto-bindings.md %}})。

### Configuration API

配置 API 是一个客户端侧的构建块，即使在同时运行 `DaprServer` 的应用程序中也是如此。请使用 gRPC `DaprClient` 读取配置或订阅更新。配置订阅通过客户端的 gRPC 流接收更新，不需要服务端回调路由。

#### 获取配置值

请使用 `client.configuration.get(storeName, keys?, metadata?)`。关于客户端设置以及使用 `@dapr/dapr` 3.19.0 或更高版本的示例，请参阅[配置操作指南]({{% ref "js-configuration-howto.md#retrieve-configuration-items" %}})。

#### 订阅键变更

请在 `client.configuration` 上使用 `subscribe`、`subscribeWithKeys` 或 `subscribeWithMetadata`。保留每个返回的句柄，并在关闭时调用 `await subscription.stop()`，而不是 `close()`。关于回调行为、清理以及流失败的限制，请参阅[订阅示例]({{% ref "js-configuration-howto.md#subscribe-to-configuration-changes" %}})和[客户端用法指南]({{% ref js-configuration-client-usage.md %}})。

## 相关链接

- [JavaScript SDK 示例](https://github.com/dapr/js-sdk/tree/main/examples)
