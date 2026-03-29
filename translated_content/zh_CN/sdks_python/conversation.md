---
title: "Conversation API (Python)——推荐用法"
linkTitle: "Conversation"
weight: 11000
type: docs
description: 在 Python 中使用 Dapr Conversation API 的推荐模式，涵盖不使用工具和使用工具的场景，包括多轮对话流程和安全指导。
---

Dapr Conversation API 目前处于 Alpha 阶段。本页介绍使用 Python SDK 高效调用该 API 的推荐、最小化模式：
- 普通请求（不使用工具）
- 带工具的请求（函数作为工具）
- 带工具执行的多轮对话流程
- 异步变体
- 执行工具调用的重要安全说明

## 前置条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- 已安装 [Python 3.9+](https://www.python.org/downloads/)
- 已安装 [Dapr Python 包]({{% ref "python#installation" %}})
- 在你的 Dapr 环境中配置了 LLM 组件（例如 OpenAI 或 Azure OpenAI）

如需完整的端到端流程和提供商设置，请参阅：
- Conversation 下的 SDK 示例：
  - [TOOL-CALL-QUICKSTART.md](https://github.com/dapr/python-sdk/blob/main/examples/conversation/TOOL-CALL-QUICKSTART.md)
  - [real_llm_providers_example.py](https://github.com/dapr/python-sdk/blob/main/examples/conversation/real_llm_providers_example.py)

## 普通对话（不使用工具）

```python
from dapr.clients import DaprClient
from dapr.clients.grpc import conversation

# 构建单轮 Alpha2 输入
user_msg = conversation.create_user_message("What's Dapr?")
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
- 使用 `conversation.create_user_message` 构建消息。
- 封装为 `ConversationInputAlpha2(messages=[...])` 并传递给 `converse_alpha2`。
- 使用 `response.to_assistant_messages()` 遍历助手输出。

## 工具：基于装饰器（推荐）

基于装饰器的工具提供了一种简洁、符合习惯的方式。定义一个函数，编写清晰的类型提示和详细的文档字符串，这对于 LLM 理解如何或何时调用工具非常重要；然后用 `@conversation.tool` 装饰它。注册的工具可以传递给 LLM，并通过工具调用进行调用。

```python
from dapr.clients import DaprClient
from dapr.clients.grpc import conversation

@conversation.tool
def get_weather(location: str, unit: str = 'fahrenheit') -> str:
    """获取某地的当前天气。"""
    # 替换为真实实现
    return f"Weather in {location} (unit={unit})"

user_msg = conversation.create_user_message("What's the weather in Paris?")
alpha2_input = conversation.ConversationInputAlpha2(messages=[user_msg])

with DaprClient() as client:
    response = client.converse_alpha2(
        name="openai",  # 你的 LLM 组件
        inputs=[alpha2_input],
        tools=conversation.get_registered_tools(),  # 通过 @conversation.tool 注册的工具
        tool_choice='auto',
        temperature=1,
    )

    # 检查助手消息，包括任何工具调用
    for msg in response.to_assistant_messages():
        if msg.of_assistant.tool_calls:
            for tc in msg.of_assistant.tool_calls:
                print(f"Tool call: {tc.function.name} args={tc.function.arguments}")
        elif msg.of_assistant.content:
            print(msg.of_assistant.content[0].text)
```

说明：
- 使用 `conversation.get_registered_tools()` 收集所有 `@conversation.tool` 装饰的函数。
- 绑定器使用函数签名对参数进行验证/强制转换。保持注解准确。

## 最小的多轮对话（带工具）

这是使用工具的对话的标准循环：

{{% alert title="Warning" color="warning" %}}
不要盲目自动执行 LLM 返回的工具调用，除非你信任所有已注册的工具。将工具名称和参数视为不受信任的输入。
- 验证输入并执行防护措施（允许列表工具、参数模式、副作用约束）。
- 对于异步或 I/O 密集型工具，优先使用 `conversation.execute_registered_tool_async(..., timeout=...)` 并设置保守的超时时间。
- 在敏感上下文中，考虑在执行前添加策略层或用户确认步骤。
- 记录并监控工具使用情况；验证失败时执行安全关闭。
{{% /alert %}}

```python
from dapr.clients import DaprClient
from dapr.clients.grpc import conversation

@conversation.tool
def get_weather(location: str, unit: str = 'fahrenheit') -> str:
    return f"Weather in {location} (unit={unit})"

history: list[conversation.ConversationMessage] = [
    conversation.create_user_message("What's the weather in San Francisco?")]

with DaprClient() as client:
    # 第 1 轮
    resp1 = client.converse_alpha2(
        name="openai",
        inputs=[conversation.ConversationInputAlpha2(messages=history)],
        tools=conversation.get_registered_tools(),
        tool_choice='auto',
        temperature=1,
    )

    # 追加助手消息；执行工具调用；追加工具结果
    for msg in resp1.to_assistant_messages():
        history.append(msg)
        for tc in msg.of_assistant.tool_calls:
            # 重要：在生产环境中验证输入并执行防护措施
            tool_output = conversation.execute_registered_tool(
                tc.function.name, tc.function.arguments
            )
            history.append(
                conversation.create_tool_message(
                    tool_id=tc.id, name=tc.function.name, content=str(tool_output)
                )
            )

    # 第 2 轮（LLM 看到工具结果）
    history.append(conversation.create_user_message("Should I bring an umbrella?"))
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
- 始终将助手消息追加到历史记录中。
- 执行每个工具调用（带验证）并追加包含工具输出的工具消息。
- 下一轮将包含这些工具结果，以便 LLM 可以据此进行推理。

## 函数作为工具：替代方案

当装饰器不适用时，有两种选择。

A) 从类型化函数自动生成模式：

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

B) 手动 JSON Schema（后备方案）：

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

根据需要使用异步客户端和异步工具执行辅助函数。

```python
import asyncio
from dapr.aio.clients import DaprClient as AsyncDaprClient
from dapr.clients.grpc import conversation

@conversation.tool
def get_time() -> str:
    return '2025-01-01T12:00:00Z'

async def main():
    async with AsyncDaprClient() as client:
        msg = conversation.create_user_message('What time is it?')
        inp = conversation.ConversationInputAlpha2(messages=[msg])
        resp = await client.converse_alpha2(
            name='openai', inputs=[inp], tools=conversation.get_registered_tools()
        )
        for m in resp.to_assistant_messages():
            if m.of_assistant.content:
                print(m.of_assistant.content[0].text)

asyncio.run(main())
```

如果需要异步执行工具（例如网络 I/O），实现异步函数并使用带超时设置的 `conversation.execute_registered_tool_async`。

## 安全与验证（必读）

LLM 可能建议工具调用。将所有模型提供的参数视为不受信任的输入。

建议：
- 仅将可信函数注册为工具。优先使用 `@conversation.tool` 装饰器，以获得清晰度和自动模式生成。
- 使用精确的类型注解和文档字符串。SDK 将函数签名转换为 JSON 模式，并通过类型强制转换和拒绝意外/无效字段来绑定参数。
- 为可能产生副作用的工具（文件系统、网络、子进程）添加防护措施。考虑允许列表、沙箱和限制。
- 在执行前验证参数。例如，清理文件路径或限制 URL/域名。
- 考虑超时和并发控制。对于异步工具，向 `execute_registered_tool_async(..., timeout=...)` 传递超时时间。
- 记录并监控工具使用情况。安全关闭：如果验证失败，避免执行工具并安全地通知用户。

另请参阅 `dapr/clients/grpc/conversation.py` 中的内联说明（例如 `tool()`、`ConversationTools`、`execute_registered_tool`）以了解参数绑定和错误处理详细信息。


## 关键辅助方法（快速参考）

本节总结 dapr.clients.grpc.conversation 中可用的辅助工具，这些工具在示例中广泛使用。

- create_user_message(text: str) -> ConversationMessage
  - 为 Alpha2 构建用户角色消息。在历史记录列表中使用。
  - 示例：`history.append(conversation.create_user_message("Hello"))`

- create_system_message(text: str) -> ConversationMessage
  - 构建系统消息以引导助手行为。
  - 示例：`history = [conversation.create_system_message("You are a concise assistant.")]`

- create_assistant_message(text: str) -> ConversationMessage
  - 用于在测试或受控流程中注入助手文本。

- create_tool_message(tool_id: str, name: str, content: Any) -> ConversationMessage
  - 将工具的输出转换为工具消息，LLM 可以在下一轮读取。
  - content 可以是任何对象；SDK 会安全地将其转换为字符串。
  - 示例：`history.append(conversation.create_tool_message(tool_id=tc.id, name=tc.function.name, content=conversation.execute_registered_tool(tc.function.name, tc.function.arguments)))`

- get_registered_tools() -> list[ConversationTools]
  - 返回当前在进程内注册表中注册的所有工具。
  - 包括通过以下方式创建的工具：
    - @conversation.tool 装饰器（默认自动注册），以及
    - ConversationToolsFunction.from_function 且 register=True（默认）。
  - 在 converse_alpha2(..., tools=...) 中传递此列表。

- register_tool(name: str, t: ConversationTools) / unregister_tool(name: str)
  - 手动管理工具注册表（例如高级场景、测试、清理）。
  - 名称必须唯一；在长期运行的进程中取消注册以避免冲突。

- execute_registered_tool(name: str, params: Mapping|Sequence|str|None) -> Any
  - 按名称同步执行已注册的工具。
  - params 接受 kwargs（映射）、args（序列）、JSON 字符串或 None。如果提供 JSON 字符串（如 LLM 常见返回），SDK 会自动解析。
  - 参数会根据函数签名/模式进行验证和强制转换；意外或无效字段会引发错误。
  - 安全性：将 params 视为不受信任；为副作用添加防护措施。

- execute_registered_tool_async(name: str, params: Mapping|Sequence|str|None, *, timeout: float|None=None) -> Any
  - 异步版本。支持超时，这对于 I/O 密集型工具是推荐的。
  - 对于异步工具或使用 aio 客户端时，优先使用此方法。

- ConversationToolsFunction.from_function(func: Callable, register: bool = True) -> ConversationToolsFunction
  - 从类型化的 Python 函数（注解 + 可选文档字符串）派生 JSON 模式，并可选择注册工具。
  - 典型用法：`spec = conversation.ConversationToolsFunction.from_function(my_func)`；然后可以依赖自动注册，或用 `ConversationTools(function=spec)` 包装并调用 `register_tool(spec.name, tool)`，或将 `[tool]` 直接传递给 `tools=`。

- ConversationResponseAlpha2.to_assistant_messages() -> list[ConversationMessage]
  - 便捷方法，将响应输出转换为助手 ConversationMessage 对象，你可以直接追加到历史记录中（包括 tool_calls，如果存在）。

提示：@conversation.tool 装饰器是创建工具的最简单方法。它会根据函数自动生成模式，允许可选的命名空间/名称覆盖，并自动注册工具（你可以设置 register=False 来延迟注册）。
