---
type: docs
title: "使用 JavaScript SDK 的 Actor 定时器与提醒"
linkTitle: "定时器与提醒"
weight: 50000
description: "调度 Actor 回调、查看提醒，并安全地批量移除提醒"
---

定时器在 Actor 激活期间安排工作。提醒是持久的，可以在 Actor 停用或故障转移后重新激活该 Actor。调度由 Dapr 运行；SDK 负责注册回调并将其分发给你的 Actor。这些示例面向 `@dapr/dapr` 3.19.0 或更高版本。

有关运行时调度与重试语义，请参阅 [Actor 定时器与提醒]({{% ref actors-timers-reminders.md %}})。现代 Dapr 运行时将提醒持久化在 Scheduler 服务中，而不是 Actor 的内存字段里。

## 在 Actor 内注册回调

在应用方法中使用 `AbstractActor` 提供的辅助方法。从 `@dapr/dapr` 导入 `Temporal`：

```typescript
import { AbstractActor, Temporal } from "@dapr/dapr";

export interface ScheduledActorContract {
  start(): Promise<void>;
  cancel(): Promise<void>;
}

export class ScheduledActor extends AbstractActor implements ScheduledActorContract {
  async start(): Promise<void> {
    await this.registerActorTimer(
      "heartbeat",
      "onHeartbeat",
      Temporal.Duration.from({ seconds: 2 }),
      Temporal.Duration.from({ seconds: 30 }),
      Temporal.Duration.from({ minutes: 5 }),
      "heartbeat",
    );

    await this.registerActorReminder(
      "follow-up",
      Temporal.Duration.from({ minutes: 1 }),
      Temporal.Duration.from({ minutes: 5 }),
      Temporal.Duration.from({ hours: 1 }),
      "follow-up",
    );
  }

  async onHeartbeat(data: unknown): Promise<void> {
    console.log("Timer:", data);
  }

  async receiveReminder(data: unknown): Promise<void> {
    console.log("Reminder:", data);
  }

  async cancel(): Promise<void> {
    await this.unregisterActorTimer("heartbeat");
    await this.unregisterActorReminder("follow-up");
  }
}
```

与[操作指南]({{% ref js-actors-howto.md %}})中的 Actor 一样，在 HTTP 宿主上注册 `ScheduledActor`，然后通过代理调用 `start()`。两个回调都会参与常规的前置与后置方法钩子，以及成功的状态保存路径。

辅助方法的签名如下：

```text
registerActorTimer(name, callback, dueTime, period?, ttl?, state?)
registerActorReminder(name, dueTime, period?, ttl?, state?)
unregisterActorTimer(name)
unregisterActorReminder(name)
```

必填的辅助参数 `dueTime` 是一个 `Temporal.Duration`。`period` 和 `ttl` 是可选的时长。若只需一次性回调，请省略 `period`；当需要提供后面的可选参数时，使用 `undefined` 占位。例如：

```typescript
await this.registerActorReminder(
  "once",
  Temporal.Duration.from({ seconds: 10 }),
  undefined,
  undefined,
  "one-shot",
);
```

请让 TTL 足够长，以覆盖首次到期时间以及所需的任何重复次数。运行时会校验调度值。建议使用秒、分钟、小时等基于时间的时长：HTTP 注册实现会将 `Temporal` 字符串转换为 Go 风格的时长，且无法正确编码日历或天级别的时长字符串。这些辅助方法不接受绝对时间戳、cron 表达式或重复次数字符串。

定时器回调使用你以 `callback` 提供的方法名。每个提醒都会调用 **`receiveReminder(data)`**。JavaScript 回调不会将提醒名称、到期时间或周期作为单独的参数接收。当多个提醒共享同一个回调时，请在数据中加入一个区分标记。继承而来的 `receiveReminder` 只会记录一条警告；请覆盖它以执行实际工作。

回调数据由内置的 buffer 序列化器解码。优先使用简单的字符串负载，或在回调中校验过的显式 JSON 序列化内容。不要假定任意对象和数组能在每一种定时器或提醒注册路径中原样往返；数组还会被分发器展开为位置参数。由于重试可能导致重复投递，请让持久化的回调处理保持幂等。

## 从客户端管理调度

使用[底层 Actor API]({{% ref "js-actors-client.md#access-the-lower-level-actor-api" %}})。以下设置使用一个仅含名称的类：它只选择已注册的 Actor 类型，而不导入其服务端实现。

```typescript
import { ActorId, ActorProxyBuilder, DaprClient, Temporal } from "@dapr/dapr";

class ScheduledActor {}

const client = new DaprClient({ daprHost: "127.0.0.1", daprPort: "3500" });
const actors = new ActorProxyBuilder(ScheduledActor, client).actorClient.actor;
const actorId = new ActorId("device-1");
```

请在异步函数内运行此示例及后续的客户端代码片段。此示例假定 `ScheduledActor` 已在宿主上注册。`DaprClient.actor` 本身只暴露 `create()`；`client.actor.getActorReminder()` 之类的调用并不受支持。

要通过 HTTP 注册提醒：

```typescript
await actors.registerActorReminder("ScheduledActor", actorId, "follow-up", {
  dueTime: Temporal.Duration.from({ minutes: 1 }),
  period: Temporal.Duration.from({ minutes: 5 }),
  ttl: Temporal.Duration.from({ hours: 1 }),
  data: "follow-up",
});
```

定时器注册使用相同的选项，外加一个必填的 `callback`：

```typescript
await actors.registerActorTimer("ScheduledActor", actorId, "heartbeat", {
  callback: "onHeartbeat",
  dueTime: Temporal.Duration.from({ seconds: 2 }),
  period: Temporal.Duration.from({ seconds: 30 }),
  data: "heartbeat",
});
```

从外部注册定时器前，请确保 Actor 已处于激活状态，并将定时器操作发送到拥有该 Actor 的边车。在 Actor 方法内注册定时器可以避免选错宿主。定时器会在停用时消失；如果应用需要它们，请在之后的激活中重新注册。

HTTP 注册路径会以 JSON 形式发送 `data`。gRPC 提醒注册使用 `data.toString()`，而 gRPC 定时器注册要求数据可被 `Buffer.from` 接受；两者都不会对任意对象进行 JSON 序列化。不要依赖假值（falsy）的 gRPC 负载能够被正确传输。

注册与读取在不同协议之间并不对称。运行时可能会把 gRPC 注册时发送的字节以 base64 编码的 JSON 字符串形式存储，而 SDK 的提醒查询会保留该字符串，不会自动解码。例如，以 `data: "hello"` 通过 gRPC 注册的提醒，读取时可能得到 `"aGVsbG8="`。在 gRPC 注册之前调用 `JSON.stringify`，本身并不能恢复 JSON 往返。对于 JSON 负载，即使查询走 gRPC，也应优先使用 HTTP 注册。如果必须通过 gRPC 注册，请与运行时及使用方明确并验证编码约定；不要猜测返回的任意字符串是否为 base64。

## 获取提醒

`getActorReminder` 同时支持 HTTP 和 gRPC：

```typescript
const reminder = await actors.getActorReminder("ScheduledActor", actorId, "follow-up");
console.log({
  data: reminder.data,
  dueTime: reminder.dueTime?.toString(),
  period: reminder.period?.toString(),
  remainingTtl: reminder.ttl?.toString(),
});
```

返回的配置包含可选的 `dueTime`、`period`、`ttl` 和 `data` 字段。时间相关字段会被规范化为 **`Temporal.Duration`**，而不是运行时的原始字符串。

- 包括亚秒级单位在内的 ISO 8601 和 Go 风格时长都会被规范化。以 `@every ` 开头的周期同样被接受。
- 绝对的到期时间戳和过期时间戳会转换为相对于读取时刻的时长。`ttl` 是剩余生命周期，不一定等于最初注册时的 TTL。
- 缺失或为空的时间字段保持为 `undefined`。部分由调度器支持的运行时即使对设置了过期时间的提醒也会省略 `ttl`。不要因为某个字段缺失，就认为没有配置过期时间。
- cron 表达式或像 `R3/PT1M` 这样的重复次数周期无法用 `Temporal.Duration` 表示；读取会直接报错，而不是返回有损的调度信息。

HTTP 读取会保留运行时返回的 JSON `data`。gRPC 读取会解包 protobuf 的 `BytesValue`，并将其字节解析为 JSON；不支持的封装或无效的 JSON 会使操作失败。读取不存在的提醒会报错，而不是返回空的配置。

## 列出提醒

查询单个 Actor 的提醒：

```typescript
import type { NamedActorReminderType } from "@dapr/dapr";

const reminders: NamedActorReminderType[] =
  await actors.listActorReminders("ScheduledActor", actorId);

for (const reminder of reminders) {
  console.log(reminder.actorType, reminder.actorId, reminder.name, reminder.data);
}
```

类型导入请放在模块作用域中。`NamedActorReminderType` 包含 `name`、`actorType` 和原始字符串形式的 **`actorId`**，以及 `getActorReminder` 返回的规范化字段。它不会暴露 HTTP 的 `actorID` 拼写，也不会暴露嵌套的 protobuf 提醒。

| 操作 | 运行时要求 |
|-----------|---------------------|
| 按精确 Actor ID 进行 HTTP 列表查询 | Dapr 1.19+ |
| 按精确 Actor ID 进行 gRPC 列表查询 | Dapr 1.17+ |
| 不指定 Actor ID、按 Actor 类型进行 gRPC 列表查询 | Dapr 1.17+ |

Actor ID 是精确过滤条件，而不是前缀。HTTP 要求提供该 ID，并会在发送请求前拒绝省略的 ID。对于配置了 gRPC 的底层客户端，省略它即可列出该类型的所有实例：

```typescript
const allReminders = await grpcActors.listActorReminders("ScheduledActor");
```

这里的 `grpcActors` 按下一节所示进行配置。排序不做保证；成功但为空的结果为 `[]`。格式错误的条目、无法表示的时间值、不受支持的运行时 API 以及传输错误都会使列表操作失败，而不会返回部分或空的成功结果。

## 注销提醒与定时器

单个注销在 HTTP 和 gRPC 上都可用：

```typescript
await actors.unregisterActorReminder("ScheduledActor", actorId, "follow-up");
await actors.unregisterActorTimer("ScheduledActor", actorId, "heartbeat");
```

批量删除提醒需要 gRPC 和 Dapr 1.17 或更高版本。例如，配置一个单独的管理客户端：

```typescript
import { CommunicationProtocolEnum } from "@dapr/dapr";

const grpcClient = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
});
const grpcActors = new ActorProxyBuilder(ScheduledActor, grpcClient).actorClient.actor;

await grpcActors.unregisterActorRemindersByType("ScheduledActor", actorId);
```

请将该导入放在模块作用域中。传入 Actor ID 只会删除该精确实例的提醒，不影响其他实例和 Actor 类型。

{{% alert title="类型级删除具有破坏性" color="warning" %}}
省略 `unregisterActorRemindersByType("ScheduledActor")` 的第二个参数，会删除该边车应用作用域内该 Actor 类型**所有实例的全部提醒**。被删除的提醒无法通过此操作恢复。除非明确需要类型级删除，否则不要把用户未提供的 Actor ID 转为 `undefined`。
{{% /alert %}}

HTTP 实现对批量删除会直接抛出 `HTTPNotSupportedError`，且不会发送请求。不存在自动回退到逐个提醒的 HTTP 删除机制。实例级和类型级的 gRPC 删除都返回 `Promise<void>`；RPC 错误会向上传播。

本版本不提供定时器的获取与列出操作，也不提供提醒的 `overwrite` 和 `failurePolicy` 注册选项，即使运行时支持它们。若需使用这些运行时能力，请参阅 [Actors API 参考]({{% ref actors_api.md %}})，而不要在 SDK 调用中添加不受支持的属性。

不要假定以已存在的提醒名称注册会替换其配置。仅允许创建的提醒注册机制会拒绝重复项，除非请求 `overwrite`，而这些 SDK 辅助方法无法表达该选项。因此，上面的 `start()` 示例并不是幂等的调度操作。若需要替换，请使用运行时 API，或先显式注销再重新创建提醒，并注意其中的间隔和重置后的调度。

管理操作完成后，请使用 `await client.stop()` 和 `await grpcClient.stop()` 停止由你的应用持有的客户端。
