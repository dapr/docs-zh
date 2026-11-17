---
type: docs
title: "代理执行器"
linkTitle: "代理执行器"
weight: 57
description: "在 DurableAgent 内运行有状态的代理运行时（例如 Claude Agent SDK）"
aliases:
  - /zh-hans/developing-applications/dapr-agents/dapr-agents-executors
---

一个**代理执行器**（agent executor）让 `DurableAgent` 把整个推理循环交给外部的代理运行时，例如 [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview)。Dapr Agents 仍然负责循环之外的部分：持久化的 workflow、通过 pub/sub 或 HTTP 触发、状态、人工审批、流式输出和追踪。

## 执行器与大型语言模型 (LLM) 客户端

`DurableAgent` 的智能来自两种来源之一。你只能传入其中一种；同时传入两者会抛出错误。

| | `llm=`（聊天客户端） | `executor=`（代理执行器） |
|---|---|---|
| 基类 | `ChatClientBase` | `AgentExecutorBase` |
| 作用 | 对一组消息返回一次补全结果 | 运行一整个代理轮次：推理、调用工具，并循环直到得出答案 |
| 循环由谁掌控 | `DurableAgent`，每次 LLM 调用和每次工具调用各对应一个 workflow activity | 执行器，在单个 `run_executor` workflow activity 内部完成 |
| 对话状态由谁掌控 | Dapr Agents 的记忆 | 执行器的会话，由 `session_id` 标识 |
| 示例 | `DaprChatClient`、`OpenAIChatClient`、`AnthropicChatClient` | `EchoAgentExecutor`、`ClaudeAgentExecutor` |

当你希望使用一个已有的代理运行时（它自带工具、规划和上下文处理），同时仍希望它在 Dapr 下持久运行时，就选择执行器。当你希望由 Dapr Agents 控制每一步时，就选择 LLM 客户端。

## 执行器的运行方式

当带有执行器的 `DurableAgent` 被触发时，其 workflow 会调用一个 activity `run_executor`。该 activity 调用 `executor.run(task, session_id=..., context=...)`，并读取其产生的 `AgentEvent` 值流：

| 事件类型 | 内容 | `DurableAgent` 的处理方式 |
|---|---|---|
| `text_delta` | 一段助手文本 | 若本次运行为流式，则将其发布到流中 |
| `message` | 一条完整的助手消息 | 将其添加到代理的消息历史中 |
| `tool_call` | `{id, name, arguments}` | 记录到工具历史中 |
| `tool_result` | `{tool_call_id, result}` | 将结果记录到匹配的调用上 |
| `session` | 来自执行器的检查点 | 保存 workflow 状态，包括 `session_id` |
| `complete` | 最终的助手消息 | 结束运行，并将该消息作为结果返回 |
| `error` | 错误消息 | 以 `AgentError` 使运行失败 |
| `paused` | 等待审批的工具调用 | 发起人工审批，然后恢复运行（参见[人工审批](#工具调用的人工审批)） |

流总是恰好以一个 `complete`、`error` 或 `paused` 事件结束。`session_id` 保存在 workflow 条目上，因此被重试的 activity 会延续同一个会话。

事件类型和辅助函数位于 `dapr_agents.agents.executors` 中，同时也从 `dapr_agents` 导出：

```python
from dapr_agents import AgentEvent, AgentExecutorBase, ToolCallDecision
```

## 最简执行器：`EchoAgentExecutor`

`EchoAgentExecutor` 不需要 LLM，也不需要 API 密钥。它会以 `text_delta`、`message`、`session` 和 `complete` 事件把提示词原样返回。用它来体验执行器的流程，或将其复制为你自己执行器的起点。

```python
from dapr_agents import DurableAgent, EchoAgentExecutor
from dapr_agents.workflow.runners import AgentRunner


async def main() -> None:
    agent = DurableAgent(
        name="Echo",
        role="Echo Assistant",
        goal="Repeat user input through the AgentExecutorBase event stream.",
        executor=EchoAgentExecutor(chunk_size=8),
    )

    runner = AgentRunner()
    try:
        result = await runner.run(agent, payload={"task": "hello, agent executor"})
        print(result)
    finally:
        runner.shutdown(agent)
```

完整示例见 [`examples/10-agent-executor-echo`](https://github.com/dapr/dapr-agents/tree/main/examples/10-agent-executor-echo)。

### 编写你自己的执行器

继承 `AgentExecutorBase` 并实现两个方法：

- `async def run(self, prompt, *, session_id=None, context=None)`：一个异步生成器，产生 `AgentEvent` 值，并以 `complete` 或 `error` 事件结束。失败时应以 `error` 事件报告，而不是抛出异常。
- `async def get_session(self, session_id)`：返回会话的已保存状态；如果会话未知，则返回 `None`。

只有当你的执行器能够以 `paused` 事件结束一次运行，并能从 `context["tool_decisions"]` 恢复该运行时，才设置类属性 `supports_tool_approval = True`。

## Claude Agent SDK 执行器

`ClaudeAgentExecutor` 在 `DurableAgent` 内运行 [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview) 的代理循环（即 Claude Code 背后的循环）。

### 安装

该执行器需要可选的 `claude` 额外依赖：

```bash
pip install "dapr-agents[claude]"
```

不安装该额外依赖时，`import dapr_agents` 也能正常工作。只有访问 `ClaudeAgentExecutor` 时才会加载 SDK；若未安装额外依赖，则会抛出 `ImportError`，并告诉你需要安装哪个包。

{{% alert title="安装包大小" color="warning" %}}
`claude-agent-sdk` 的 wheel 包含 Claude Code CLI，因此每个 wheel 约 100 MB。已为 macOS（arm64 和 x86_64）、基于 glibc 的 Linux（x86_64 和 aarch64）以及 Windows（x86_64）发布 wheel。没有适用于 musl Linux 的 wheel：在基于 Alpine 的镜像上，需要自行把 `claude` CLI 安装到 `PATH` 中，或设置 `cli_path` 指向它。不需要 Node.js。
{{% /alert %}}

### 认证

CLI 通过环境变量 `ANTHROPIC_API_KEY` 或 `CLAUDE_CODE_OAUTH_TOKEN` 进行认证。在开发者机器上，它也可以使用已安装的 `claude` CLI 的登录状态。在容器和 Kubernetes Pod 中，请通过 `env` 传入凭据，并从机密中加载：

```python
import os

from dapr_agents import ClaudeAgentExecutorConfig

config = ClaudeAgentExecutorConfig(
    env={"ANTHROPIC_API_KEY": os.environ["ANTHROPIC_API_KEY"]},
)
```

### 创建 Claude 代理

```python
from dapr_agents import (
    ClaudeAgentExecutor,
    ClaudeAgentExecutorConfig,
    DurableAgent,
    tool,
)
from dapr_agents.workflow.runners import AgentRunner


@tool
def get_weather(city: str) -> str:
    """Get the current weather for a city."""
    return f"It is sunny in {city}."


executor = ClaudeAgentExecutor(
    ClaudeAgentExecutorConfig(model="claude-sonnet-4-5")
)

agent = DurableAgent(
    name="WeatherClaude",
    role="Weather Assistant",
    goal="Answer weather questions",
    instructions=["Be concise."],
    executor=executor,
    tools=[get_weather],
)


async def main() -> None:
    runner = AgentRunner()
    try:
        result = await runner.run(agent, payload={"task": "What's the weather in Paris?"})
        print(result)
    finally:
        runner.shutdown(agent)
```

以与其他 `DurableAgent` 相同的方式托管该代理：`runner.run(...)`、`runner.subscribe(...)` 或 `runner.serve(...)`。

#### 代理传递给执行器的内容

在每次运行前，`DurableAgent` 都会将执行器绑定到代理自身的配置上，因此你可以像平常一样在代理上配置工具、提示词和钩子：

| 代理设置 | Claude 设置 |
|---|---|
| 渲染后的系统提示词（`role`、`goal`、`instructions` 或 `system_prompt`） | `system_prompt` |
| `AgentExecutionConfig.max_iterations` | `max_turns` |
| `tools`，包括以代理作为工具和 Dapr `MCPServer` 工具 | 进程内 MCP 服务器上的工具（参见[工具与 MCP 服务器](#工具与-mcp-服务器)） |
| `hooks.before_tool_call` | `before_tool_call`（参见[人工审批](#工具调用的人工审批)） |
| `state`（`AgentStateConfig.store`） | 以 `session_store` 形式传入的 `DaprSessionStore`（参见[持久化会话](#持久化会话)） |

在 `ClaudeAgentExecutorConfig` 中显式设置的值优先于代理的值。配置中设置的工具和钩子会与代理的工具和钩子一同使用；若配置中已有同名工具，则跳过该工具。代理的工具会在每次运行时重新绑定，因此之后加载的工具也会包含在内。

以代理作为工具和 Dapr `MCPServer` 工具通常从 workflow 主体中调度 child workflow。对于执行器，它们则在 `run_executor` activity 内部运行：该 activity 通过 Workflow Client 启动同样的 child workflow 并等待其完成。被重试的 activity 会附加到更早一次尝试所启动的 child workflow 上。位于其他 Dapr 应用（`target_app_id`）中的代理以及 `ask_user` 不会提供给执行器。其他会在另一个应用中启动 child workflow 的工具（例如来自 `make_mcp_gateway_via_child_workflow_tool` 的工具）在被调用时会向 Claude 返回错误，因为 Workflow Client 只能在代理自己的应用中启动 workflow。

### 配置

所有设置都位于不可变数据类 `ClaudeAgentExecutorConfig` 中。每个字段都对应 SDK 的一个 `ClaudeAgentOptions` 设置。

| 字段 | 默认值 | 描述 |
|---|---|---|
| `model` | CLI 默认值 | Claude 模型 ID，例如 `"claude-sonnet-4-5"` |
| `system_prompt` | SDK 默认值 | 系统提示词字符串，或 SDK 的系统提示词预设字典 |
| `max_turns` | `None` | 每次运行的最大代理轮次 |
| `max_budget_usd` | `None` | 每次运行的花费上限（美元） |
| `permission_mode` | `None` | SDK 权限模式（`"default"`、`"acceptEdits"`、`"plan"`、`"bypassPermissions"`）。恢复运行时会再次发送该值，因为 CLI 不会从转录中恢复它 |
| `tools` | `()` | 要提供给 Claude 的 Dapr Agents 工具（参见[工具与 MCP 服务器](#工具与-mcp-服务器)） |
| `tool_server_name` | `"dapr"` | 承载 `tools` 的进程内 MCP 服务器名称 |
| `mcp_servers` | `{}` | 更多 MCP 服务器，以 SDK 配置字典形式给出（`stdio`、`sse`、`http` 或 `sdk`） |
| `builtin_tools` | `()` | 要启用的内置 Claude Code 工具，例如 `"Read"` 或 `"Bash"`。默认会全部关闭。`None` 保留 CLI 的默认集合 |
| `allowed_tools` | `()` | Claude 可以无需询问即可调用的更多工具名称，例如 `"mcp__github"` |
| `disallowed_tools` | `()` | Claude 绝不可以调用的工具名称 |
| `before_tool_call` | `()` | Dapr Agents 的 `before_tool_call` 钩子，应用于每一次工具调用（参见[人工审批](#工具调用的人工审批)） |
| `hooks` | `{}` | 原始 SDK 钩子，例如 `{"PreToolUse": [HookMatcher(...)]}`，与执行器自身的钩子一并添加 |
| `session_store` | `None` | SDK 的 `SessionStore`，用于保存每个会话转录的副本，例如 `DaprSessionStore`（参见[持久化会话](#持久化会话)） |
| `cwd` | 在 `DurableAgent` 中为每个代理使用的临时目录，否则为进程的工作目录 | CLI 的工作目录 |
| `env` | `{}` | 供 CLI 使用的额外环境变量，例如凭据 |
| `include_partial_messages` | `True` | 为流式输出的文本发出 `text_delta` 事件 |
| `setting_sources` | `()` | 要加载的 Claude 设置文件（`"user"`、`"project"`、`"local"`）。默认不加载任何文件，因此主机上的设置不会改变代理的运行 |
| `isolate_host_config` | `True` | 使主机用户的 Claude Code 上下文不进入代理运行：只使用此处配置的 MCP 服务器，并跳过 claude.ai 连接器、自动记忆以及 `CLAUDE.md` 文件（除非设置了 `setting_sources`）。若关闭，则以 claude.ai 账号登录的 CLI 可能会加载该账号的连接器，并且 `cwd` 所在 Git 仓库的记忆也会被加载。`env` 中的值会覆盖此设置 |
| `cli_path` | 随 SDK 打包的 CLI | 要使用的 `claude` 可执行文件路径，用于替代随附的版本 |
| `extra_options` | `{}` | 其他 `ClaudeAgentOptions` 参数，例如 `thinking`、`effort`、`agents` 或 `sandbox` |

执行器自己会设置部分选项，因此 `extra_options` 不得包含 `resume`、`session_id`、`hooks`、`stderr`、`continue_conversation` 或 `fork_session`。它也不得包含上表中已有专属字段的选项：`model`、`system_prompt`、`max_turns`、`max_budget_usd`、`permission_mode`、`tools`（应使用 `builtin_tools`）、`allowed_tools`、`disallowed_tools`、`mcp_servers`、`cwd`、`env`、`include_partial_messages`、`session_store`、`setting_sources`、`strict_mcp_config`（应使用 `isolate_host_config`）和 `cli_path`。若包含，配置会抛出 `ValueError`。

默认情况下，代理没有内置的 Claude Code 工具（没有文件访问，也没有 shell），也不加载任何设置文件。Claude 只能使用你配置的工具和 MCP 服务器。

### 工具与 MCP 服务器

工具以两种方式提供给 Claude：

- **Dapr Agents 工具**（代理的 `tools`，以及配置中 `tools` 里的任何工具；即带有 `@tool` 装饰的函数，或任何 `AgentTool`）通过进程内 MCP 服务器提供给 Claude。Claude 会将它们视为 `mcp__<tool_server_name>__<tool name>`，例如 `mcp__dapr__get_weather`。事件和工具历史则使用纯工具名 `get_weather`。
- `mcp_servers` 中的 **MCP 服务器**会传给 SDK，由 SDK 负责连接。将它们的工具名，或整个服务器（写作 `mcp__<server>`），添加到 `allowed_tools` 中，这样 Claude 无需询问即可调用它们：

```python
config = ClaudeAgentExecutorConfig(
    tools=(get_weather,),
    mcp_servers={
        "github": {
            "type": "http",
            "url": "https://api.githubcopilot.com/mcp/",
            "headers": {"Authorization": f"Bearer {os.environ['GITHUB_TOKEN']}"},
        },
    },
    allowed_tools=("mcp__github",),
)
```

这两类工具都在 `run_executor` activity 内部、与执行器位于同一进程中运行。它们不会被调度为独立的 workflow activity。参见[限制](#限制)。

### 持久化会话

Claude CLI 会将每个会话的转录写入本地磁盘。当 Pod 重启，或被重试的 activity 在另一个 Pod 上运行时，这些转录就会丢失。若要保留会话，请设置 `session_store`。随后 SDK 会在其中保存转录的副本；当会话在没有本地文件的主机上恢复时，SDK 会从存储中重建转录。

`DaprSessionStore` 是由 [Dapr state store]({{% ref state-management-overview.md %}}) 支持的会话存储：

```python
from dapr_agents import (
    ClaudeAgentExecutor,
    ClaudeAgentExecutorConfig,
    DaprSessionStore,
    DaprSessionStoreConfig,
)
from dapr_agents.storage.daprstores.stateservice import StateStoreService

session_store = DaprSessionStore(
    StateStoreService(store_name="agentstatestore"),
    config=DaprSessionStoreConfig(ttl_in_seconds=7 * 24 * 3600, project_key="assistant"),
)

executor = ClaudeAgentExecutor(
    ClaudeAgentExecutorConfig(
        model="claude-sonnet-4-5",
        session_store=session_store,
    )
)
```

如果你没有设置 `session_store`，`DurableAgent` 会在代理的 workflow state store（`AgentStateConfig.store`）上挂载一个 `DaprSessionStore`。执行器接受任何实现了 SDK `SessionStore` 协议的对象，因此你也可以使用自己的存储。

`DaprSessionStore` 存储会话的方式：

- 每个会话有一个小的 manifest 文档和一个分块文档列表。每个分块最多容纳 `max_chunk_bytes`（默认 256 KiB）。请确保该值低于 state store 的值大小上限。当最后一个分块不足一半满时，下一次追加会将其与新条目一起重写，因此分块数量随转录大小增长，而不是随追加次数增长。
- 追加操作通过 ETag（首次写入）并发控制提交，因此读取方永远看不到追加了一半的内容。若提交报告错误，但实际已到达存储（例如回复丢失），存储会识别出来并保留该次追加。重复发送的条目会根据其 `uuid` 被跳过。
- 每次追加都会重写 manifest。它最多保存 `dedupe_window` 个条目 uuid（每个约 40 字节，默认约 10 KB），外加每个分块的一个 ID。
- 转录按写入顺序加载。与追加发生竞争的读取会重试，而不是失败。
- 存储需要使用支持 ETag 的 state store：即首次写入（不带 ETag）在键已存在时会失败。已在 Redis（`state.redis`）和 PostgreSQL（`state.postgresql` v2）上验证；使用其他存储前请先确认。`ttl_in_seconds` 还需要 state store 支持 TTL。
- 不支持 `continue_conversation`（在不指定名称的情况下恢复最近的会话），因为存储不保留按项目的索引。

| `DaprSessionStoreConfig` 字段 | 默认值 | 描述 |
|---|---|---|
| `key_prefix` | `"claude-session:"` | 存储写入的每个键的前缀 |
| `max_chunk_bytes` | `262144` | 一个分块文档序列化后的最大大小 |
| `dedupe_window` | `256` | 每个会话记住的最近条目 uuid 数量，用于跳过重复项 |
| `max_commit_attempts` | `10` | 写入方发生冲突时提交 manifest 的尝试次数 |
| `ttl_in_seconds` | `None` | 滑动 TTL：会话在最后一次追加之后经过这么多秒过期。分块的 TTL 为其两倍，并且在早于该 TTL 时被重写，因此它们永远不会早于列出它们的 manifest 过期 |
| `project_key` | `None` | 每个键的作用域，替代 SDK 的项目键（由 CLI 的 `cwd` 派生）。`DurableAgent` 会将其设置为代理名称，因此无论主机使用哪个工作目录，都能找到会话 |

{{% alert title="会话与 cwd" color="primary" %}}
`DurableAgent` 挂载的存储以代理名称为作用域，因此 `cwd` 不影响能找到哪个会话。若你传入自己的 `session_store` 却未固定 `project_key`，则键由 `cwd` 派生，此时每个可能恢复会话的主机都必须使用相同的 `cwd`。
{{% /alert %}}

#### 会话 ID

Claude 会话 ID 是 UUID。不是 UUID 的调用方 ID 会被转换为一个稳定的 UUID，事件会将该 UUID 报告为 `session_id`。若要在之后的运行中延续对话，请在触发载荷中传入先前结果中的 `session_id`：

```python
result = await runner.run(
    agent,
    payload={"task": "And tomorrow?", "session_id": previous_session_id},
)
```

若存储中已有该会话，执行器会恢复它；否则会以该 ID 启动一个新会话。

### 工具调用的人工审批

`ClaudeAgentExecutor` 支持与由 LLM 驱动的 `DurableAgent` 相同的 `before_tool_call` [钩子]({{< ref dapr-agents-hooks.md >}})，包括 `RequireApproval`。可用 `hooks=Hooks(before_tool_call=[...])` 在代理上设置它们（或在执行器配置的 `before_tool_call` 中设置）。它们在 Claude 的 `PreToolUse` 钩子中为每一次工具调用运行，包括对 `mcp_servers` 中工具的调用：

| 钩子决策 | 对 Claude 工具调用的影响 |
|---|---|
| `Proceed()` 或 `None` | Dapr Agents 工具运行。来自 `mcp_servers` 的工具和内置 Claude Code 工具仍需经过 CLI 自身的权限规则，因此只有在它们位于 `allowed_tools` 中或被 `permission_mode` 允许时才会运行 |
| `Mutate(payload=...)` | 调用以新的参数运行 |
| `Deny(reason=...)` | 调用被阻止，并告知 Claude 原因 |
| `Skip(result=...)` | 对于 Dapr Agents 工具，工具不运行，并将 `result` 作为工具结果返回给 Claude，与由 LLM 驱动的代理相同。其他工具只能被阻止，因此会告知 Claude 该调用已被跳过 |
| `RequireApproval(...)` | 调用被推迟，运行暂停，直到有人做出决定 |
| 钩子抛出异常 | 调用被阻止 |

钩子接收一个 `ToolHookContext`。对于 Dapr Agents 工具，`step_name` 是纯工具名（`transfer_money`），`source` 是工具自身的 `source`，与由 LLM 驱动的代理中钩子看到的值相同：普通工具为 `"local"`，Dapr `MCPServer` 工具为 `"mcp"`。对于 `mcp_servers` 中的工具，`step_name` 是完整的 Claude 名称（`mcp__github__create_issue`），`source` 为 `"mcp"`。内置 Claude Code 工具的 `source` 为 `"claude"`。`payload`（负载）保存工具参数，`tool_call_id` 保存该调用的 ID。

```python
from dapr_agents import (
    ClaudeAgentExecutor,
    ClaudeAgentExecutorConfig,
    DurableAgent,
    tool,
)
from dapr_agents.agents.configs import AgentApprovalConfig, AgentExecutionConfig
from dapr_agents.hooks import (
    HookDecision,
    Hooks,
    Proceed,
    RequireApproval,
    ToolHookContext,
)


@tool
def transfer_money(to: str, amount: int) -> str:
    """Transfer money to a person."""
    return f"Sent {amount} to {to}."


def approve_transfers(ctx: ToolHookContext) -> HookDecision:
    if ctx.step_name == "transfer_money":
        return RequireApproval(
            timeout_seconds=3600,
            instructions=f"Approve transfer: {ctx.payload}",
        )
    return Proceed()


agent = DurableAgent(
    name="Payments",
    role="Payments assistant",
    instructions=["Call at most one tool at a time."],
    executor=ClaudeAgentExecutor(),
    tools=[transfer_money],
    hooks=Hooks(before_tool_call=[approve_transfers]),
    execution=AgentExecutionConfig(approval=AgentApprovalConfig()),
)
```

审批的工作方式：

1. Claude 调用 `transfer_money`。钩子返回 `RequireApproval`，因此执行器推迟该调用，工具不会运行。本次运行以 `paused` 事件结束，该事件包含 `tool_call_id`、工具名称、参数、审批详情以及工具的 `source`。
2. workflow 保存其状态，并通过 `AgentApprovalConfig` 中设置的通道请求审批：通过 pub/sub 发送 `ApprovalRequiredEvent`，或使用 `runner.serve()` 下的 `/hitl/approvals` 端点。这与由 LLM 驱动的代理的流程相同。随后 workflow 会持久地等待响应或超时。等待期间无需有任何进程保持运行。
3. 收到决定后，workflow 会以相同的 `session_id` 再次调用 `run_executor`，并将决定放在 `context["tool_decisions"]` 下。决定中记录了审批人所看到参数的哈希值；若实际运行时的参数与之不同，该调用会被拒绝。执行器会从会话存储中恢复 Claude 会话，该会话可能在另一个 Pod 上恢复。同一个工具调用会再次经过钩子，并根据决定被允许或拒绝，随后 Claude 继续原来的任务。若调用被拒绝，则会告知 Claude 该调用已被阻止：原因取自审批人的 `ApprovalResponseEvent` 中的 `reason`；若没有原因或审批已超时，则为 "approval was not granted or timed out"。
4. 恢复后的运行可能再次暂停，例如 Claude 发起了另一个需要审批的调用。workflow 会重复第 2 步和第 3 步，直到运行完成或失败，最多进行 `max_approval_rounds` 轮审批（`AgentExecutionConfig`，默认等于 `max_iterations`）。此后，下一个暂停的调用会在不询问任何人的情况下被拒绝，并告知 Claude 已达到审批次数上限。若 Claude 仍请求审批，workflow 会以一条说明已达到审批次数上限的消息结束。以上述方式留下的暂停调用，或在等待期间被终止的 workflow 留下的暂停调用，会在同一会话的下一次运行开始时（即在发送新任务之前）被拒绝。

`ApprovalRequiredEvent` 携带执行器所报告的工具 `source`：Dapr Agents 工具为工具自身的 `source`，来自 `mcp_servers` 的工具为 `"mcp"`，内置工具为 `"claude"`。

决定只适用于它所针对的 `tool_call_id`。当 Claude 并行发起多个需要审批的调用时，每次暂停只报告其中一个。Claude 会以新的 ID 重新发起其余调用，并且每个调用各自会暂停等待其审批。若要减少审批轮次，请在系统提示词中要求 Claude 每次只调用一个需要审批闸门的工具。

{{% alert title="不要把需要审批的工具列入 allowed_tools" color="warning" %}}
设置了 `before_tool_call` 钩子后，执行器会让自己的工具经过钩子，而不是经过 `allowed_tools`。这样一来，即使 CLI 拒绝推迟该调用，受闸门控制的调用也无法依靠静态的允许规则运行。不要把需要审批的工具添加到 `allowed_tools` 中，因为在这种情况下，列在其中的工具可以无需审批即运行。
{{% /alert %}}

若要在 `DurableAgent` 之外自行驱动暂停的运行，请循环执行，直到流以 `complete` 或 `error` 结束：

```python
from dapr_agents import AgentEvent, ToolCallDecision


async def run_with_approval(executor, task: str) -> AgentEvent:
    session_id = None
    context = None
    while True:
        last = None
        async for event in executor.run(task, session_id=session_id, context=context):
            session_id = event.session_id or session_id
            last = event
        if last is None or last.type != "paused":
            return last  # "complete" 或 "error"
        call = last.content
        # ask_a_human 是你自己的审批步骤（界面、聊天消息、工单等）。
        approved = await ask_a_human(call["name"], call["arguments"])
        decision = ToolCallDecision(tool_call_id=call["tool_call_id"], approved=approved)
        context = {"tool_decisions": {decision.tool_call_id: decision.to_dict()}}
```

### 流式输出

当 `include_partial_messages=True`（默认值）时，执行器会在 Claude 输出时发出 `text_delta` 事件。当代理以流式方式运行时，`DurableAgent` 会将每个增量发布到该次运行的流中，其方式与流式 LLM 客户端相同。可使用 `AgentRunner.run_stream(...)`，或配合流监听器使用 `AgentExecutionConfig(streaming=True)` 来读取它。思考文本和子代理的输出不会被流式传输。

### 可观测性

执行器的运行与由 LLM 驱动的代理一样，通过 Dapr Agents 的 OpenTelemetry 插桩进行追踪。每个 `run_executor` activity 都会获得一个 `invoke_agent {agent}` 跨度，并且执行器每报告一次工具调用，就会有一个 `execute_tool {tool}` 子跨度。跨度携带 OpenInference 和 GenAI 属性：代理名称、`session.id`、token 用量、模型，以及 `executor.cost_usd`、`executor.session_total_cost_usd`、`executor.num_turns` 和 `executor.stop_reason`。出错时会设置 `error.type`。等待审批的工具调用会以 `tool.completed=false` 结束其跨度。

`DurableAgent` 还会将每次运行的用量保存在 workflow 状态中，即 workflow 条目的 `executor_usage` 列表中（每个已完成或已暂停的运行对应一条记录）。

最后的 `complete` 或 `paused` 事件也会在其 `metadata` 中报告本次运行的花费：

| 键 | 描述 |
|---|---|
| `cost_usd` | 本次运行的花费：会话的当前总计减去运行开始时的总计。开始时的总计从会话存储中读取，因此只有设置了 `session_store`（在带 state store 的 `DurableAgent` 下总是如此）时，这才是仅本次运行的花费。若没有会话存储，恢复后的运行会在此报告会话总计 |
| `session_total_cost_usd` | 会话的总花费，涵盖所有运行和恢复 |
| `usage` | SDK 为本次运行报告的token 用量 |
| `model_usage` | 每个模型的用量 |
| `num_turns` | SDK 报告的轮次数。跨恢复累计 |
| `stop_reason`、`terminal_reason` | 运行停止的原因 |

执行器还会将 Claude CLI 的 stderr 以 `DEBUG` 级别发送到 Python 日志记录器 `dapr_agents.agents.executors.claude`，并在运行于 Claude 返回结果之前失败时，将其最后几行追加到错误消息中。

### 错误

执行器以 `error` 事件报告失败，从不抛出异常。错误文本包含 SDK 的详细信息，例如结果子类型（如 `error_max_turns` 或 `error_max_budget_usd`）以及错误消息。若找不到 CLI，消息会说明如何安装它。`DurableAgent` 会将 `error` 事件转为失败的运行。

## 限制

- **工具在一个 activity 中运行。**执行器、它的工具以及它的 MCP 调用都在同一个 `run_executor` activity 内运行。Dapr Workflow 不会为每次工具调用设置检查点，activity 的重试策略适用于整个运行，而不是每个工具。
- **至少一次执行。**与任何 workflow activity 一样，`run_executor` 可能会运行不止一次，例如在一次运行期间 Pod 发生故障时。此时工具可能会再次运行。被重试的尝试会恢复失败尝试所保存的会话，并再次发送任务，因此 Claude 会看到两次任务。对于有副作用的工具，请使其具备[幂等性]({{% ref "workflow-features-concepts.md#workflow-activities" %}})，或将其置于审批之后。若一次在恢复后被重试的运行已经结束，则不会再次启动任务：执行器会从已保存的转录中返回最终答案。若先前的尝试在已批准的工具运行之后、Claude 作答之前停止，则重试会从工具结果处继续该会话。对于每次尝试都会重复出现的失败（例如达到 `max_turns` 或 `max_budget_usd`、提示词过长或身份验证错误），workflow 会立即失败，而不是重试。
- **长时间运行会使 activity 保持打开。**一次 Claude 运行可能需要数分钟。设置 activity 的重试和超时策略时应考虑这一点。等待审批不会使 activity 保持打开。
- **安装包大小与平台。**SDK 的 wheel 包含 Claude Code CLI（约 100 MB），并且没有适用于 musl Linux 的 wheel。参见[安装](#安装)。
- **每次恢复时选项必须相同。**恢复的会话必须使用相同的工具、MCP 服务器、钩子和权限模式。若会话恢复时，被推迟的工具已不存在，则运行失败。

## 示例

[`examples/13-agent-executor-claude`](https://github.com/dapr/dapr-agents/tree/main/examples/13-agent-executor-claude) 示例使用 `ClaudeAgentExecutor` 运行一个 `DurableAgent`。它使用 Dapr Agents 工具、由 Dapr 支持的会话存储，以及一个需要人工审批的工具。

## 延伸阅读

- [钩子与人在回路]({{< ref dapr-agents-hooks.md >}})：钩子决策和审批投递通道
- [核心概念]({{< ref dapr-agents-core-concepts.md >}})：`DurableAgent` 和 `AgentRunner`
- [Claude Agent SDK 文档](https://docs.claude.com/en/api/agent-sdk/overview)
- 源码：[`dapr_agents/agents/executors`](https://github.com/dapr/dapr-agents/tree/main/dapr_agents/agents/executors)
