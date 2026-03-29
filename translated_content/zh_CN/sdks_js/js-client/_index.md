---
type: docs
title: "JavaScript 客户端 SDK"
linkTitle: "客户端"
weight: 1000
description: 用于开发 Dapr 应用的 JavaScript 客户端 SDK
---

## 简介

Dapr 客户端允许您与 Dapr 边车通信，并访问其面向客户端的功能，如发布事件、调用输出绑定、状态管理、密钥管理等。

## 前置条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- [最新的 Node.js LTS 版本或更高版本](https://nodejs.org/en/)

## 安装和导入 Dapr JS SDK

1. 使用 `npm` 安装 SDK：

```bash
npm i @dapr/dapr --save
```

2. 导入库：

```typescript
import { DaprClient, DaprServer, HttpMethod, CommunicationProtocolEnum } from "@dapr/dapr";

const daprHost = "127.0.0.1"; // Dapr 边车主机
const daprPort = "3500"; // 此示例服务器的 Dapr 边车端口
const serverHost = "127.0.0.1"; // 此示例服务器的应用主机
const serverPort = "50051"; // 此示例服务器的应用端口

// HTTP 示例
const client = new DaprClient({ daprHost, daprPort });

// GRPC 示例
const client = new DaprClient({ daprHost, daprPort, communicationProtocol: CommunicationProtocolEnum.GRPC });
```

## 运行

要运行示例，您可以使用两种不同的协议与 Dapr 边车交互：HTTP（默认）或 gRPC。

### 使用 HTTP（默认）

```typescript
import { DaprClient } from "@dapr/dapr";
const client = new DaprClient({ daprHost, daprPort });
```

```bash
# 使用 dapr run
dapr run --app-id example-sdk --app-protocol http -- npm run start

# 或，使用 npm script
npm run start:dapr-http
```

### 使用 gRPC

由于 HTTP 是默认协议，您需要调整通信协议以使用 gRPC。您可以通过向客户端或服务器构造函数传递额外的参数来实现。

```typescript
import { DaprClient, CommunicationProtocol } from "@dapr/dapr";
const client = new DaprClient({ daprHost, daprPort, communicationProtocol: CommunicationProtocol.GRPC });
```

```bash
# 使用 dapr run
dapr run --app-id example-sdk --app-protocol grpc -- npm run start

# 或，使用 npm script
npm run start:dapr-grpc
```

### 环境变量

##### Dapr 边车端点

您可以使用 `DAPR_HTTP_ENDPOINT` 和 `DAPR_GRPC_ENDPOINT` 环境变量来分别设置 Dapr 边车的 HTTP 和 gRPC 端点。当设置这些变量时，构造函数的选项参数中不必设置 `daprHost` 和 `daprPort`，客户端会自动从提供的端点中解析它们。

```typescript
import { DaprClient, CommunicationProtocol } from "@dapr/dapr";

// 使用 HTTP，当设置了 DAPR_HTTP_ENDPOINT 时
const client = new DaprClient();

// 使用 gRPC，当设置了 DAPR_GRPC_ENDPOINT 时
const client = new DaprClient({ communicationProtocol: CommunicationProtocol.GRPC });
```

如果设置了环境变量，但向构造函数传递了 `daprHost` 和 `daprPort` 值，后者将优先于环境变量。

##### Dapr API 令牌

您可以使用 `DAPR_API_TOKEN` 环境变量来设置 Dapr API 令牌。当设置此变量时，构造函数的选项参数中不必设置 `daprApiToken`，客户端会自动获取它。

## 通用

### 增加主体大小

您可以使用 `DaprClient` 的选项来增加应用程序用于与边车通信的主体大小。

```typescript
import { DaprClient, CommunicationProtocol } from "@dapr/dapr";

// 允许使用 10Mb 的主体大小
// 默认为 4Mb
const client = new DaprClient({
  daprHost,
  daprPort,
  communicationProtocol: CommunicationProtocol.HTTP,
  maxBodySizeMb: 10,
});
```

### 代理请求

通过代理请求，我们可以利用 Dapr 通过其边车架构带来的独特能力，如服务发现、日志记录等，使我们能够立即"升级"我们的 gRPC 服务。gRPC 代理的此功能在 [社区会议 41](https://www.youtube.com/watch?v=B_vkXqptpXY&t=71s) 中进行了演示。

#### 创建代理

要执行 gRPC 代理，只需调用 `client.proxy.create()` 方法创建代理：

```typescript
// 像往常一样，为我们的 dapr 边车创建一个客户端
// 此客户端负责确保边车已启动、我们可以通信等
const clientSidecar = new DaprClient({ daprHost, daprPort, communicationProtocol: CommunicationProtocol.GRPC });

// 创建一个允许我们使用 gRPC 代码的代理
const clientProxy = await clientSidecar.proxy.create<GreeterClient>(GreeterClient);
```

现在我们可以按照 `GreeterClient` 接口中定义的方法调用（在本例中，该接口来自 [Hello World 示例](https://github.com/grpc/grpc-go/blob/master/examples/helloworld/helloworld/helloworld.proto)）

#### 幕后（技术工作原理）

![架构](assets/architecture.png)

1. gRPC 服务在 Dapr 中启动。我们通过 `--app-port` 告诉 Dapr 此 gRPC 服务器运行在哪个端口，并使用 `--app-id <APP_ID_HERE>` 为其提供唯一的 Dapr 应用 ID
2. 我们现在可以通过连接到边车的客户端调用 Dapr 边车
3. 在调用 Dapr 边车时，我们提供一个名为 `dapr-app-id` 的元数据键，其值为在 Dapr 中启动的 gRPC 服务器（例如在我们的示例中为 `server`）
4. Dapr 现在将调用转发到配置的 gRPC 服务器

## 构建块

JavaScript 客户端 SDK 允许您与所有 [Dapr 构建块]({{% ref building-blocks %}}) 交互，重点关注客户端到边车的功能。

### 调用 API

#### 调用服务

```typescript
import { DaprClient, HttpMethod } from "@dapr/dapr";

const daprHost = "127.0.0.1";
const daprPort = "3500";

async function start() {
  const client = new DaprClient({ daprHost, daprPort });

  const serviceAppId = "my-app-id";
  const serviceMethod = "say-hello";

  // POST 请求
  const response = await client.invoker.invoke(serviceAppId, serviceMethod, HttpMethod.POST, { hello: "world" });

  // 带请求头的 POST 请求
  const response = await client.invoker.invoke(
    serviceAppId,
    serviceMethod,
    HttpMethod.POST,
    { hello: "world" },
    { headers: { "X-User-ID": "123" } },
  );

  // GET 请求
  const response = await client.invoker.invoke(serviceAppId, serviceMethod, HttpMethod.GET);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

> 有关服务调用的完整指南，请访问 [操作指南：调用服务]({{% ref howto-invoke-discover-services.md %}})。

### 状态管理 API

#### 保存、获取和删除应用状态

```typescript
import { DaprClient } from "@dapr/dapr";

const daprHost = "127.0.0.1";
const daprPort = "3500";

async function start() {
  const client = new DaprClient({ daprHost, daprPort });

  const serviceStoreName = "my-state-store-name";

  // 保存状态
  const response = await client.state.save(
    serviceStoreName,
    [
      {
        key: "first-key-name",
        value: "hello",
        metadata: {
          foo: "bar",
        },
      },
      {
        key: "second-key-name",
        value: "world",
      },
    ],
    {
      metadata: {
        ttlInSeconds: "3", // 这应该覆盖状态项中的 ttl
      },
    },
  );

  // 获取状态
  const response = await client.state.get(serviceStoreName, "first-key-name");

  // 批量获取状态
  const response = await client.state.getBulk(serviceStoreName, ["first-key-name", "second-key-name"]);

  // 状态事务
  await client.state.transaction(serviceStoreName, [
    {
      operation: "upsert",
      request: {
        key: "first-key-name",
        value: "new-data",
      },
    },
    {
      operation: "delete",
      request: {
        key: "second-key-name",
      },
    },
  ]);

  // 删除状态
  const response = await client.state.delete(serviceStoreName, "first-key-name");
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

> 有关状态操作的完整列表，请访问 [操作指南：获取和保存状态]({{% ref howto-get-save-state.md %}})。

#### 查询状态 API

```typescript
import { DaprClient } from "@dapr/dapr";

async function start() {
  const client = new DaprClient({ daprHost, daprPort });

  const res = await client.state.query("state-mongodb", {
    filter: {
      OR: [
        {
          EQ: { "person.org": "Dev Ops" },
        },
        {
          AND: [
            {
              EQ: { "person.org": "Finance" },
            },
            {
              IN: { state: ["CA", "WA"] },
            },
          ],
        },
      ],
    },
    sort: [
      {
        key: "state",
        order: "DESC",
      },
    ],
    page: {
      limit: 10,
    },
  });

  console.log(res);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

### 发布订阅 API

#### 发布消息

```typescript
import { DaprClient } from "@dapr/dapr";

const daprHost = "127.0.0.1";
const daprPort = "3500";

async function start() {
  const client = new DaprClient({ daprHost, daprPort });

  const pubSubName = "my-pubsub-name";
  const topic = "topic-a";

  // 以 text/plain 格式向主题发布消息
  // 注意，除非明确指定，内容类型是从消息类型推断的
  const response = await client.pubsub.publish(pubSubName, topic, "hello, world!");
  // 如果发布失败，response 包含错误
  console.log(response);

  // 以 application/json 格式向主题发布消息
  await client.pubsub.publish(pubSubName, topic, { hello: "world" });

  // 以纯文本形式发布 JSON 消息
  const options = { contentType: "text/plain" };
  await client.pubsub.publish(pubSubName, topic, { hello: "world" }, options);

  // 以 application/cloudevents+json 格式向主题发布消息
  // 您也可以使用 cloudevent SDK 创建云事件 https://github.com/cloudevents/sdk-javascript
  const cloudEvent = {
    specversion: "1.0",
    source: "/some/source",
    type: "example",
    id: "1234",
  };
  await client.pubsub.publish(pubSubName, topic, cloudEvent);

  // 以原始负载形式发布云事件
  const options = { metadata: { rawPayload: true } };
  await client.pubsub.publish(pubSubName, topic, "hello, world!", options);

  // 以 text/plain 格式向主题发布多条消息
  await client.pubsub.publishBulk(pubSubName, topic, ["message 1", "message 2", "message 3"]);

  // 以 application/json 格式向主题发布多条消息
  await client.pubsub.publishBulk(pubSubName, topic, [
    { hello: "message 1" },
    { hello: "message 2" },
    { hello: "message 3" },
  ]);

  // 使用显式批量发布消息发布多条消息
  const bulkPublishMessages = [
    {
      entryID: "entry-1",
      contentType: "application/json",
      event: { hello: "foo message 1" },
    },
    {
      entryID: "entry-2",
      contentType: "application/cloudevents+json",
      event: { ...cloudEvent, data: "foo message 2", datacontenttype: "text/plain" },
    },
    {
      entryID: "entry-3",
      contentType: "text/plain",
      event: "foo message 3",
    },
  ];
  await client.pubsub.publishBulk(pubSubName, topic, bulkPublishMessages);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

### 绑定 API

#### 调用输出绑定

**输出绑定**

```typescript
import { DaprClient } from "@dapr/dapr";

const daprHost = "127.0.0.1";
const daprPort = "3500";

async function start() {
  const client = new DaprClient({ daprHost, daprPort });

  const bindingName = "my-binding-name";
  const bindingOperation = "create";
  const message = { hello: "world" };

  const response = await client.binding.send(bindingName, bindingOperation, message);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

> 有关输出绑定的完整指南，请访问 [操作指南：使用绑定]({{% ref howto-bindings.md %}})。

### 密钥 API

#### 检索密钥

```typescript
import { DaprClient } from "@dapr/dapr";

const daprHost = "127.0.0.1";
const daprPort = "3500";

async function start() {
  const client = new DaprClient({ daprHost, daprPort });

  const secretStoreName = "my-secret-store";
  const secretKey = "secret-key";

  // 从密钥存储中检索单个密钥
  const response = await client.secret.get(secretStoreName, secretKey);

  // 从密钥存储中检索所有密钥
  const response = await client.secret.getBulk(secretStoreName);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

> 有关密钥的完整指南，请访问 [操作指南：检索密钥]({{% ref howto-secrets.md %}})。

### 配置 API

#### 获取配置键

```typescript
import { DaprClient } from "@dapr/dapr";

const daprHost = "127.0.0.1";

async function start() {
  const client = new DaprClient({
    daprHost,
    daprPort: process.env.DAPR_GRPC_PORT,
    communicationProtocol: CommunicationProtocolEnum.GRPC,
  });

  const config = await client.configuration.get("config-store", ["key1", "key2"]);
  console.log(config);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

示例输出：

```log
{
   items: {
     key1: { key: 'key1', value: 'foo', version: '', metadata: {} },
     key2: { key: 'key2', value: 'bar2', version: '', metadata: {} }
   }
}
```

#### 订阅配置更新

```typescript
import { DaprClient } from "@dapr/dapr";

const daprHost = "127.0.0.1";

async function start() {
  const client = new DaprClient({
    daprHost,
    daprPort: process.env.DAPR_GRPC_PORT,
    communicationProtocol: CommunicationProtocolEnum.GRPC,
  });

  // 订阅键 "key1" 和 "key2" 的配置存储更改
  const stream = await client.configuration.subscribeWithKeys("config-store", ["key1", "key2"], async (data) => {
    console.log("订阅收到来自配置存储的更新：", data);
  });

  // 等待 60 秒并取消订阅。
  await new Promise((resolve) => setTimeout(resolve, 60000));
  stream.stop();
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

示例输出：

```log
订阅收到来自配置存储的更新： {
  items: { key2: { key: 'key2', value: 'bar', version: '', metadata: {} } }
}
订阅收到来自配置存储的更新： {
  items: { key1: { key: 'key1', value: 'foobar', version: '', metadata: {} } }
}
```

### 加密 API

> JavaScript SDK 中仅在 gRPC 客户端上支持加密 API。

```typescript
import { createReadStream, createWriteStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

import { DaprClient, CommunicationProtocolEnum } from "@dapr/dapr";

const daprHost = "127.0.0.1";
const daprPort = "50050"; // 此示例服务器的 Dapr 边车端口

async function start() {
  const client = new DaprClient({
    daprHost,
    daprPort,
    communicationProtocol: CommunicationProtocolEnum.GRPC,
  });

  // 使用流加密和解密消息
  await encryptDecryptStream(client);

  // 使用缓冲区加密和解密消息
  await encryptDecryptBuffer(client);
}

async function encryptDecryptStream(client: DaprClient) {
  // 首先，加密消息
  console.log("== 使用流加密消息");
  console.log("将 plaintext.txt 加密为 ciphertext.out");

  await pipeline(
    createReadStream("plaintext.txt"),
    await client.crypto.encrypt({
      componentName: "crypto-local",
      keyName: "symmetric256",
      keyWrapAlgorithm: "A256KW",
    }),
    createWriteStream("ciphertext.out"),
  );

  // 解密消息
  console.log("== 使用流解密消息");
  console.log("将 ciphertext.out 解密为 plaintext.out");
  await pipeline(
    createReadStream("ciphertext.out"),
    await client.crypto.decrypt({
      componentName: "crypto-local",
    }),
    createWriteStream("plaintext.out"),
  );
}

async function encryptDecryptBuffer(client: DaprClient) {
  // 读取 "plaintext.txt" 以便我们有一些内容
  const plaintext = await readFile("plaintext.txt");

  // 首先，加密消息
  console.log("== 使用缓冲区加密消息");

  const ciphertext = await client.crypto.encrypt(plaintext, {
    componentName: "crypto-local",
    keyName: "my-rsa-key",
    keyWrapAlgorithm: "RSA",
  });

  await writeFile("test.out", ciphertext);

  // 解密消息
  console.log("== 使用缓冲区解密消息");
  const decrypted = await client.crypto.decrypt(ciphertext, {
    componentName: "crypto-local",
  });

  // 内容应该相等
  if (plaintext.compare(decrypted) !== 0) {
    throw new Error("解密的消息与原始消息不匹配");
  }
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

> 有关加密的完整指南，请访问 [操作指南：加密]({{% ref howto-cryptography.md %}})。

### 分布式锁 API

#### 尝试锁定和解锁 API

```typescript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";
import { LockStatus } from "@dapr/dapr/types/lock/UnlockResponse";

const daprHost = "127.0.0.1";
const daprPortDefault = "3500";

async function start() {
  const client = new DaprClient({ daprHost, daprPort });

  const storeName = "redislock";
  const resourceId = "resourceId";
  const lockOwner = "owner1";
  let expiryInSeconds = 1000;

  console.log(`在 ${storeName}、${resourceId} 上获取锁，所有者：${lockOwner}`);
  const lockResponse = await client.lock.lock(storeName, resourceId, lockOwner, expiryInSeconds);
  console.log(lockResponse);

  console.log(`在 ${storeName}、${resourceId} 上解锁，所有者：${lockOwner}`);
  const unlockResponse = await client.lock.unlock(storeName, resourceId, lockOwner);
  console.log("解锁 API 响应： " + getResponseStatus(unlockResponse.status));
}

function getResponseStatus(status: LockStatus) {
  switch (status) {
    case LockStatus.Success:
      return "Success";
    case LockStatus.LockDoesNotExist:
      return "LockDoesNotExist";
    case LockStatus.LockBelongsToOthers:
      return "LockBelongsToOthers";
    default:
      return "InternalError";
  }
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

> 有关分布式锁的完整指南，请访问 [操作指南：使用分布式锁]({{% ref howto-use-distributed-lock.md %}})。

### 工作流 API

#### 工作流管理

```typescript
import { DaprClient } from "@dapr/dapr";

async function start() {
  const client = new DaprClient();

  // 启动新的工作流实例
  const instanceId = await client.workflow.start("OrderProcessingWorkflow", {
    Name: "Paperclips",
    TotalCost: 99.95,
    Quantity: 4,
  });
  console.log(`已启动工作流实例 ${instanceId}`);

  // 获取工作流实例
  const workflow = await client.workflow.get(instanceId);
  console.log(
    `工作流 ${workflow.workflowName}，创建于 ${workflow.createdAt.toUTCString()}，状态为 ${
      workflow.runtimeStatus
    }`,
  );
  console.log(`其他属性：${JSON.stringify(workflow.properties)}`);

  // 暂停工作流实例
  await client.workflow.pause(instanceId);
  console.log(`已暂停工作流实例 ${instanceId}`);

  // 恢复工作流实例
  await client.workflow.resume(instanceId);
  console.log(`已恢复工作流实例 ${instanceId}`);

  // 终止工作流实例
  await client.workflow.terminate(instanceId);
  console.log(`已终止工作流实例 ${instanceId}`);

  // 清除工作流实例
  await client.workflow.purge(instanceId);
  console.log(`已清除工作流实例 ${instanceId}`);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

## 相关链接

- [JavaScript SDK 示例](https://github.com/dapr/js-sdk/tree/master/examples)
