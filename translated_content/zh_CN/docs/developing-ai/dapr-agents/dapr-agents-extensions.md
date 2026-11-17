---
type: docs
title: "Extensions and Activation Hooks"
linkTitle: "扩展"
weight: 55
description: "通过一行激活钩子为 DurableAgent 挂载自定义触发源"
aliases:
  - /zh-hans/developing-applications/dapr-agents/dapr-agents-extensions
---

Dapr Agents 的 **激活钩子（activation hook）** 是用于*扩展* `DurableAgent` 的受支持接入点。你可以借助它为代理接入自己的触发源，例如变更数据捕获（CDC）数据流、消息队列、Cron timer 或 Webhook，而无需修改代理本身或其 workflow。你通过 `agent.add_activation(...)` 注册一个回调；代理被托管时，运行器会**恰好调用一次**该回调，并在关闭时将其拆除。

开箱即用时，`DurableAgent` 由 pub/sub topic 上的 `TriggerAction` 消息触发。激活钩子允许扩展接入*任意*事件源，并将其事件转换为代理运行，整个过程可以放在独立的包中完成，无需改动代理代码。

## 工作原理

1. 扩展注册一个回调：`agent.add_activation(cb)`。
2. 当代理通过**任意** `AgentRunner` 入口点被托管时（包括 `serve()`、`subscribe()`、`register_routes()`、`workflow()`、`run()` 或 `run_stream()`），运行器会恰好一次地调用每个已注册的回调，并传入一个 `ActivationContext`。
3. 回调打开其事件源（subscription、路由或轮询器），并**返回一个可选的关闭器**：一个无参可调用对象，运行器会在 `shutdown()` 时调用它。
4. 对于每个 external event，扩展通过 `ctx.runner.run(ctx.agent, payload={"task": ...}, wait=False)` 安排一次代理运行。

回调按每个 `(runner, agent)` 组合触发一次。通过多个入口点托管同一代理时（例如 `serve()` 内部会调用 `subscribe()`），回调仍只触发一次。

对于直接调用的 `run_stream()`，激活发生在开始迭代流时，早于消费者启动和 workflow 调度。关闭响应流只会关闭其消费者；激活资源会一直保留，直到调用 `runner.shutdown()` 或 `runner.shutdown(agent)`。如果在 `serve()` 之后调用 `run_stream()`，激活不会再次执行，并保留最初的 FastAPI 应用上下文。

## `ActivationContext`

每个回调都会收到一个不可变的 `ActivationContext`。请将其中的每个字段都视为只读。

| 字段 | 类型 | 是否总是存在 | 说明 |
|------|------|-------------|------|
| `agent` | `DurableAgent` | 是 | 正在被托管的代理。 |
| `runner` | `AgentRunner` | 是 | 使用 `runner.run(agent, payload=..., wait=False)` 安排运行。 |
| `dapr_client` | `DaprClient` | 是 | 一个可用的客户端。即使在 `workflow()`/`run()`/`run_stream()` 下也保证提供，而这些入口本来不会创建客户端。可用它来打开 streaming subscription。 |
| `wf_client` | `DaprWorkflowClient` | 是 | 运行器的 Workflow Client。 |
| `app` | `FastAPI` \| `None` | **否** | 代理首次通过 `serve()` 或 `register_routes(fastapi_app=...)` 托管时存在。在 `subscribe()`、`workflow()`、`run()` 以及直接调用的 `run_stream()` 下为 `None`。 |

由于 `app` 可能为 `None`，健壮的扩展应当**根据传输方式分支处理**：当 `ctx.app` 可用时挂载 HTTP 路由，否则通过 `ctx.dapr_client` 打开 streaming subscription。

## 编写扩展

标准写法是一个工厂函数：它构建一个 `_activate(ctx)` 闭包，注册该闭包并将其返回（因此它也可以用作映射函数上的装饰器）：

```python
from dapr_agents import ActivationContext

def queue_trigger(agent, *, source, mapper=None):
    """Attach an external-queue trigger to an agent."""
    mapper = mapper or (lambda event: {"task": str(event)})

    def _activate(ctx: ActivationContext):
        # 在 subscribe()/workflow()/run()/run_stream() 下没有 FastAPI 应用。
        if ctx.app is not None:
            handle = _mount_route(ctx.app, ctx, mapper)      # HTTP 风格的源
        else:
            handle = _open_stream(ctx.dapr_client, source, ctx, mapper)  # 流式源

        closed = {"done": False}
        def _close():                       # 关闭器必须是幂等的
            if closed["done"]:
                return
            closed["done"] = True
            handle.cancel()
        return _close

    agent.add_activation(_activate)
    return _activate

def _open_stream(dapr_client, source, ctx, mapper):
    def on_event(event):
        task = mapper(event)               # 转换为 TriggerAction 负载
        if task:                            # 若 mapper 返回 None 则跳过该事件
            ctx.runner.run(ctx.agent, payload=task, wait=False)
    return dapr_client.subscribe_with_handler(...)   # 返回一个取消句柄
```

使用方只需一行即可挂载它，然后照常托管代理：

```python
from dapr_agents import DurableAgent, AgentRunner

agent = DurableAgent(name="frodo", role="...", goal="...", tools=[...])
queue_trigger(agent, source="orders")     # 挂载，无需其他连接

AgentRunner().serve(agent)                # 触发器会自动启动
```

### 扩展必须遵守的规则

1. **所有 I/O 都放在 `_activate` 内部，绝不要放在工厂函数中。** 工厂函数只负责注册；过早建立连接会破坏“托管时仅触发一次”的保证，并且在代理已配置但从未被托管的情况下泄漏资源。
2. **根据 `ctx.app is None` 分支。** 没有 FastAPI 应用时，改用 `ctx.dapr_client`，而不是挂载路由。
3. **返回幂等的关闭器。** `shutdown()` 可能先按代理执行，再全局执行；重复调用必须是空操作，且关闭器绝不能抛出异常。
4. **通过 `ctx.runner.run(...)` 安排运行**，负载结构与 `TriggerAction` 一致（`{"task": "..."}`），并且在事件处理函数内部使用 `wait=False`。
5. **在托管之前注册。** 代理被托管后再调用 `add_activation` 会抛出 `RuntimeError`。注册窗口会在首次挂接时关闭。

## 生命周期

```text
runner.subscribe(agent)        # 或 serve / register_routes / workflow / run / run_stream
  └─ first attach? → for cb in agent.activations: closer = cb(ActivationContext(...))
                       runner stores each returned closer
... agent runs, extension feeds tasks via runner.run(...) ...
runner.shutdown()              # 或 shutdown(agent)
  └─ each stored closer is invoked (errors logged, not raised)
  └─ the fire-once guard resets, so re-hosting re-activates
```

如果回调在激活期间抛出异常，运行器会回滚本次挂接中已收集的关闭器，并重新抛出一个明确指出失败回调的错误。这样，一个只接好一半的扩展就不会泄漏仍在活动的订阅。

## 打包扩展

扩展以独立发行包的形式发布，位于 `dapr_agents.ext` namespace 下，与 Dapr Python SDK 的 `ext/` 目录布局保持一致（例如 `dapr-ext-fastapi`）：

```text
ext/
  dapr-agents-ext-<name>/
    pyproject.toml                       # 依赖 dapr-agents
    dapr_agents/
      ext/
        <name>/
          __init__.py                    # 导出你的 `*_trigger` 工厂函数
```

`dapr_agents.ext` 是一个 [PEP 420 namespace 包](https://peps.python.org/pep-0420/)：**不要**在任何发行包中添加 `dapr_agents/ext/__init__.py`，这样多个扩展包才能共存于同一 namespace 下。使用方随后安装你的包，并通过 `from dapr_agents.ext.<name> import <name>_trigger` 导入。

## 另请参阅

- [Dapr Agents 核心概念]({{< ref dapr-agents-core-concepts.md >}})
- [集成]({{< ref integrations >}})
