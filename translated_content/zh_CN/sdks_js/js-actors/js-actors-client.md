---
type: docs
title: "使用 JavaScript SDK 调用 Actor"
linkTitle: "调用 Actor"
weight: 30000
description: 使用 Actor 标识、类型化代理、动态调用以及较底层的 Actor 客户端
---

使用长期存活的 `DaprClient`，并复用 `ActorProxyBuilder` 来调用 Actor。这些示例面向 `@dapr/dapr` 3.19.0 或更高版本，并使用[操作指南]({{% ref js-actors-howto.md %}})中的计数器契约与实现。

## 为已知标识构建代理

```typescript
import {
  ActorId,
  ActorProxyBuilder,
  CommunicationProtocolEnum,
  DaprClient,
} from "@dapr/dapr";
import { CounterActor } from "./CounterActor";
import type { CounterActorContract } from "./CounterActorContract";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "3500",
  communicationProtocol: CommunicationProtocolEnum.HTTP,
});

const builder = new ActorProxyBuilder<CounterActorContract>(CounterActor, client);
const counter = builder.build(new ActorId("counter-1"));
console.log(await counter.add(5));
console.log(await counter.get());
```

在异步函数中运行这些语句。对每个远程调用都使用 await，并在应用的错误边界处理失败。

`ActorId` 要求一个非空字符串。使用稳定的 ID（例如订单或设备 ID），才能再次访问同一个 Actor。`ActorId.createRandomId()` 会生成新的标识。`getId()` 和 `toString()` 返回原始 ID；`getURLSafeId()` 返回其 URI 编码形式。请把 `ActorId` 对象直接传给 SDK，而不要预先对其内容进行编码。运行时 API 可能还会施加额外的标识符限制。

构建器使用类的运行时 `name` 作为 Actor 类型，并且不会在本地实例化该类。单独的客户端无需导入宿主实现：它可以使用具有相同运行时名称和方法形状的客户端契约类。或者，使用动态调用并传入注册时的确切类型名称。

泛型接口只在编译时检查调用。SDK 会创建一个 JavaScript `Proxy`，将属性调用转发给 sidecar；它不会校验远程契约，也不会在本地实例化 Actor。不要对代理本身使用 await，也不要把它当作本地数据对象；应对其方法调用使用 await。

## 使用随机标识创建代理

适用于不需要预先指定 ID 的场景：

```typescript
const counter = client.actor.create<CounterActorContract>(CounterActor);
console.log(await counter.add(1));
```

每次调用 `create()` 都会选择一个新的随机 Actor ID。如果调用方必须重新连接到同一个 Actor，请使用 `builder.build(actorId)`。

## 选择 HTTP 或 gRPC

无论 Actor 宿主的 HTTP 应用协议如何，调用方都可以使用任一 sidecar API。若使用 gRPC，请使用 sidecar 的 gRPC 端口创建客户端：

```typescript
const grpcClient = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
});
const grpcBuilder = new ActorProxyBuilder<CounterActorContract>(CounterActor, grpcClient);
const counter = grpcBuilder.build(new ActorId("counter-1"));
console.log(await counter.get());
```

端口值请使用字符串。当 sidecar 要求 API 令牌认证时，配置 `daprApiToken` 或 `DAPR_API_TOKEN`。代理构建器会继承客户端解析后的选项。

## 访问较底层的 Actor API

`DaprClient.actor` 只暴露 **`create()`**，而不暴露各个调用、状态和 reminder 方法。这些方法可通过构建器的 Actor 客户端获取：

```typescript
const actors = builder.actorClient.actor;

const result = await actors.invoke(
  "CounterActor",
  new ActorId("counter-1"),
  "add",
  [3],
);
console.log(result);
```

这与代理所使用的是同一套较底层 API。它提供以下方法：

| 方法 | 用途 |
|------|------|
| `invoke(type, id, method, body?)` | 调用指定的命名方法 |
| `stateGet(type, id, key)`, `stateTransaction(type, id, operations)` | 读取 Actor 状态并执行 state transaction |
| `registerActorTimer(type, id, name, timer)`, `unregisterActorTimer(type, id, name)` | 管理 timer |
| `registerActorReminder(type, id, name, reminder)`, `unregisterActorReminder(type, id, name)` | 管理单个 reminder |
| `getActorReminder(type, id, name)` | 获取规范化的 reminder 配置 |
| `listActorReminders(type, id?)` | 列出 reminder，取决于协议与运行时支持 |
| `unregisterActorRemindersByType(type, id?)` | 在 gRPC 上批量删除匹配的 reminder |

详细信息请参阅[管理 Actor 状态]({{% ref js-actors-state.md %}})和[使用 timer 和 reminder]({{% ref js-actors-timers-reminders.md %}})。

较底层接口还声明了 `getActors()`，但它不是可移植的发现 API：gRPC 从 sidecar metadata 返回活动 Actor 数量，而在本版本中 HTTP 实现并未指向有效的发现端点。如需本地注册信息，请使用 `server.actor.getRegisteredActors()`；如需 sidecar metadata，请使用 `client.metadata.get()`。

## 参数与序列化

代理会将提供的方法参数以 JSON 数组形式发送；不带参数的调用会发送 `null`。宿主会把顶层数组展开为位置参数，因此 JavaScript Actor 方法可以接受多个参数：

```typescript
// 代理调用：
await counter.add(3);

// 等价的较底层调用请求体：
await actors.invoke("CounterActor", new ActorId("counter-1"), "add", [3]);
```

对于接受单个数组参数的方法，需要外层再包一层参数数组：`[[1, 2, 3]]`。非数组的对象请求体会作为一个参数传递。跨 SDK 调用时，请明确约定 Actor 类型、方法名、JSON 结构和参数约定；JavaScript 的位置参数数组约定并非通用的 Actor 契约。

标量值也应使用参数数组：传入 `[false]`、`[0]` 或 `[""]`，而不要直接传标量本身。较底层的调用路径可能会省略假值标量的请求体。

请使用与 JSON 兼容的数据传输对象。反序列化之后，TypeScript 类型不会恢复类的原型或 `Date` 实例。避免使用 `BigInt`、循环引用、函数，也不要依赖 `undefined` 在 JSON 往返后仍被保留。

Actor 宿主使用其内置的 `BufferSerializer` 和 HTTP 响应处理。gRPC 调用使用 `JSON.stringify` 编码参数，并在可能时将响应字节解析为 JSON，否则返回文本。HTTP 响应取决于响应的 Content-Type。特别地，基本类型与 `void` 类型的响应在两种传输方式下的 JavaScript 类型不必相同。当调用方需要可预期的契约时，优先使用对象形式的响应，例如 `{ value: 3 }`。

设置 `DaprClientOptions.serializer` **不会**替换 Actor 宿主的序列化器，也不会提供自定义的 Actor 序列化流水线。与通用的应用负载 API 不同，Actor 路径不会把该选项传递下去。

## 错误与客户端生命周期

传输失败、缺少 Actor 类型或方法，以及 Actor 异常，都会使被 await 的调用被拒绝。不要假定调用被拒绝就意味着没有产生副作用；需要时应将命令和重试设计为幂等的。

HTTP 运行时失败是 `Error` 实例，其消息中包含一个带有 `status`、`error` 和 `error_msg` 的 JSON 信封；网络失败可能具有其他形式。gRPC 失败会保留 Connect RPC 错误码。不要把每条错误消息都当作 JSON 解析，也不要将 gRPC 错误码与 HTTP 状态码数字进行比较。

待未完成的调用结束后，对于应用自己拥有的客户端，调用 `await client.stop()`。不要在每次 Actor 方法调用后都停止共享客户端。
