---
type: docs
title: "JavaScript 客户端 SDK"
linkTitle: "客户端"
weight: 1000
description: 用于开发 Dapr 应用的 JavaScript 客户端 SDK
---

## 简介

Dapr 客户端允许你与 Dapr sidecar 通信，并访问其面向客户端的功能，例如发布事件、调用 output binding、State Management、secrets 管理等。

对于大型语言模型 (LLM) 交互，请使用 `client.conversation.converse(request)`。[对话指南]({{% ref js-conversation %}}) 介绍了在 JavaScript SDK **3.19.0 或更高版本**中的设置、消息历史、结构化输出、缓存、Token 用量和工具调用。

## 前提条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- [最新 LTS 版本的 Node.js 或更高版本](https://nodejs.org/en/)

## 安装并导入 Dapr 的 JS SDK

1. 使用 `npm` 安装 SDK：

```bash
npm i @dapr/dapr --save
```

2. 导入相关库：

```typescript
import { DaprClient, DaprServer, HttpMethod, CommunicationProtocolEnum } from "@dapr/dapr";

const daprHost = "127.0.0.1"; // Dapr 边车主机
const daprPort = "3500"; // 本示例服务器对应的 Dapr 边车端口
const serverHost = "127.0.0.1"; // 本示例服务器的应用主机
const serverPort = "50051"; // 本示例服务器的应用端口

// HTTP 示例
const client = new DaprClient({ daprHost, daprPort });

// gRPC 示例
const client = new DaprClient({ daprHost, daprPort, communicationProtocol: CommunicationProtocolEnum.GRPC });
```

## 运行

要运行这些示例，你可以使用两种协议与 Dapr sidecar 交互：HTTP（默认）或 gRPC。

### 使用 HTTP（默认）

```typescript
import { DaprClient } from "@dapr/dapr";
const client = new DaprClient({ daprHost, daprPort });
```

```bash
# 使用 dapr run
dapr run --app-id example-sdk --app-protocol http -- npm run start

# 或者使用 npm 脚本
npm run start:dapr-http
```

### 使用 gRPC

由于默认使用 HTTP，要使用 gRPC 需要调整通信协议。你可以在客户端或服务器的构造函数中传入一个额外参数来实现。

```typescript
import { DaprClient, CommunicationProtocolEnum } from "@dapr/dapr";
const client = new DaprClient({ daprHost, daprPort, communicationProtocol: CommunicationProtocolEnum.GRPC });
```

```bash
# 使用 dapr run
dapr run --app-id example-sdk --app-protocol grpc -- npm run start

# 或者使用 npm 脚本
npm run start:dapr-grpc
```

### 环境变量

##### Dapr sidecar 端点

你可以使用 `DAPR_HTTP_ENDPOINT` 和 `DAPR_GRPC_ENDPOINT` 环境变量分别设置 Dapr sidecar 的 HTTP 和 gRPC 端点。设置这些变量后，构造函数的选项参数中无需再设置 `daprHost` 和 `daprPort`，客户端会自动从所提供的端点中解析出它们。

```typescript
import { DaprClient, CommunicationProtocolEnum } from "@dapr/dapr";

// 设置了 DAPR_HTTP_ENDPOINT 时使用 HTTP
const client = new DaprClient();

// 设置了 DAPR_GRPC_ENDPOINT 时使用 gRPC
const client = new DaprClient({ communicationProtocol: CommunicationProtocolEnum.GRPC });
```

如果设置了环境变量，同时又在构造函数中传入了 `daprHost` 和 `daprPort` 的值，则以后者为准，覆盖环境变量。

##### Dapr API Token

你可以使用 `DAPR_API_TOKEN` 环境变量设置 Dapr API Token。设置该变量后，构造函数的选项参数中无需再设置 `daprApiToken`，客户端会自动获取它。

## 通用

### 增大请求体大小

你可以通过 `DaprClient` 的选项，增大应用与 sidecar 通信时使用的请求体大小。

```typescript
import { DaprClient, CommunicationProtocolEnum } from "@dapr/dapr";

// 允许使用 10MB 的请求体
// 默认值为 4MB
const client = new DaprClient({
  daprHost,
  daprPort,
  communicationProtocol: CommunicationProtocolEnum.HTTP,
  maxBodySizeMb: 10,
});
```

### 代理请求

在 JavaScript SDK 3.19.0 中，`client.proxy.create()` 对 HTTP 和 gRPC ConnectRPC 传输均不受支持，调用时会直接拒绝。请使用 `client.invoker.invoke()` 进行 Dapr service invocation。

对于原生 protobuf 服务，请使用你生成的 gRPC 客户端，并通过 `dapr-app-id` 元数据连接到 Dapr sidecar。参见[原生 gRPC 服务与流式传输]({{% ref "js-service-invocation-usage.md#native-grpc-services-and-streaming" %}})以及[运行时 gRPC 代理指南]({{% ref howto-invoke-services-grpc.md %}})。

## building block

JavaScript 客户端 SDK 允许你与所有 [Dapr building block]({{% ref building-blocks %}}) 交互，重点关注客户端到 sidecar 的功能。

### 搜索 API

使用 `client.search` 通过 HTTP 或 gRPC 管理索引，并对 JSON 文档进行索引、检索、删除和查询。需要 Dapr 运行时 1.19 或更高版本，以及 JavaScript SDK 3.19.0 或更高版本。

完整示例请参阅[搜索操作指南]({{% ref js-search-howto.md %}})；方法签名、查询选项、写入确认、取消操作和错误处理请参阅[搜索客户端用法]({{% ref js-search-client-usage.md %}})。

### Jobs API

使用 `client.jobs` 以 JavaScript SDK **3.19.0 或更高版本**调度、获取和删除 job。有关调度选项、负载、运行时兼容性和错误处理，请参阅[job 操作指南]({{% ref js-jobs-howto.md %}})和[客户端用法说明]({{% ref js-jobs-client-usage.md %}})。

### service invocation API

对于 JavaScript SDK 3.19.0 或更高版本，请参阅[service invocation 概述]({{% ref js-service-invocation %}})，了解 HTTP 和 gRPC 的功能。

#### 调用服务

```typescript
import { DaprClient, HttpMethod } from "@dapr/dapr";

const daprHost = "127.0.0.1";
const daprPort = "3500";

async function start() {
  const client = new DaprClient({ daprHost, daprPort });

  const serviceAppId = "my-app-id";
  const serviceMethod = "say-hello";

  try {
    const response = await client.invoker.invoke(
      serviceAppId,
      serviceMethod,
      HttpMethod.POST,
      { hello: "world" },
      { headers: { "X-User-ID": "123" } },
    );
    console.log(response);
  } finally {
    await client.stop();
  }
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

有关可运行的客户端与服务器设置、其他动词、查询参数、命名空间以及非 Dapr 端点，请参阅[调用服务]({{% ref js-service-invocation-howto.md %}})。有关序列化和错误处理，请参阅[配置与用法]({{% ref js-service-invocation-usage.md %}})。自定义请求头由 HTTP 调用器转发，gRPC 调用器不会转发。

### State Management API

使用 `client.state` 通过 HTTP 或 gRPC 访问已配置的 state store。[State Management 指南]({{% ref js-state-management %}})涵盖 JavaScript SDK 3.19.0 或更高版本，包括批量删除、ETag、状态选项、TTL、事务、序列化以及特定协议的错误。

#### 保存、获取和删除应用状态

有关包含 component 配置、保存/获取/删除、批量读取与删除、条件更新和事务的可运行示例，请参阅[操作指南：管理状态]({{% ref js-state-management-howto.md %}})。

HTTP 的 `save`、`delete` 和 `deleteBulk` 可能返回 `{ error }`，而不是拒绝 Promise。请检查该字段，同时处理 Promise 的拒绝；gRPC 的 RPC 失败会以拒绝 Promise 的形式返回。完整的方法与响应参考请参阅[状态客户端用法]({{% ref js-state-management-client-usage.md %}})。

#### Query State API

alpha 版 Query API 支持在可查询的存储上通过 HTTP 和 gRPC 进行过滤、排序和分页。有关查询表达式、延续令牌和结果解码，请参阅[操作指南：Query State]({{% ref js-state-management-query.md %}})。

### 发布订阅 API

对于 JavaScript SDK 3.19.0 或更高版本，请参阅[发布与订阅概述]({{% ref js-pubsub %}})，选择合适的投递模式。

#### 发布消息

```typescript
import { DaprClient } from "@dapr/dapr";

const daprHost = "127.0.0.1";
const daprPort = "3500";

async function start() {
  const client = new DaprClient({ daprHost, daprPort });

  try {
    const response = await client.pubsub.publish("pubsub", "orders", { orderId: "101" });
    if (response.error) {
      throw response.error;
    }
  } finally {
    await client.stop();
  }
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

有关批量操作、元数据、CloudEvents、原始负载以及特定传输的错误处理，请参阅[发布事件]({{% ref js-pubsub-publish-howto.md %}})。有关客户端生命周期和序列化，请参阅[配置与用法]({{% ref js-pubsub-usage.md %}})。

#### 流式消息订阅

使用 gRPC 客户端时，`client.pubsub.subscribeStream()` 无需 `DaprServer` 或应用回调端口即可接收消息。请按照[streaming subscription 指南]({{% ref js-pubsub-streaming-howto.md %}})了解完整的工作进程示例、运行时要求、确认、取消以及故障监督。

### binding API

#### 调用 output binding

**output binding**

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

> 有关 output binding 的完整指南，请参阅[操作指南：使用 binding]({{% ref howto-bindings.md %}})。

### secrets API

#### 获取 secrets

```typescript
import { DaprClient } from "@dapr/dapr";

const daprHost = "127.0.0.1";
const daprPort = "3500";

async function start() {
  const client = new DaprClient({ daprHost, daprPort });

  const secretStoreName = "my-secret-store";
  const secretKey = "secret-key";

  // 获取单个机密；结果为该机密的键值数据
  const secret = await client.secret.get(secretStoreName, secretKey);

  // 获取所有可访问的机密，按机密名称嵌套
  const secrets = await client.secret.getBulk(secretStoreName);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

对于 JavaScript SDK 3.19.0 或更高版本，请参阅[secrets 操作指南]({{% ref js-secrets-howto.md %}})获取可运行的示例，或阅读[secrets 客户端用法说明]({{% ref js-secrets-client-usage.md %}})，了解配置、TypeScript 响应校验和错误处理。

在 3.19.0 中，HTTP `get` 接受以查询字符串形式传入的元数据，并保留多值 secrets 的所有值。gRPC `get` 会忽略元数据，只返回第一个键值对。批量获取在两种协议下都会保留嵌套值，但两者都不提供批量元数据。

关于底层 building block，请参阅[操作指南：获取 secrets]({{% ref howto-secrets.md %}})。

### Configuration API

使用 `client.configuration` 读取应用设置并订阅其变更。JavaScript SDK 的所有配置方法都要求使用 **gRPC**，不支持 HTTP 客户端。

[配置操作指南]({{% ref js-configuration-howto.md %}})为 `@dapr/dapr` 3.19.0 或更高版本提供了可运行的示例。[客户端用法说明]({{% ref js-configuration-client-usage.md %}})涵盖所有方法、元数据、响应结构以及订阅的错误限制。

#### 获取配置键

```typescript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const daprHost = "127.0.0.1";

async function start() {
  const client = new DaprClient({
    daprHost,
    daprPort: process.env.DAPR_GRPC_PORT ?? "50001",
    communicationProtocol: CommunicationProtocolEnum.GRPC,
  });

  try {
    const config = await client.configuration.get("config-store", ["key1", "key2"]);
    console.log(config);
  } finally {
    await client.stop();
  }
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
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const daprHost = "127.0.0.1";

async function start() {
  const client = new DaprClient({
    daprHost,
    daprPort: process.env.DAPR_GRPC_PORT ?? "50001",
    communicationProtocol: CommunicationProtocolEnum.GRPC,
  });

  try {
    const stream = await client.configuration.subscribeWithKeys("config-store", ["key1", "key2"], async (data) => {
      console.log("Subscribe received updates from config store: ", data);
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 60000));
    } finally {
      await stream.stop();
    }
  } finally {
    await client.stop();
  }
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

示例输出：

```log
Subscribe received updates from config store:  {
  items: { key2: { key: 'key2', value: 'bar', version: '', metadata: {} } }
}
Subscribe received updates from config store:  {
  items: { key1: { key: 'key1', value: 'foobar', version: '', metadata: {} } }
}
```

要监听所有键，请使用 `subscribe(storeName, callback)`。要包含特定于存储的元数据，请使用 `subscribeWithMetadata(storeName, keys, metadata, callback)`。全部键的行为取决于 component。在依赖该订阅获取最新配置之前，请参阅[订阅生命周期与回调]({{% ref "js-configuration-client-usage.md#subscription-lifetime-and-callbacks" %}})。

### 加密 API

在 **`@dapr/dapr` 3.19.0 或更高版本**中，`client.crypto` 同时支持通过 HTTP 和 gRPC 进行加密和解密。传入数据和选项时返回 `Buffer`；只传入选项时返回 Node.js `Duplex` 流。

对于大负载和生产环境中的流式处理，建议优先使用 gRPC。Dapr 会将 HTTP 加密输出缓冲，直到请求的数据被完全读取。

```typescript
import { DaprClient, CommunicationProtocolEnum } from "@dapr/dapr";

async function start() {
  const client = new DaprClient({
    daprHost: "127.0.0.1",
    daprPort: "50001",
    communicationProtocol: CommunicationProtocolEnum.GRPC,
  });

  try {
    const ciphertext = await client.crypto.encrypt("A message to encrypt", {
      componentName: "crypto-local",
      keyName: "symmetric256",
      keyWrapAlgorithm: "A256KW",
    });
    const plaintext = await client.crypto.decrypt(ciphertext, {
      componentName: "crypto-local",
    });
    console.log("Decrypted bytes:", plaintext.length);
  } finally {
    await client.stop();
  }
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

本示例需要已配置的 `crypto-local` component 和兼容的 `symmetric256` 密钥。完整的设置和文件流示例请参阅 [JavaScript 加密操作指南]({{% ref js-cryptography-howto.md %}})。有关加密算法、密钥引用、错误和运行时限制，请参阅[客户端用法说明]({{% ref js-cryptography-client-usage.md %}})。

### 分布式锁 API

#### 尝试加锁与解锁 API

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

  console.log(`Acquiring lock on ${storeName}, ${resourceId} as owner: ${lockOwner}`);
  const lockResponse = await client.lock.lock(storeName, resourceId, lockOwner, expiryInSeconds);
  console.log(lockResponse);

  console.log(`Unlocking on ${storeName}, ${resourceId} as owner: ${lockOwner}`);
  const unlockResponse = await client.lock.unlock(storeName, resourceId, lockOwner);
  console.log("Unlock API response: " + getResponseStatus(unlockResponse.status));
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

> 有关分布式锁的完整指南，请参阅[操作指南：使用分布式锁]({{% ref howto-use-distributed-lock.md %}})。

### workflow API

`DaprClient.workflow` 通过 HTTP 或 gRPC 提供基本的 workflow 管理 API。对于 `@dapr/dapr` **3.19.0 或更高版本**，请使用 `scheduleNewWorkflow`、`getWorkflowState` 和 `raiseEvent`；较旧的 `start`、`get` 和 `raise` 名称是已弃用的别名。

如需编写工作进程，以及使用持久等待、列表、历史记录获取、重新运行和 Binary Store 中的负载引用，请参阅独立的[workflow SDK 指南]({{% ref js-workflow-management.md %}})。`DaprWorkflowClient` 使用 gRPC，返回 `WorkflowState`，而不是下方基本 API 所示的响应对象。

#### workflow 管理

```typescript
import { DaprClient } from "@dapr/dapr";

async function start() {
  const client = new DaprClient();

  // 启动新的工作流实例
  const instanceId = await client.workflow.scheduleNewWorkflow("OrderProcessingWorkflow", {
    Name: "Paperclips",
    TotalCost: 99.95,
    Quantity: 4,
  });
  console.log(`Started workflow instance ${instanceId}`);

  // 获取工作流实例
  const workflow = await client.workflow.getWorkflowState(instanceId);
  console.log(
    `Workflow ${workflow.workflowName}, created at ${workflow.createdAt.toUTCString()}, has status ${
      workflow.runtimeStatus
    }`,
  );
  console.log(`Additional properties: ${JSON.stringify(workflow.properties)}`);

  // 暂停工作流实例
  await client.workflow.pause(instanceId);
  console.log(`Paused workflow instance ${instanceId}`);

  // 恢复工作流实例
  await client.workflow.resume(instanceId);
  console.log(`Resumed workflow instance ${instanceId}`);

  // 终止工作流实例
  await client.workflow.terminate(instanceId);
  console.log(`Terminated workflow instance ${instanceId}`);

  // 清除工作流实例
  await client.workflow.purge(instanceId);
  console.log(`Purged workflow instance ${instanceId}`);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

## 相关链接

- [JavaScript SDK 示例](https://github.com/dapr/js-sdk/tree/master/examples)
