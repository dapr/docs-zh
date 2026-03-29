title: "Conversation API（Python）- 推荐用法"
linkTitle: "对话"
weight: 11000
type: docs
description: 推荐在 Python 中配合或不配合工具使用 Dapr Conversation API 的模式，包括多轮流程与安全指引。
---

Dapr Conversation API 当前仍处于 alpha 阶段。本文给出在 Python SDK 中高效使用它的推荐最小模式：
- 纯请求（无工具）
- 携带工具的请求（将函数用作工具）
- 带工具执行的多轮流程
- 异步变体
- 执行工具调用时的重要安全注意事项

## 前提条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- 已安装 [Python 3.9+](https://www.python.org/downloads/)
- 已安装 [Dapr Python 包]({{% ref "python#installation" %}})
- 已在 Dapr 环境中配置好 LLM 组件（例如 OpenAI 或 Azure OpenAI）

如需完整的端到端流程与提供程序配置，参见：
- Conversation 相关 SDK 示例：
  - [TOOL-CALL-QUICKSTART.md](https://github.com/dapr/python-sdk/blob/main/examples/conversation/TOOL-CALL-QUICKSTART.md)
  - [real_llm_providers_example.py](https://github.com/dapr/python-sdk/blob/main/examples/conversation/real_llm_providers_example.py)

## 基础对话（无工具）

```python
from dapr.clients import DaprClient
from dapr.clients.grpc import conversation

# 构建单轮 Alpha2 输入
user_msg = conversation.create_user_message("什么是 Dapr？")
alpha2_input = conversation.ConversationInputAlpha2(messages=[user_msg])

with DaprClient() as client:
    resp = client.converse_alpha2(
        name="echo",  # 替换为你的 LLM 组件名称
        inputs=[alpha2_input],
        temperature=1,
    )

    for msg in resp.to_assistant_messages():
        if msg.of_assistant.content:
            print(msg.of_assistant.content[0].text)
```

要点：
- 使用 `conversation.create_user_message` 构造消息。
- 将其包进 `ConversationInputAlpha2(messages=[...])`，再传给 `converse_alpha2`。
- 使用 `response.to_assistant_messages()` 遍历 assistant 输出。

## 工具：基于装饰器（推荐）

基于装饰器的工具方式更整洁、也更顺手。定义函数时应写清晰的类型提示与详细 docstring；这对 LLM 理解何时以及如何调用该工具很重要；
然后使用 `@conversation.tool` 进行装饰。注册后的工具可以传给 LLM，并通过工具调用来执行。

```python
from dapr.clients import DaprClient
from dapr.clients.grpc import conversation

@conversation.tool
def get_weather(location: str, unit: str = 'fahrenheit') -> str:
    """获取指定地点的当前天气。"""
    # 请替换为真实实现
    return f"Weather in {location} (unit={unit})"

user_msg = conversation.create_user_message("巴黎的天气怎么样？")
alpha2_input = conversation.ConversationInputAlpha2(messages=[user_msg])

with DaprClient() as client:
    response = client.converse_alpha2(
        name="openai",  # 你的 LLM 组件
        inputs=[alpha2_input],
        tools=conversation.get_registered_tools(),  # 由 @conversation.tool 注册的工具
        tool_choice='auto',
        temperature=1,
    )

    # 检查 assistant 消息，包括其中的工具调用
    for msg in response.to_assistant_messages():
        if msg.of_assistant.tool_calls:
            for tc in msg.of_assistant.tool_calls:
                print(f"Tool call: {tc.function.name} args={tc.function.arguments}")
        elif msg.of_assistant.content:
            print(msg.of_assistant.content[0].text)
```

说明：
- 使用 `conversation.get_registered_tools()` 收集所有通过 `@conversation.tool` 装饰的函数。
- 绑定器会依据函数签名校验并强制转换参数。类型注解要准确。

## 使用工具的最小多轮流程

这是处理带工具对话时最常用的循环：

{{% alert title="警告" color="warning" %}}
不要在不信任所有已注册工具的情况下，盲目自动执行 LLM 返回的工具调用。工具名和参数都应视为不可信输入。
- 请校验输入并施加防护（工具白名单、参数 schema、副作用约束）。
- 对异步或 I/O 密集型工具，优先使用 `conversation.execute_registered_tool_async(..., timeout=...)`，并设置保守的超时时间。
- 在敏感场景中，考虑在执行前增加策略层或用户确认步骤。
- 记录并监控工具使用；当校验失败时应默认拒绝执行。
{{% /alert %}}

```python
from dapr.clients import DaprClient
from dapr.clients.grpc import conversation

@conversation.tool
def get_weather(location: str, unit: str = 'fahrenheit') -> str:
    return f"Weather in {location} (unit={unit})"

history: list[conversation.ConversationMessage] = [
    conversation.create_user_message("旧金山的天气怎么样？")]

with DaprClient() as client:
    # 第 1 轮
    resp1 = client.converse_alpha2(
        name="openai",
        inputs=[conversation.ConversationInputAlpha2(messages=history)],
        tools=conversation.get_registered_tools(),
        tool_choice='auto',
        temperature=1,
    )

    # 追加 assistant 消息；执行工具调用；再追加工具结果
    for msg in resp1.to_assistant_messages():
        history.append(msg)
        for tc in msg.of_assistant.tool_calls:
            # 重要：生产环境中必须校验输入并施加防护
            tool_output = conversation.execute_registered_tool(
                tc.function.name, tc.function.arguments
            )
            history.append(
                conversation.create_tool_message(
                    tool_id=tc.id, name=tc.function.name, content=str(tool_output)
                )
            )

    # 第 2 轮（LLM 会看到工具结果）
    history.append(conversation.create_user_message("我需要带伞吗？"))
    resp2 = client.converse_alpha2(
        name="openai",
        inputs=[conversation.ConversationInputAlpha2(messages=history)],
        tools=conversation.get_registered_tools(),
        temperature=1,
    )

    for msg in resp2.to_assistant_messages():
        history.append(msg)
        if not msg.of_assistant.tool_calls and msg.of_assistant.content:
            print(msg.of_assistant.content[0].text)
```

提示：
- 始终把 assistant 消息追加到 history。
- 执行每个工具调用时，都要先校验，再把工具输出作为 tool message 追加进去。
- 下一轮请求会带上这些工具结果，LLM 才能基于它们继续推理。

## 将函数用作工具：其他方式

当装饰器方式不方便时，还有两种选择。

A）从带类型的函数自动生成 schema：

```python
from enum import Enum
from dapr.clients.grpc import conversation

class Units(Enum):
    CELSIUS = 'celsius'
    FAHRENHEIT = 'fahrenheit'

def get_weather(location: str, unit: Units = Units.FAHRENHEIT) -> str:
    return f"Weather in {location}"

fn = conversation.ConversationToolsFunction.from_function(get_weather)
weather_tool = conversation.ConversationTools(function=fn)
```

B）手写 JSON Schema（兜底方式）：

```python
from dapr.clients.grpc import conversation

fn = conversation.ConversationToolsFunction(
    name='get_weather',
    description='Get current weather',
    parameters={
        'type': 'object',
        'properties': {
            'location': {'type': 'string'},
            'unit': {'type': 'string', 'enum': ['celsius', 'fahrenheit']},
        },
        'required': ['location'],
    },
)
weather_tool = conversation.ConversationTools(function=fn)
```

## 异步变体

按需使用异步客户端与异步工具执行辅助方法。

```python
import asyncio
from dapr.aio.clients import DaprClient as AsyncDaprClient
from dapr.clients.grpc import conversation

@conversation.tool
def get_time() -> str:
    return '2025-01-01T12:00:00Z'

async def main():
    async with AsyncDaprClient() as client:
        msg = conversation.create_user_message('现在几点？')
        inp = conversation.ConversationInputAlpha2(messages=[msg])
        resp = await client.converse_alpha2(
            name='openai', inputs=[inp], tools=conversation.get_registered_tools()
        )
        for m in resp.to_assistant_messages():
            if m.of_assistant.content:
                print(m.of_assistant.content[0].text)

asyncio.run(main())
```

如果你需要异步执行工具（例如网络 I/O），请实现异步函数，并结合超时参数使用 `conversation.execute_registered_tool_async`。

## 安全与验证（必读）

LLM 可能会建议调用工具。所有由模型提供的参数都必须视为不可信输入。

建议：
- 仅将可信函数注册为工具。为清晰性与自动 schema 生成，优先使用 `@conversation.tool` 装饰器。
- 使用精确的类型注解和 docstring。SDK 会把函数签名转换成 JSON schema，并在参数绑定时执行类型强制转换，同时拒绝意外或无效字段。
- 对可能产生副作用的工具（文件系统、网络、子进程）添加防护。可考虑白名单、沙箱和配额限制。
- 执行前校验参数。例如清理文件路径，或限制 URL / 域名范围。
- 考虑超时和并发控制。对于异步工具，可向 `execute_registered_tool_async(..., timeout=...)` 传入超时。
- 记录并监控工具使用。默认拒绝：若校验失败，就不要执行工具，并以安全方式告知用户。

另请参阅 `dapr/clients/grpc/conversation.py` 中的内联说明（如 `tool()`、`ConversationTools`、`execute_registered_tool`），了解参数绑定与错误处理细节。


## 关键辅助方法（速查）

本节汇总了示例中使用到的 `dapr.clients.grpc.conversation` 辅助工具。

- create_user_message(text: str) -> ConversationMessage
  - 为 Alpha2 构建 user 角色消息。可用于 history 列表。
  - 示例：`history.append(conversation.create_user_message("Hello"))`

- create_system_message(text: str) -> ConversationMessage
  - 构建 system 消息，用于约束 assistant 的行为。
  - 示例：`history = [conversation.create_system_message("You are a concise assistant.")]`

- create_assistant_message(text: str) -> ConversationMessage
  - 适合在测试或受控流程中注入 assistant 文本。

- create_tool_message(tool_id: str, name: str, content: Any) -> ConversationMessage
  - 将工具输出转换为下一轮可供 LLM 读取的 tool message。
  - content 可以是任意对象；SDK 会安全地将其转为字符串。
  - 示例：`history.append(conversation.create_tool_message(tool_id=tc.id, name=tc.function.name, content=conversation.execute_registered_tool(tc.function.name, tc.function.arguments)))`

- get_registered_tools() -> list[ConversationTools]
  - 返回当前进程内注册表中的全部工具。
  - 包括以下方式创建的工具：
    - `@conversation.tool` 装饰器（默认自动注册），以及
    - `ConversationToolsFunction.from_function` 且 `register=True`（默认）。
  - 在 `converse_alpha2(..., tools=...)` 中传入该列表。

- register_tool(name: str, t: ConversationTools) / unregister_tool(name: str)
  - 手动管理工具注册表（例如高级场景、测试、清理）。
  - 名称必须唯一；在长生命周期进程中，记得注销以避免冲突。

- execute_registered_tool(name: str, params: Mapping|Sequence|str|None) -> Any
  - 按名称同步执行已注册工具。
  - params 可接受 kwargs（mapping）、args（sequence）、JSON 字符串或 None。若传入 JSON 字符串（LLM 常见返回形式），SDK 会自动解析。
  - 参数会依据函数签名或 schema 进行校验与强制转换；多余或无效字段会直接报错。
  - 安全性：params 必须视为不可信输入；对副作用操作要加防护。

- execute_registered_tool_async(name: str, params: Mapping|Sequence|str|None, *, timeout: float|None=None) -> Any
  - 异步版本。支持超时；对 I/O 密集型工具尤其建议使用。
  - 适用于异步工具，或配合 aio 客户端使用。

- ConversationToolsFunction.from_function(func: Callable, register: bool = True) -> ConversationToolsFunction
  - 从带类型的 Python 函数（注解 + 可选 docstring）推导 JSON schema，并可选择直接注册为工具。
  - 常见用法：`spec = conversation.ConversationToolsFunction.from_function(my_func)`；随后可依赖自动注册，也可用 `ConversationTools(function=spec)` 包装后调用 `register_tool(spec.name, tool)`，或直接把 `[tool]` 传给 `tools=`。

- ConversationResponseAlpha2.to_assistant_messages() -> list[ConversationMessage]
  - 便捷方法，用于把响应输出转换为 assistant 的 `ConversationMessage` 对象，便于直接追加到 history（包括存在的 `tool_calls`）。

提示：`@conversation.tool` 装饰器是创建工具最简单的方式。它会根据函数自动生成 schema，支持可选的命名空间或名称覆盖，并自动注册工具（若想延后注册，可设置 `register=False`）。
