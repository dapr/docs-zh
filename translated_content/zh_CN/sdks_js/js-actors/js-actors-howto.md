---
type: docs
title: "How to: Run and use virtual actors with the JavaScript SDK"
linkTitle: "运行和使用 Actor"
weight: 10000
description: 创建 Actor 契约、托管有状态的 Actor，并从 Node.js 客户端调用它
---

本指南将创建一个计数器 Actor，其状态在 Actor 停用后依然保留。宿主和客户端共享同一份 TypeScript 契约，并使用 `@dapr/dapr` 3.19.0 或更高版本。

## 前提条件

- 受支持的 [Node.js LTS 版本](https://nodejs.org/en/)。
- [Dapr CLI]({{% ref install-dapr-cli.md %}}) 以及[已初始化的本地 Dapr environment]({{% ref install-dapr-selfhost.md %}})，其中包括 Redis 和 Placement service。使用由 Scheduler 支持的 reminder 时，还需要 Scheduler service。

## 步骤 1：准备项目

在空目录中初始化 Node.js 项目，并安装 SDK 和 TypeScript 工具：

```shell
npm init -y
npm install @dapr/dapr@3.19.0
npm install --save-dev typescript tsx @types/node
```

该命令固定为本指南所用的 3.19.0 版本。你也可以显式选择更新的已发布版本。

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## 步骤 2：定义契约

创建 `CounterActorContract.ts`：

```typescript
export interface CounterState {
  value: number;
}

export interface CounterActorContract {
  add(amount: number): Promise<CounterState>;
  get(): Promise<CounterState>;
}
```

接口只提供编译期检查，它不是运行时注册或访问控制边界。JavaScript 应用可以省略 TypeScript 接口。

## 步骤 3：实现 Actor

创建 `CounterActor.ts`：

```typescript
import { AbstractActor } from "@dapr/dapr";
import type { CounterActorContract, CounterState } from "./CounterActorContract";

export class CounterActor extends AbstractActor implements CounterActorContract {
  async add(amount: number): Promise<CounterState> {
    if (!Number.isFinite(amount)) {
      throw new TypeError("amount must be a finite number");
    }

    const manager = this.getStateManager<CounterState>();
    const current = await manager.getOrAddState("counter", { value: 0 });
    const next = { value: (current?.value ?? 0) + amount };
    await manager.setState("counter", next);
    return next;
  }

  async get(): Promise<CounterState> {
    const state = await this.getStateManager<CounterState>().getOrAddState(
      "counter",
      { value: 0 },
    );
    return state ?? { value: 0 };
  }
}
```

运行时会在方法成功返回且后置钩子执行完成后，保存已跟踪的状态变更。你无需在每个方法中调用 `saveState()`。关于显式保存和失败处理，请参阅[管理 Actor 状态]({{% ref js-actors-state.md %}})。

## 步骤 4：配置 state store

创建 `components` 目录，并将以下内容保存为 `components\statestore.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
    - name: redisPassword
      value: ""
    - name: actorStateStore
      value: "true"
```

这里使用的是本地 Dapr 初始化所启动的 Redis。在生产环境中，请配置一个[支持 Actor 的 state store]({{% ref supported-state-stores.md %}})，并确保其具备所需的事务支持。每个应用只能有一个 component 被标记为 Actor state store。

## 步骤 5：注册并启动宿主

创建 `server.ts`：

```typescript
import { CommunicationProtocolEnum, DaprServer } from "@dapr/dapr";
import { CounterActor } from "./CounterActor";

async function main(): Promise<void> {
  const server = new DaprServer({
    serverHost: "127.0.0.1",
    serverPort: "3001",
    communicationProtocol: CommunicationProtocolEnum.HTTP,
    clientOptions: {
      daprHost: "127.0.0.1",
      daprPort: "3500",
      communicationProtocol: CommunicationProtocolEnum.HTTP,
    },
  });

  await server.actor.init();
  await server.actor.registerActor(CounterActor);
  await server.start();
  console.log("Registered actor types:", await server.actor.getRegisteredActors());
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

启动应用及其 sidecar：

```shell
dapr run --app-id counter-service --app-port 3001 --app-protocol http --dapr-http-port 3500 --resources-path components -- npx tsx server.ts
```

应用监听端口 `3001`，sidecar 的 HTTP API 监听端口 `3500`。等待宿主报告 `CounterActor` 已注册。

## 步骤 6：调用 Actor

创建 `client.ts`：

```typescript
import { ActorId, ActorProxyBuilder, DaprClient } from "@dapr/dapr";
import { CounterActor } from "./CounterActor";
import type { CounterActorContract } from "./CounterActorContract";

async function main(): Promise<void> {
  const client = new DaprClient({ daprHost: "127.0.0.1", daprPort: "3500" });

  try {
    const builder = new ActorProxyBuilder<CounterActorContract>(CounterActor, client);
    const counter = builder.build(new ActorId("counter-1"));
    console.log(await counter.add(2));
    console.log(await counter.get());
  } finally {
    await client.stop();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

在第二个终端中运行：

```shell
npx tsx client.ts
```

对于新建的 Actor，两次调用都会输出 `{ value: 2 }`。再次运行客户端，会把同一个 Actor 递增到 `4`。本示例中客户端使用宿主的 sidecar；独立的应用可以使用它自己的 sidecar。

Actor 的标识是 `CounterActor` 与 `counter-1` 的组合。创建代理不会激活 Actor；调用方法时才会激活它。

## 相关链接

- [编写和托管 Actor]({{% ref js-actors-usage.md %}})
- [调用 Actor]({{% ref js-actors-client.md %}})
- [使用 timer 和 reminder]({{% ref js-actors-timers-reminders.md %}})
