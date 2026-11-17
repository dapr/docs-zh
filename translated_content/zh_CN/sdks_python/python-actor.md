---
type: docs
title: "Dapr Actor Python SDK 入门"
linkTitle: "Actor"
weight: 20000
description: 如何快速上手使用 Dapr Python SDK
---

Dapr Actor 包使你能够从 Python 应用程序与 Dapr virtual Actor 进行交互。

## 前置条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- 已安装 [Python 3.10+](https://www.python.org/downloads/)
- 已安装 [Dapr Python 包]({{% ref "python#installation" %}})

## Actor 接口

接口定义了 Actor 实现与调用该 Actor 的客户端之间共享的 Actor 契约。由于客户端可能依赖该接口，通常适合将其定义在与 Actor 实现分离的程序集中。

```python
from dapr.actor import ActorInterface, actormethod

class DemoActorInterface(ActorInterface):
    @actormethod(name="GetMyData")
    async def get_my_data(self) -> object:
        ...
```

## Actor 服务

Actor 服务用于托管 virtual Actor。它由一个派生自基类型 `Actor` 并实现 Actor 接口中所定义接口的类来实现。

可以使用以下任一 Dapr Actor 扩展来创建 Actor：
   - [FastAPI Actor 扩展]({{% ref python-fastapi.md %}})
   - [Flask Actor 扩展]({{% ref python-flask.md %}})

## Actor 客户端

Actor 客户端包含调用 Actor 接口中定义的 Actor 方法的客户端实现。

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

请访问[此页面](https://github.com/dapr/python-sdk/tree/main/examples/demo_actor)查看可运行的 Actor 示例。


## Mock Actor 测试

Dapr Python SDK 提供了创建 Mock Actor 的功能，用于对 Actor 方法进行单元测试，并查看它们如何与 Actor 状态交互。

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
Mock Actor 通过将你的 Actor 类和 Actor ID（字符串）传递给 create_mock_actor 函数来创建。该函数返回一个 Actor 实例，其中许多内部方法已被覆盖。对于保存状态或管理 timer 等任务，Mock Actor 不与 Dapr 交互，而是使用内存中的状态来模拟这些行为。

可以通过以下变量访问此状态：

**重要提示：由于下文将讨论的类型提示问题，这些变量对类型提示器、linter 等工具不可见，它们会认为这些是无效变量。你需要在使用它们时添加 #type: ignore，以满足此类系统的要求。**

- **_state_manager._mock_state()**  
一个 `[str, object]` 字典，其中存储了所有 Actor 状态。通过 `_state_manager.save_state(key, value)` 或任何其他 statemanager 方法保存的变量，都会以该键值对的形式存储在字典中。通过 `try_get_state` 或任何其他 statemanager 方法加载的值，都取自此字典。

- **_state_manager._mock_timers()**  
一个 `[str, ActorTimerData]` 字典，其中保存活动的 Actor timer。任何会添加或移除 timer 的 Actor 方法，都会相应地在此字典中添加或弹出对应的 `ActorTimerData` 对象。

- **_state_manager._mock_reminders()**  
一个 [str, ActorReminderData] 字典，其中保存活动的 Actor reminder。任何会添加或移除 timer 的 Actor 方法，都会相应地在此字典中添加或弹出对应的 ActorReminderData 对象。

**注意：timer 和 reminder 永远不会真正触发。这些字典仅用于测试应当添加或移除 timer/reminder 的方法。如果你需要测试它们应激活的回调，应使用适当的值直接调用这些回调：**
```
result = await mock_actor.recieve_reminder(name, state, due_time, period, _ttl)
# 直接测试结果，或通过查询 `_state_manager._mock_state` 测试副作用（例如改变状态）
```

### 用法和限制

**为了实现更细粒度的控制，`_on_activate` 方法不会像 Dapr 初始化新的 Actor 实例时那样自动调用。你应根据需要在测试中手动调用它。**

**Mock Actor 系统目前的一个限制是它不会调用 `_on_pre_actor_method` 和 `_on_post_actor_method` 方法。你始终可以在测试中手动调用这些方法。**

`__init__`、`register_timer`、`unregister_timer`、`register_reminder`、`unregister_reminder` 方法都会被 MockActor 类覆盖，该类通过 `create_mock_actor` 以 mixin 的方式应用。如果你的 Actor 自身覆盖了这些方法，那么这些修改同样会被覆盖，Actor 很可能无法按你的预期运行。

*注意：`__init__` 是一种特殊情况，你应当将其定义为*
```
    def __init__(self, ctx, actor_id):
        super().__init__(ctx, actor_id)
```
*Mock Actor 可以正常与此配合使用，但如果你在 `__init__` 中添加了任何额外逻辑，这些逻辑将被覆盖。值得注意的是，在初始化时应用逻辑的正确方式是通过 `_on_activate`（它同样可以安全地用于 Mock Actor），而不是 `__init__`。*

*如果你的 Actor 确实覆盖了 Dapr 默认的 Actor 方法，你可以创建 MockActor 类（来自 MockActor.py）的自定义子类，在其中实现你所需的自定义逻辑，同时照常与 `_mock_state`、`_mock_timers` 和 `_mock_reminders` 交互，然后通过你自己定义的 `create_mock_actor` 函数，将该自定义类以 mixin 的方式应用。*

Actor 的 `_runtime_ctx` 变量被设置为 None。所有常规 Actor 方法都已被覆盖，因此不会调用它；但如果你的代码本身直接与 `_runtime_ctx` 交互，测试可能会失败。

Actor 的 _state_manager 会被替换为 `MockStateManager` 的实例。它具有与基类 `ActorStateManager` 相同的所有方法和功能，区别在于它使用各种 `_mock` 变量而不是 `_runtime_ctx` 来存储数据。如果你的代码实现了自定义的 state manager，它将被覆盖，测试很可能会失败。

### 类型提示

由于 Python 缺乏统一的方法来为类型交集添加类型提示（参见：[python/typing #213](https://github.com/python/typing/issues/213)），类型提示遗憾地无法用于 Mock Actor。返回类型被标注为“Actor 子类 T 的实例”，而实际上它应当被标注为“MockActor 子类 T 的实例”，或“类型交集 `[Actor 子类 T, MockActor]` 的实例”（值得注意的是，`MockActor` 本身就是 `Actor` 的子类）。

这意味着，例如，在代码编辑器中将鼠标悬停在 `mockactor._state_manager` 上时，它会显示为 ActorStateManager 的实例（而不是 MockStateManager），并且各种 IDE 辅助功能（例如 VSCode 的 `Go to Definition`，它会跳转到 ActorStateManager 的定义而不是 MockStateManager 的定义）也无法正常工作。

目前该问题无法修复，因此仅作为一项需要注意的事项，以免造成困扰。如果将来能够为此类情况准确地添加类型提示，欢迎随时就其实现提交 issue。
