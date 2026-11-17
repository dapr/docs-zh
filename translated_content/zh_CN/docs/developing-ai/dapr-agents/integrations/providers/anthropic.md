---
type: docs
title: "Anthropic"
linkTitle: "Anthropic"
weight: 20
description: "在 Dapr Agents 中使用 Anthropic Claude 模型"
---

`AnthropicChatClient` 通过官方的 Anthropic Python SDK 和 Messages API，将 Dapr Agents 连接到 [Anthropic](https://www.anthropic.com/) 的 Claude 模型。你可以直接调用它，也可以把它作为 `DurableAgent` 的 `llm` 参数传入。

该客户端支持：
- 文本生成，支持 system、user、assistant 和 tool 消息
- 流式输出，可选 `on_chunk` 回调
- 图像输入
- 工具调用
- 使用 Pydantic 模型的结构化输出
- Prompty 文件

## 安装

Anthropic SDK 已包含在 `dapr-agents` 包中，因此无需额外安装。

{{< tabpane text=true >}}

{{% tab header="pip" %}}

```bash
pip install dapr-agents
```

{{% /tab %}}

{{% tab header="uv" %}}

```bash
uv add dapr-agents
```

{{% /tab %}}

{{< /tabpane >}}

## 配置

当未设置对应的构造函数参数时，客户端会读取以下环境变量：

环境变量 | 构造函数参数 | 必填 | 详情
-------------------- | -------------------- | -------- | -------
`ANTHROPIC_API_KEY` | `api_key` | 是 | 用于向 Anthropic API 进行身份验证的 API 密钥。
`ANTHROPIC_MODEL` | `model` | 否 | 要使用的 Claude 模型。默认为 `claude-sonnet-4-6`。
`ANTHROPIC_BASE_URL` | `base_url` | 否 | 覆盖 API 的基础 URL，例如用于通过代理或兼容的端点转发请求。

客户端还接受 `timeout` 参数（单位为秒，或 `httpx.Timeout` 风格的字典），默认值为 `1500`。

```python
from dapr_agents import AnthropicChatClient

# 读取 ANTHROPIC_API_KEY，并可选读取 ANTHROPIC_MODEL 和 ANTHROPIC_BASE_URL
llm = AnthropicChatClient()

# 或者显式配置客户端
llm = AnthropicChatClient(model="claude-sonnet-4-6", timeout=60)
```

{{% alert title="注意" color="primary" %}}
Anthropic Messages API 要求每个请求都必须设置 `max_tokens`。除非你给 `generate(...)` 传入其他值，或在 Prompty 文件中进行了设置，否则客户端会发送 `max_tokens=4096`。
{{% /alert %}}

## 用法

### 直接调用大型语言模型 (LLM)

`generate(...)` 接受字符串、消息字典、消息对象或消息列表，并返回一个 `LLMChatResponse`：

```python
from dapr_agents import AnthropicChatClient
from dapr_agents.types import UserMessage

llm = AnthropicChatClient()

response = llm.generate("Name a famous dog!")
print(response.get_message().content)

response = llm.generate([UserMessage("Tell me a joke about dogs.")])
print(response.get_message().content)
```

系统消息会自动移入 Messages API 的顶层 `system` 参数。`generate(...)` 自身不处理的关键字参数会原样传递给 Anthropic Messages API，因此你可以使用 `temperature`、`top_k`、`stop_sequences` 或 `thinking` 等选项：

```python
response = llm.generate(
    "What is 27 * 453?",
    max_tokens=2048,
    thinking={"type": "enabled", "budget_tokens": 1024},
)
```

### 与 Durable Agent 配合使用

把客户端作为代理的 `llm` 传入：

```python
from dapr_agents import AnthropicChatClient, DurableAgent, tool
from dapr_agents.agents.configs import AgentMemoryConfig, AgentStateConfig
from dapr_agents.memory import ConversationDaprStateMemory
from dapr_agents.storage.daprstores.stateservice import StateStoreService
from dapr_agents.workflow.runners import AgentRunner


@tool
def get_weather(location: str) -> str:
    """Get the current weather for a location."""
    return f"{location}: 72F and sunny."


def main() -> None:
    weather_agent = DurableAgent(
        name="WeatherAgent",
        role="Weather Assistant",
        instructions=["Help users with weather information"],
        tools=[get_weather],
        llm=AnthropicChatClient(),
        memory=AgentMemoryConfig(
            store=ConversationDaprStateMemory(store_name="agent-memory")
        ),
        state=AgentStateConfig(
            store=StateStoreService(store_name="agent-workflow"),
        ),
    )

    runner = AgentRunner()
    try:
        runner.serve(weather_agent, port=8001)
    finally:
        runner.shutdown()


if __name__ == "__main__":
    main()
```

代理会为你把其工具，以及对话历史中的工具结果，转换为 Anthropic 的 `tool_use` 和 `tool_result` 格式。

### 流式输出

传入 `stream=True`，即可接收 `LLMChatResponseChunk` 对象的迭代器，而不是完整的响应：

```python
from dapr_agents import AnthropicChatClient

llm = AnthropicChatClient()

for chunk in llm.generate("Name a famous dog!", stream=True):
    if chunk.result.content:
        print(chunk.result.content, end="", flush=True)
print()
```

你还可以传入 `on_chunk` 回调。迭代器每产出一个 `LLMChatResponseChunk`，该回调就会被调用一次。当其他代码在消费流的同时，你需要把 token 转发到 UI 或日志中，这一点就很有用：

```python
from dapr_agents.types.message import LLMChatResponseChunk


def forward(chunk: LLMChatResponseChunk) -> None:
    if chunk.result.content:
        print(chunk.result.content, end="", flush=True)


stream = llm.generate("Write a haiku about durable workflows.", stream=True, on_chunk=forward)
for _ in stream:
    pass  # 请求随迭代器被消费而执行
```

`on_chunk` 仅在 `stream=True` 时生效，并且只有在返回的迭代器被消费时才会触发。流中会产生三种块：

- 文本块，新文本位于 `chunk.result.content` 中
- 工具调用块，包含工具调用 ID 和名称，随后是部分 JSON 参数，位于 `chunk.result.tool_calls` 中
- 最后一个块，其 `chunk.result.finish_reason` 被设置为 Anthropic 的停止原因，例如 `"end_turn"` 或 `"tool_use"`

每个块的 `metadata` 都带有 `provider`、响应 `id`、`model`，以及 API 报告的最新 `usage`。启用扩展思考后，思考文本与签名会被收集到 metadata 的 `thinking_blocks`、`thinking_deltas` 和 `thinking_signatures` 中，而不会作为内容输出。

### 图像输入

使用 OpenAI 风格的 `image_url` 内容块发送图像。客户端会把它们转换为 Anthropic 的图像块。HTTP(S) URL 与 base64 数据 URI 均受支持：

```python
import base64

from dapr_agents import AnthropicChatClient

llm = AnthropicChatClient()

with open("chart.png", "rb") as f:
    image_b64 = base64.b64encode(f.read()).decode()

response = llm.generate(
    [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Compare these two images."},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{image_b64}"},
                },
                {
                    "type": "image_url",
                    "image_url": {"url": "https://example.com/photo.jpg"},
                },
            ],
        }
    ]
)
print(response.get_message().content)
```

数据 URI 必须使用 base64 编码，并且其媒体类型必须是 Anthropic 接受的类型之一：`image/jpeg`、`image/png`、`image/gif` 或 `image/webp`。不符合这些要求的块会被记录为警告，并原样发送。已经是 Anthropic 原生格式的内容块会原样透传。

### 工具调用

在 `tools` 中传入 `AgentTool` 对象（例如用 `@tool` 装饰的函数）。它们会被转换为 Anthropic 的 `{name, description, input_schema}` 工具格式。响应中的所有工具调用都会以标准 `tool_calls` 的形式返回在助手消息上：

```python
from dapr_agents import AnthropicChatClient, tool


@tool
def get_weather(location: str) -> str:
    """Get the current weather for a location."""
    return f"{location}: 72F and sunny."


llm = AnthropicChatClient()
response = llm.generate("What's the weather in Paris?", tools=[get_weather])

for tool_call in response.get_message().tool_calls or []:
    print(tool_call.function.name, tool_call.function.arguments)
```

`tool_choice` 既可以接受 `"auto"`、`"any"` 或 `"none"` 这样的字符串，也可以接受 `{"type": "tool", "name": "get_weather"}` 这样的 Anthropic 工具选择对象。以字典形式传入的工具必须已经使用 Anthropic 的工具格式。OpenAI 风格的 `{"type": "function", "function": {...}}` 字典不会被转换：对于这类字典，`generate()` 会抛出 `ValueError`。字典必须包含 `name`、`description` 和 `input_schema`；其他键（例如 `cache_control`）会被丢弃。

### 结构化输出

传入 Pydantic 模型作为 `response_format`，即可获得经过验证的实例：

```python
from pydantic import BaseModel

from dapr_agents import AnthropicChatClient


class Contact(BaseModel):
    name: str
    email: str
    demo_requested: bool


llm = AnthropicChatClient()
contact = llm.generate(
    "Extract: John Smith (john@example.com) wants a demo on Tuesday.",
    response_format=Contact,
)
print(contact.model_dump())
```

`structured_mode` 用于选择如何强制执行 schema：

模式 | 详情
---- | -------
`"json"`（默认） | 使用 Anthropic 原生的 JSON schema 输出，可将模型约束为合法的 JSON。需要模型支持结构化输出。客户端会先检查模型的能力；如果模型不支持，则会抛出错误，并建议改用 `"function_call"`。
`"function_call"` | 强制进行一次工具调用，其输入与 schema 匹配。适用于较旧的 Claude 模型。

传入 `response_format=list[Contact]` 会返回一个生成的包装模型，其 `objects` 字段包含解析后的列表。如果你把 `response_format` 与 `stream=True` 组合使用，请求仍会受到约束，但返回的是块迭代器，你必须自行缓冲并解析 JSON。

{{% alert title="注意" color="primary" %}}
当 `DurableAgent` 在内部请求结构化输出时（例如在基于 LLM 的编排中），它会使用默认的 `"json"` 模式。对于这些代理，请使用支持结构化输出的 Claude 模型。
{{% /alert %}}

### Prompty

将 Prompty 配置的 `type` 设置为 `anthropic`，并使用 `AnthropicChatClient.from_prompty(...)` 加载该文件：

```yaml
---
name: Claude Assistant
model:
  api: chat
  configuration:
    type: anthropic
    name: claude-sonnet-4-6
  parameters:
    max_tokens: 1024
    temperature: 0.7
inputs:
  question:
    type: string
---
system:
You are a helpful assistant.

user:
{{question}}
```

```python
from dapr_agents import AnthropicChatClient

llm = AnthropicChatClient.from_prompty("assistant.prompty")
response = llm.generate(input_data={"question": "What is Dapr?"})
print(response.get_message().content)
```

## 示例

关于可运行的文本补全与流式输出示例，请参阅 Dapr Agents 仓库中的 [`01-llm-call-anthropic`](https://github.com/dapr/dapr-agents/tree/main/examples/01-llm-call-anthropic) 示例。
