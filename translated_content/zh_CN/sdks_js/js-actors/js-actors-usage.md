---
type: docs
title: "使用 JavaScript SDK 编写和托管 Actor"
linkTitle: "编写和托管 Actor"
weight: 20000
description: 注册 Actor 类型、使用生命周期钩子，并配置 JavaScript Actor 宿主
---

JavaScript Actor 继承自 `AbstractActor`。当 Dapr 激活 Actor 时，SDK 会使用 `DaprClient` 和 `ActorId` 构造一个实例。完整的应用示例请参阅[操作指南]({{% ref js-actors-howto.md %}})，其使用的是 `@dapr/dapr` 3.19.0 或更高版本。

## Actor 的构造与标识

如果你定义了构造函数，请接收这两个运行时参数，并将它们传递给基类构造函数：

```typescript
import { AbstractActor, ActorId, DaprClient } from "@dapr/dapr";

export class DeviceActor extends AbstractActor {
  constructor(client: DaprClient, id: ActorId) {
    super(client, id);
  }

  async identify(): Promise<{ type: string; id: string }> {
    return {
      type: this.getActorType(),
      id: this.getActorId().getId(),
    };
  }
}
```

如果不需要额外的初始化，可以省略构造函数。内置的注册 API 接收的是类，而不是依赖注入工厂，并且只提供这两个参数。它不提供 .NET SDK 的构造函数依赖注入，也不提供 Actor 作用域的服务容器。

注册的 Actor 类型是实现类的 `name`，例如 `DeviceActor`。`registerActor` 上没有单独的类型名称选项。请在各次部署之间保持类名稳定，并配置打包工具（bundler）和压缩工具（minifier）保留这些类名。重命名类会改变 Actor 类型，进而改变其标识和状态 namespace。

## 生命周期与方法钩子

按需重写以下异步方法：

| 钩子 | 运行时机 |
|------|--------------|
| `onActivate()` | 每次激活时运行一次，早于派发第一个方法或回调 |
| `onDeactivate()` | Dapr 请求停用时运行，例如空闲超时之后 |
| `onActorMethodPre()` | 在每次派发的 Actor 方法、timer 回调或 reminder 回调之前运行 |
| `onActorMethodPost()` | 派发的调用成功完成后、保存被跟踪的状态之前运行 |

对于一次成功的调用，执行顺序为：必要时先执行激活，然后是方法前钩子、方法本身、方法后钩子，最后保存状态。激活和停用钩子中被跟踪的更改同样会被保存。SDK 会在激活和停用钩子之前清空状态缓存。

```typescript
import { AbstractActor } from "@dapr/dapr";

export class LifecycleActor extends AbstractActor {
  async onActivate(): Promise<void> {
    console.log("Activating", this.getActorId().getId());
  }

  async onDeactivate(): Promise<void> {
    console.log("Deactivating", this.getActorId().getId());
  }

  async onActorMethodPre(): Promise<void> {
    console.log("Starting a call");
  }

  async onActorMethodPost(): Promise<void> {
    console.log("Completed a call");
  }
}
```

不要依赖停用来保证进程崩溃后的清理。抛出异常的方法会跳过方法后钩子和自动状态保存；请参阅[状态失败处理]({{% ref "js-actors-state.md#failures-and-cache-consistency" %}})。

在 Actor 内部使用 `getDaprClient()` 访问其他 Dapr building block。请等待产生的操作完成。外部副作用（例如发布消息）不属于 Actor state transaction 的一部分。

## 注册 Actor 并配置运行时

Actor 宿主必须使用 HTTP。请先初始化回调路由并等待所有 Actor 注册完成，**然后**再启动服务器：

```typescript
import { CommunicationProtocolEnum, DaprServer } from "@dapr/dapr";
import { CounterActor } from "./CounterActor";

const server = new DaprServer({
  serverHost: "127.0.0.1",
  serverPort: "3001",
  communicationProtocol: CommunicationProtocolEnum.HTTP,
  clientOptions: {
    daprHost: "127.0.0.1",
    daprPort: "3500",
    communicationProtocol: CommunicationProtocolEnum.HTTP,
    actor: {
      actorIdleTimeout: "1h",
      actorScanInterval: "30s",
      drainOngoingCallTimeout: "5s",
      drainRebalancedActors: true,
      remindersStoragePartitions: 0,
    },
  },
});

await server.actor.init();
await server.actor.registerActor(CounterActor);
await server.start();
console.log(await server.actor.getRegisteredActors());
```

此代码片段使用了操作指南中的 `CounterActor`，并在异步函数中运行。请在 **`DaprServer.clientOptions.actor`** 上设置选项，因为其内嵌的客户端提供 Actor runtime 配置。在无关的客户端上设置 Actor 选项不会配置宿主。

宿主暴露 `/healthz`、`/dapr/config`，以及 Actor 调用、停用、timer 和 reminder 路由。`getRegisteredActors()` 返回已注册的 **类型名称**，而不是活动实例数量。在该 SDK 中，Actor runtime 注册是进程范围的；不要把同一进程中的多个 `DaprServer` 实例视为相互独立的 Actor runtime。

超时和扫描间隔使用 [Go 时长字符串](https://pkg.go.dev/time#ParseDuration)，例如 `"30s"` 和 `"1h"`，而不是 `Temporal.Duration`。省略的设置由运行时决定。默认值和随运行时版本变化的行为，请参阅 [Actor runtime 配置]({{% ref actors-runtime-config.md %}})。`remindersStoragePartitions` 与旧版 state store 的 reminder 存储有关，而不是 Scheduler 的分区。

{{% alert title="重入限制" color="warning" %}}
配置类型接受 `reentrancy: { enabled: true, maxStackDepth: 32 }`，并将其告知 Dapr。但是，JavaScript Actor 派发器和代理并未实现重入上下文的传播。不要以为启用该选项就能让 Actor 调用循环（包括 Actor 调用自身）变得安全。除非你自行提供并验证了所需的集成，否则应优先使用无环的 Actor 间调用，并保持重入功能关闭。
{{% /alert %}}

## 应用边界与关闭

确保 HTTP 回调路由可被 sidecar 访问。在容器部署中，请配置 sidecar 的应用通道地址和容器网络，以使回调能够到达应用。除非 sidecar 与应用共享网络 namespace，否则回环地址指的是 sidecar 自身的网络 namespace。

TypeScript 契约并不限制方法派发：派发器会按名称在 Actor 实例上查找可调用的属性。不要依赖省略的接口成员或 TypeScript 的 `private` 修饰符来保护敏感操作。请将内部操作置于可被远程调用的 Actor 方法之外，并使用适当的应用和 sidecar 访问控制。

有序关闭时，请停止接受新工作，并等待进行中的操作完成。`await server.stop()` 会关闭应用侧监听器，但不会停止其内嵌的客户端。当不再需要时，请使用 `await client.stop()` 分别停止由你自行创建的客户端，并使用 `await server.client.stop()` 停止内嵌客户端。不要假定关闭时会调用每个 Actor 的停用钩子。
