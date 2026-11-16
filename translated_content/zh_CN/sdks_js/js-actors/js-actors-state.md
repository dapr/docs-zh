---
type: docs
title: "使用 JavaScript SDK 管理 Actor 状态"
linkTitle: "管理 Actor 状态"
weight: 40000
description: 使用 Actor 状态管理器，了解自动持久化，并处理缓存一致性
---

Actor 通过 `this.getStateManager<T>()` 访问具名状态。状态的作用域由 Actor 的**类型和 ID** 决定，并通过已配置的 Actor 状态存储进行持久化。Actor 实例上的普通字段不具备持久性。这些示例面向 `@dapr/dapr` 3.19.0 或更高版本。

## 读取和更新状态

即使你修改的是从缓存中返回的对象，也需要调用 `setState` 把值标记为已变更：

```typescript
import { AbstractActor } from "@dapr/dapr";

interface DeviceState {
  reading: number;
}

export class DeviceStateActor extends AbstractActor {
  async update(reading: number): Promise<DeviceState> {
    const manager = this.getStateManager<DeviceState>();
    const next = { reading };
    await manager.setState("device", next);
    return next;
  }

  async read(): Promise<DeviceState | null> {
    const [found, state] = await this.getStateManager<DeviceState>().tryGetState("device");
    return found ? state : null;
  }

  async remove(): Promise<void> {
    const manager = this.getStateManager<DeviceState>();
    const [found] = await manager.tryGetState("device");
    if (found) {
      await manager.removeState("device");
    }
  }
}
```

泛型参数描述的是通过该引用管理的值的类型，它不是运行时的 schema 或序列化器。对于结构不同的状态值，请使用各自独立的类型化引用，并在应用边界处校验数据。删除示例会先把值加载到缓存中，以避免下文所述的未缓存对象存在性检查限制。

## 选择状态操作

| 方法 | 行为 |
|------|------|
| `setState(name, value)` | 跟踪一次插入或更新（upsert） |
| `getState(name)` | 读取缓存或持久化的状态；状态不存在时抛出异常 |
| `tryGetState(name)` | 返回 `[found, value]`；使用值之前请先检查标志位 |
| `getOrAddState(name, initialValue)` | 返回已有状态；若不存在，则跟踪提供的初始值 |
| `addOrUpdateState(name, initialValue, updateValueFactory)` | 添加初始值，或根据 `(name, currentValue)` 计算替换值 |
| `containsState(name)` | 检查缓存或状态提供程序中是否存在该状态，但受下文限制影响 |
| `removeState(name)` | 跟踪一次删除；若找不到状态，则抛出异常 |
| `tryRemoveState(name)` | 跟踪一次删除，并返回是否找到了该状态 |
| `saveState()` | 将已跟踪的变更提交给 Actor 状态提供程序 |
| `clearCache()` | 丢弃缓存值和未保存的变更，但不删除已持久化的状态 |

虽然 `getState()` 的类型声明为 `Promise<T | null>`，但状态不存在时它会抛出异常，而不是返回 `null`。使用 `tryGetState()` 时，应检查 `found` 标志，而不是把值本身当作存在与否的指示。提供程序可能对不存在的值返回 `undefined`，尽管声明的元组类型是 `T | null`。

{{% alert title="本版本中状态管理器的限制" color="warning" %}}
状态提供程序依据真值判断（truthiness）以及值的 `length` 来推断状态是否存在。持久化的假值、空字符串和空数组，以及对象值，在存在性检查中的行为并不一致。读取时，建议对对象结构的状态配合 `getOrAddState` 或 `tryGetState` 使用，并针对你的数据结构验证不存在或删除时的行为。

`addState` 和 `tryAddState` 已存在，但 `tryAddState` 中未缓存时的存在性检查是反的，不要把它们当作仅创建（create-only）的操作。`getStateNames()` 只检查本地变更跟踪器中被选中的条目（包括待删除的条目），它不会枚举已持久化的键。请使用已知的状态键，不要把它当作状态存储的查询。
{{% /alert %}}

## 自动持久化与显式持久化

在已分发的 Actor 方法成功执行后，SDK 会运行 `onActorMethodPost()`，然后保存已跟踪的变更。定时器和提醒的回调也使用同一路径。激活与停用钩子成功完成时，同样会保存其已跟踪的变更。

`saveState()` 会把已跟踪的新增、更新和删除批量提交到一个 Actor 状态事务中。请使用支持所需 Actor 和事务功能的存储进行配置。该事务不包含外部副作用。

当需要一个中间持久化点时，请显式保存：

```typescript
const manager = this.getStateManager<{ status: string }>();
await manager.setState("operation", { status: "accepted" });
await manager.saveState();
```

此片段应位于 Actor 方法内部。之后出现的异常不会撤销已显式执行的保存。

在活动的 Actor 上，状态管理器会跨调用缓存值。调用 `clearCache()` 会让后续读取查询持久化状态，但也会丢弃未保存的变更。它不是删除 API。

## 失败与缓存一致性

方法或前置/后置钩子抛出异常时，会阻止调用结束时的正常保存。当前的分发器不会在失败的调用之后自动回滚或清除缓存的变更，因此之后一次成功的调用可能会保存失败调用遗留的变更。状态管理器还会在等待提供程序的事务之前把变更标记为未修改，因此不要假设再次调用 `saveState()` 会重放失败的写入。

应把状态保存时的错误视为操作失败，并在继续之前与持久化状态进行核对。在适当的情况下，可以使用 `clearCache()` 丢弃未提交的本地变更并重新加载；需要注意，超时的事务可能已经提交成功。请避免承诺应用层面的回滚或恰好一次（exactly-once）的效果。

## 底层状态操作

[底层 Actor 客户端]({{% ref "js-actors-client.md#access-the-lower-level-actor-api" %}})支持 `stateGet(type, id, key)` 和 `stateTransaction(type, id, operations)`。它们操作的是 Actor 状态存储，而不是任意的具名状态组件。

例如，使用该指南中的 HTTP `actors` 客户端：

```typescript
await actors.stateTransaction("CounterActor", new ActorId("counter-1"), [
  { operation: "upsert", request: { key: "maintenance-note", value: "reviewed" } },
  { operation: "delete", request: { key: "obsolete-note" } },
]);
```

只要可能，就应在 Actor 方法内部进行写入。直接事务不会更新活动实例的状态管理器缓存，也不提供 Actor 方法的串行轮次（turn）。它们可能与 Actor 调用发生竞争，或被之后的缓存写入覆盖。gRPC 事务的实现会把值字符串化，而不是应用 HTTP 的 JSON 编码，因此不要假设结构化状态在两种传输方式之间具有一致性。
