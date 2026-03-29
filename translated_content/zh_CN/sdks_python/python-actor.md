---
type: docs
title: "Dapr Actor Python SDK 入门"
linkTitle: "Actor"
weight: 20000
description: 如何快速上手使用 Dapr Python SDK
---

Dapr actor 包使您能够从 Python 应用程序与 Dapr virtual actors 交互。

## 前置条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- 已安装 [Python 3.9+](https://www.python.org/downloads/)
- 已安装 [Dapr Python 包]({{% ref "python#installation" %}})

## Actor 接口

接口定义了 actor 实现与调用 actor 的客户端之间共享的 actor 契约。由于客户端可能依赖该接口，因此通常将其定义在与 actor 实现分离的程序集中。

```python
from dapr.actor import ActorInterface, actormethod

class DemoActorInterface(ActorInterface):
    @actormethod(name="GetMyData")
    async def get_my_data(self) -> object:
        ...
```

## Actor 服务

actor 服务托管 virtual actor。它由一个派生自基类型 `Actor` 并实现 actor 接口中定义的接口的类来实现。

可以使用以下 Dapr actor 扩展之一创建 actor：
   - [FastAPI actor 扩展]({{% ref python-fastapi.md %}})
   - [Flask actor 扩展]({{% ref python-flask.md %}})

## Actor 客户端

actor 客户端包含 actor 客户端的实现，该实现调用 actor 接口中定义的 actor 方法。

```python
import asyncio

from dapr.actor import ActorProxy, ActorId
from demo_actor_interface import DemoActorInterface

async def main():
    # 创建代理客户端
    proxy = ActorProxy.create('DemoActor', ActorId('1'), DemoActorInterface)

    # 在客户端上调用方法
    resp = await proxy.GetMyData()
```

## 示例

请访问[此页面](https://github.com/dapr/python-sdk/tree/main/examples/demo_actor)查看可运行的 actor 示例。


## Mock Actor 测试

Dapr Python SDK 提供了创建 mock actor 的功能，用于对 actor 方法进行单元测试，并查看它们如何与 actor 状态交互。

### 示例用法 


```
from dapr.actor.runtime.mock_actor import create_mock_actor

class MyActor(Actor, MyActorInterface):
    async def save_state(self, data) -> None:
        await self._state_manager.set_state('mystate', data)
        await self._state_manager.save_state()

mock_actor = create_mock_actor(MyActor, "id")

await mock_actor.save_state(5)
assert mockactor._state_manager._mock_state['mystate'] == 5 #True
```
Mock actor 通过将 actor 类和 actor ID（字符串）传递给 create_mock_actor 函数来创建。此函数返回一个 actor 实例，其中许多内部方法已被覆盖。Mock actor 不与 Dapr 交互来执行保存状态或管理定时器等任务，而是使用内存状态来模拟这些行为。

可以通过以下变量访问此状态：

**重要提示：由于下文详细讨论的类型提示问题，这些变量对类型提示器/linter 等工具不可见，它们会认为这些是无效变量。您需要使用 #type: ignore 来满足任何此类系统的要求。**

- **_state_manager._mock_state()**  
一个 `[str, object]` 字典，其中存储了所有 actor 状态。通过 `_state_manager.save_state(key, value)` 或任何其他 statemanager 方法保存的任何变量都作为该键值对存储在字典中。通过 `try_get_state` 或任何其他 statemanager 方法加载的任何值都从此字典中获取。

- **_state_manager._mock_timers()**  
一个 `[str, ActorTimerData]` 字典，其中保存活动的 actor 定时器。任何会添加或移除定时器的 actor 方法都会从此字典中添加或弹出相应的 `ActorTimerData` 对象。

- **_state_manager._mock_reminders()**  
一个 [str, ActorReminderData] 字典，其中保存活动的 actor 提醒。任何会添加或移除定时器的 actor 方法都会从此字典中添加或弹出相应的 ActorReminderData 对象。

**注意：定时器和提醒永远不会实际触发。这些字典的存在仅为了测试应该添加或移除定时器/提醒的方法。如果您需要测试它们应该激活的回调，您应该使用适当的值直接调用它们：**
```
result = await mock_actor.recieve_reminder(name, state, due_time, period, _ttl)
# 直接测试结果，或通过查询 `_state_manager._mock_state` 测试副作用（如更改状态）
```

### 用法和限制

**为了允许更细粒度的控制，`_on_activate` 方法不会像 Dapr 初始化新的 Actor 实例时那样自动调用。您应该在测试中根据需要手动调用它。**

**Mock actor 系统当前的一个限制是它不调用 `_on_pre_actor_method` 和 `_on_post_actor_method` 方法。您始终可以手动调用这些方法作为测试的一部分。**

`__init__`、`register_timer`、`unregister_timer`、`register_reminder`、`unregister_reminder` 方法都会被 MockActor 类覆盖，该类通过 `create_mock_actor` 作为 mixin 应用。如果您的 actor 本身覆盖了这些方法，这些修改本身将被覆盖，actor 可能不会按您的预期运行。

*注意：`__init__` 是一个特殊情况，您应该将其定义为*
```
    def __init__(self, ctx, actor_id):
        super().__init__(ctx, actor_id)
```
*Mock actor 可以正常工作，但如果您在 `__init__` 中添加了任何额外逻辑，它将被覆盖。值得注意的是，在初始化时应用逻辑的正确方法是通过 `_on_activate`（也可以与 mock actor 安全使用），而不是 `__init__`。*

*如果您有一个确实覆盖了默认 Dapr actor 方法的 actor，您可以创建 MockActor 类（来自 MockActor.py）的自定义子类，该类实现您拥有的任何自定义逻辑，同时与 `_mock_state`、`_mock_timers` 和 `_mock_reminders` 正常交互，然后通过您自己定义的 `create_mock_actor` 函数将该自定义类作为 mixin 应用。*

Actor `_runtime_ctx` 变量设置为 None。所有正常的 actor 方法都已覆盖，不会调用它，但如果您的代码本身直接与 `_runtime_ctx` 交互，测试可能会失败。

Actor _state_manager 被 `MockStateManager` 实例覆盖。它具有与基本 `ActorStateManager` 相同的所有方法和功能，除了使用各种 `_mock` 变量而不是 `_runtime_ctx` 来存储数据。如果您的代码实现了自己的自定义状态管理器，它将被覆盖，测试可能会失败。

### 类型提示

由于 Python 缺乏用于类型提示类型交集的统一方法（参见：[python/typing #213](https://github.com/python/typing/issues/213)），类型提示不幸地不适用于 Mock Actor。返回类型被类型提示为"Actor 子类 T 的实例"，而实际上应该被类型提示为"MockActor 子类 T 的实例"或"类型交集 `[Actor 子类 T, MockActor]` 的实例"（值得注意的是，`MockActor` 本身是 `Actor` 的子类）。

这意味着，例如，如果您在代码编辑器中将鼠标悬停在 `mockactor._state_manager` 上，它将显示为 ActorStateManager 的实例（而不是 MockStateManager），各种 IDE 辅助功能（如 VSCode 的 `Go to Definition`，它会将您带到 ActorStateManager 的定义而不是 MockStateManager）将无法正常工作。

目前，这个问题无法修复，因此仅仅需要注意它，因为它可能会引起混淆。如果将来能够准确地为这种情况进行类型提示，欢迎随时打开关于实现它的问题。
