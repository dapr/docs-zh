---
type: docs
title: "配置客户端用法"
linkTitle: "客户端用法"
weight: 54100
description: "JavaScript 中配置读取、元数据、订阅、客户端生命周期与错误处理的指南"
---

配置功能通过 `DaprClient.configuration` 提供。本指南面向 `@dapr/dapr` 3.19.0 或更高版本，并说明使用该版本时需要注意的实现细节与限制。

## 客户端生命周期与配置

配置操作应复用一个长期存在的 `DaprClient`，而不是为每次读取或订阅都创建一个新的实例。配置功能需要 gRPC；SDK 的默认协议是 HTTP，而这些方法不支持 HTTP。

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: process.env.DAPR_GRPC_PORT ?? "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
});
```

端口值为字符串。若省略显式的主机和端口选项，SDK 可以从 `DAPR_GRPC_ENDPOINT` 解析边车地址；否则回退到已配置的主机和端口，默认值为 `127.0.0.1` 和 `DAPR_GRPC_PORT`（或 `50001`）。显式指定的主机和端口选项优先于端点设置。

API 令牌默认取自 `DAPR_API_TOKEN`；你也可以在客户端选项中提供 `daprApiToken`。下文所述的请求元数据会传递给配置组件，不能替代边车认证。

应用关闭时，在调用 `await client.stop()` 之前先停止所有订阅。不要依赖客户端关闭来显式取消每个句柄的订阅。

## 选择操作

所有方法接收的都是配置组件的名称，而不是其类型或 YAML 文件名。

| 方法 | 用途 | 结果 |
|------|------|------|
| `get(storeName, keys?, metadata?)` | 读取指定的键；当省略键或键为空时请求全部键 | 解析为 `{ items }` 的 Promise |
| `subscribe(storeName, callback)` | 使用空的键列表监听存储 | 解析为订阅句柄的 Promise |
| `subscribeWithKeys(storeName, keys, callback)` | 监听指定的键 | 解析为订阅句柄的 Promise |
| `subscribeWithMetadata(storeName, keys, metadata, callback)` | 使用特定于存储的请求元数据监听键 | 解析为订阅句柄的 Promise |

gRPC 实现会从键数组中移除空字符串（`""`）。如果结果数组为空，则发送全部键的请求；这并不表示“不读取也不监听任何内容”。需要有界的选择范围时，请使用明确的非空键。全部键请求是否受支持取决于具体组件。

配置功能没有写入或删除方法，也没有公开的 `client.configuration.unsubscribe(...)` 方法。请直接更新底层存储，并使用返回句柄的 `stop()` 来停止订阅。

## 了解响应结构

`get` 和订阅回调都会提供一个以配置键为索引的 `items` 对象：

```json
{
  "items": {
    "orderId1": {
      "key": "orderId1",
      "value": "101",
      "version": "1",
      "metadata": {}
    }
  }
}
```

每个条目的 `key` 与其映射键相同。`value` 和 `version` 都是字符串；版本号因存储而异，可能为空。`metadata` 包含组件提供的响应元数据。

SDK 不会将值反序列化为数字、布尔值或应用对象。请在应用代码中解析并校验这些值。例如，JSON 类型的设置需要调用 `JSON.parse(item.value)`，并做好相应的错误处理。

请显式处理缺失的键。成功的响应可能返回空的 `items` 对象；不要假设缺失的键会导致读取被拒绝。

订阅回调接收的是每次更新中的条目，而不是保证完整的存储快照。空条目的流消息会被跳过。SDK 在内部保存运行时订阅 ID，并且不会在句柄或回调响应中暴露它。

## 传递请求元数据

`get` 将元数据作为第三个参数接收。`subscribeWithMetadata` 在回调之前接收元数据。请使用组件文档中列出的元数据键和字符串值，且不要加 HTTP `metadata.` 前缀。

例如，在配置了名为 `appconfig` 的 [Azure App Configuration 组件]({{% ref azure-appconfig-configuration-store.md %}}) 之后，选择一个标签：

```javascript
const config = await client.configuration.get(
  "appconfig",
  ["application:theme"],
  { label: "production" },
);
console.log(config.items);

const subscription = await client.configuration.subscribeWithMetadata(
  "appconfig",
  ["application:theme"],
  { label: "production" },
  async (changes) => {
    console.log("Updated settings:", changes.items);
  },
);

// 稍后，关闭时：
await subscription.stop();
```

此代码片段假定已存在一个 gRPC `client`。将 `[]` 作为键参数传入，即可请求带元数据的全部键订阅，但仍须组件支持。

元数据会原样传递给存储，不会自动复制到每个返回条目的元数据中。支持的字段、过滤方式、轮询间隔以及变更通知行为都取决于组件；例如，Redis 并未实现 Azure 的 `label` 选择器。

## 订阅的生命周期与回调

每次调用订阅方法都会启动一个独立的后台流，并返回带有 `stop()` 的句柄。多个订阅可以共享同一个客户端，包括针对相同键的订阅。请分别保存并停止每个句柄。

请提供 `async` 回调，或返回 `Promise<void>` 的函数。SDK 会等待每个回调完成后，才会处理该订阅的下一条消息。回调应保持简短；速度慢的回调会延迟后续更新。请在回调内部显式处理处理失败的情况，并通过应用的日志或监控进行上报。

不要假设订阅后会立即提供当前值。初始值的投递取决于运行时和组件，SDK 不会替你执行初始的 `get`。请使用 `get` 读取所需的值，并根据应用的一致性需求协调之后的更新。分开的读取和订阅操作并不是原子的“快照并监听”操作。

等待订阅方法只会返回本地句柄，不会等待服务器确认或第一次更新。句柄上没有就绪 Promise、完成 Promise 或错误回调。

### 停止订阅

使用订阅方法返回的句柄：

```javascript
await subscription.stop();
```

在已审阅的版本中，`stop()` 会中止本地流；如果已收到运行时订阅 ID，它还会尝试发送显式的取消订阅请求。尽管已发布的 `SubscribeConfigurationStream` 类型声明为 `stop: () => void`，该实现仍是异步的；使用 `await` 会等待其清理完成。

清理是尽力而为的：取消订阅失败会被忽略；如果在收到 ID 之前停止，则无法发送基于 ID 的取消订阅请求。`stop()` 成功完成并不代表服务器端已经移除了订阅。停止操作也不会等待正在运行的回调结束，也不会取消该回调已启动的应用工作。

配置方法不接受 `AbortSignal` 或按次调用的超时选项。请使用 `stop()` 取消订阅；不要向配置方法传入二进制存储风格的取消选项。

## 错误处理与恢复

请在应用的错误边界处等待读取和订阅创建的结果。`get` 失败时会被拒绝，例如组件不存在、无法连接到存储，或边车返回错误。gRPC 运行时错误使用 Connect 传输层的错误码，而不是 HTTP 状态码。在 HTTP 客户端上调用配置方法会以 `HTTPNotSupportedError` 被拒绝。

{{% alert title="订阅错误的限制" color="warning" %}}
在 `3.19.0` 中，消费后台订阅流时出现的意外错误会被捕获，既不会记录日志，也不会向外传播。其中包括回调被拒绝的情况，它会退出消费循环。围绕 `await subscribe...` 的 `try/catch` 无法捕获这些之后才出现的失败。流结束时，该实现也不会自动重连或重新订阅。
{{% /alert %}}

请在回调内部上报回调错误。对于需要最新设置的应用，请增加独立的新鲜度检查或定期读取，并制定应用层的恢复策略；不要把持有订阅句柄或没有收到更新，当作监听正常的证明。如果需要重新创建订阅，请先停止之前的句柄，并协调当前值。

完整的读取与监听示例，请参阅[配置操作指南]({{% ref js-configuration-howto.md %}})；运行时语义请参阅 [配置 API 参考]({{% ref configuration_api.md %}})。
