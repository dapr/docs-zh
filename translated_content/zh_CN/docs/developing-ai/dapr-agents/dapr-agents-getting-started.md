---
type: docs
title: "入门指南"
linkTitle: "入门指南"
weight: 20
description: "如何安装 Dapr Agents 并运行你的第一个 Agent"
aliases:
  - /developing-applications/dapr-agents/dapr-agents-getting-started
---

{{% alert title="Dapr Agents 概念" color="primary" %}}
如果你想了解 Dapr Agents 的入门概述，并希望学习更多 Dapr Agents 基本术语，我们建议你先阅读[介绍](dapr-agents-introduction.md)和[核心概念](dapr-agents-core-concepts.md)部分。
{{% /alert "%}}

## 安装 Dapr CLI

虽然 Dapr Agents 中的简单示例可以在不使用边车的情况下运行，但推荐模式是使用 Dapr 边车。要充分利用 Dapr Agents 的全部功能，请安装 Dapr CLI，用于在本地或 Kubernetes 上运行 Dapr 进行开发。完整的分步指南，请参阅 [Dapr CLI 安装页面]({{% ref install-dapr-cli.md %}})。


通过重启终端/命令提示符并运行以下命令来验证 CLI 是否已安装：

```bash
dapr -h
```

## 在本地模式下初始化 Dapr

{{% alert title="注意" color="info" %}}
请确保已安装 [Docker](https://docs.docker.com/get-started/get-docker/)。
{{% /alert "%}}

在本地初始化 Dapr 以设置用于开发的自托管环境。此过程会获取并安装 Dapr 边车二进制文件、将必要的服务作为 Docker 容器运行，并为你的应用程序准备一个默认组件文件夹。详细步骤，请参阅官方[本地初始化 Dapr 指南]({{% ref install-dapr-selfhost.md %}})。

![Dapr 初始化](/images/dapr-agents/home_installation_init.png)

要初始化 Dapr 控制平面容器并创建默认配置文件，请运行：

```bash
dapr init
```

验证你拥有运行中的容器实例，这些实例使用 `daprio/dapr`、`openzipkin/zipkin` 和 `redis` 镜像：

```bash
docker ps
```

## 安装 Python

{{% alert title="注意" color="info" %}}
请确保已安装 Python。`Python >=3.11`。安装说明，请访问官方 [Python 安装指南](https://www.python.org/downloads/)。
{{% /alert "%}}

## 安装 uv

Dapr Agents 快速入门使用 [uv](https://docs.astral.sh/uv/) 作为 Python 包管理器。按照 [uv 安装指南](https://docs.astral.sh/uv/getting-started/installation/) 进行安装。

## 配置 LLM

快速入门默认使用 [Ollama](https://ollama.com/)，因此你可以在本地运行所有内容而无需 API 密钥。

### 默认配置：Ollama（本地）

1. 安装并启动 Ollama：

{{< tabpane text=true >}}

{{% tab header="Linux" text=true %}}

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

{{% /tab "%}}

{{% tab header="macOS" text=true %}}

```bash
brew install ollama
```

{{% /tab "%}}

{{% tab header="Windows" text=true "%}}

从 [ollama.com/download](https://ollama.com/download) 下载并运行安装程序。

{{% /tab "%}}

{{< /tabpane >}}

2. 拉取一个支持工具调用的模型：

```bash
ollama serve    # 启动服务器（如果已在运行则跳过）
ollama pull qwen3:0.6b
```

3. 在运行任何快速入门之前，导出所需的环境变量：

{{< tabpane text=true >}}

{{% tab header="Linux/macOS" text=true "%}}

```bash
export OLLAMA_ENDPOINT=http://localhost:11434/v1
export OLLAMA_MODEL=qwen3:0.6b
```

{{% /tab "%}}

{{% tab header="Windows (PowerShell)" text=true "%}}

```powershell
$env:OLLAMA_ENDPOINT = "http://localhost:11434/v1"
$env:OLLAMA_MODEL = "qwen3:0.6b"
```

{{% /tab "%}}

{{< /tabpane >}}

`resources/llm-provider.yaml` 组件会自动从你的环境中解析 `{{OLLAMA_ENDPOINT}}` 和 `{{OLLAMA_MODEL}}`。

### 备选方案：OpenAI

要改用 OpenAI，请将 `resources/llm-provider.yaml` 替换为：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: llm-provider
spec:
  type: conversation.openai
  version: v1
  metadata:
  - name: key
    value: "{{OPENAI_API_KEY}}"
  - name: model
    value: "gpt-4o-mini"
```

Dapr 还通过 [Conversation API]({{% ref "conversation-overview" %}}) 支持 Anthropic、Mistral 和其他提供商。替换组件类型和元数据，同时保持 `name: llm-provider` 不变。

## 准备你的环境

在这个入门指南中，你将直接使用 [Dapr Agents 快速入门](https://github.com/dapr/dapr-agents/tree/main/quickstarts) 中的示例。你将主要使用 `02_durable_agent_http.py`——一个基于 Dapr 工作流引擎的可靠持久化 Agent，并通过 HTTP 暴露。

### 1. 克隆仓库

```bash
git clone https://github.com/dapr/dapr-agents.git
cd dapr-agents/quickstarts
```

### 2. 创建虚拟环境并安装依赖

在 `quickstarts` 文件夹中：

```bash
uv venv

# 激活虚拟环境
# 在 Windows 上：
.venv\Scripts\activate
# 在 macOS/Linux 上：
source .venv/bin/activate

# 安装依赖
uv sync --active
```

这将安装 `dapr-agents` 以及示例所需的所有额外库。

## 了解应用程序

此示例创建了一个协助处理天气信息的 Agent，并使用 Dapr 处理 LLM 交互、持久化对话历史记录，以及提供可靠、持久的 Agent 步骤执行。

对于这个快速入门，你将主要使用：

* `02_durable_agent_http.py` – 通过 HTTP 暴露的主持久化天气 Agent 应用程序
* `function_tools.py` – 包含 `slow_weather_func`，即 Agent 使用的工具
* `resources/llm-provider.yaml` – Conversation API 和 LLM 配置
* `resources/agent-memory.yaml` – 对话记忆状态存储
* `resources/agent-workflow.yaml` – 工作流和持久执行状态存储


打开 `02_durable_agent_http.py`：

```python
from dapr_agents.llm import DaprChatClient

from dapr_agents import DurableAgent
from dapr_agents.agents.configs import AgentMemoryConfig, AgentStateConfig
from dapr_agents.memory import ConversationDaprStateMemory
from dapr_agents.storage.daprstores.stateservice import StateStoreService
from dapr_agents.workflow.runners import AgentRunner
from function_tools import slow_weather_func


def main() -> None:
    weather_agent = DurableAgent(
        name="WeatherAgent",
        role="Weather Assistant",
        instructions=["Help users with weather information"],
        tools=[slow_weather_func],
        # Configure this agent to use Dapr Conversation API.
        llm=DaprChatClient(component_name="llm-provider"),
        # Configure the agent to use Dapr State Store for conversation history.
        memory=AgentMemoryConfig(
            store=ConversationDaprStateMemory(
                store_name="agent-memory",
            )
        ),
        # This is where the execution state is stored
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
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted by user. Exiting gracefully...")
```

这个单文件应用程序展示了如何创建一个生产级的持久化 Agent：

* **`DurableAgent`** 将 LLM 和工具封装在基于工作流的执行模型中。推理和工具调用的每个步骤都会被持久化。
* **`slow_weather_func`**（来自 `function_tools.py`）代表一个缓慢的外部调用，允许你观察持久化工作流如何在中断后恢复。
* **`AgentRunner`** 通过 HTTP 在端口 `8001` 上暴露 Agent，使其他服务（或 `curl`）可以启动和查询持久化任务。

下面的部分将分解关键配置区域，并展示每个 Python 配置如何映射到 Dapr 组件。

### 通过 Dapr Conversation API 进行 LLM 调用

在 Agent 定义中：

```python
llm=DaprChatClient(component_name="llm-provider"),
```

这通过 `llm-provider` 组件使用 [Dapr Conversation API]({{% ref "conversation-overview" %}})。对应的 Dapr 组件定义在 `resources/llm-provider.yaml` 中：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: llm-provider
spec:
  type: conversation.openai
  version: v1
  metadata:
  - name: key
    value: "ollama"
  - name: model
    value: "{{OLLAMA_MODEL}}"
  - name: endpoint
    value: "{{OLLAMA_ENDPOINT}}"
```

* `conversation.openai` 组件类型用于 Ollama 兼容的 OpenAI API。
* `key` 设置为 `"ollama"` 用于本地 Ollama 推理；使用云提供商时请替换为真实的 API 密钥。
* `model` 和 `endpoint` 在运行时从环境变量中解析。

通过此设置，你可以通过编辑组件 YAML 来切换模型或提供商，而无需更改 Agent 代码。

### 使用 Dapr 状态存储的对话记忆

在 Agent 定义中，对话记忆配置如下：

```python
memory=AgentMemoryConfig(
  store=ConversationDaprStateMemory(
      store_name="agent-memory",
  )
),
```

这告诉 Agent 将对话历史存储在 `agent-memory` Dapr 状态存储中。匹配的 Dapr 组件是 `resources/agent-memory.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: agent-memory
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
    - name: redisPassword
      value: ""
```

* 状态存储使用 Redis 来持久化对话轮次。
* Agent 在此处读取和写入消息，以便 LLM 可以在多个 HTTP 调用之间保持上下文。

你可以稍后浏览此状态（例如使用 Redis Insight）来查看对话历史的存储方式。

### 使用工作流状态存储的持久执行状态

Agent 的持久执行状态配置如下：

```python
state=AgentStateConfig(
  store=StateStoreService(store_name="agent-workflow"),
),
```

这使用 `agent-workflow` Dapr 状态存储。对应的组件是 `resources/agent-workflow.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: agent-workflow
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

* `actorStateStore: "true"` 是必需的设置，启用适合 Dapr 工作流的存储。
* 如果进程在执行中途停止，工作流引擎使用此状态从最后一个持久化步骤恢复，而不是从头开始。这可以防止复杂的 Agent 工作流重新执行已经完成的 LLM 和工具调用。

这些特性共同使 Agent 具有**持久性**、**可靠性**和**提供商无关性**，同时保持 Agent 代码本身专注于行为和工具。

## 使用 Dapr 运行持久化 Agent

从 `quickstarts` 文件夹中，激活虚拟环境后：

```bash
uv run dapr run --app-id durable-agent --resources-path resources -- python 02_durable_agent_http.py
```

这将：

* 使用 `resources/` 中的组件启动 Dapr 边车。
* 使用持久化 `WeatherAgent` 运行 `02_durable_agent_http.py`。
* 在端口 `8001` 上暴露 Agent 的 HTTP API。

### 使用提示触发 Agent

在另一个终端中，向 Agent 询问天气。

```bash
curl -i -X POST http://localhost:8001/agent/run \
  -H "Content-Type: application/json" \
  -d '{"task": "What is the weather in London?"}'
```

响应包含一个 `WORKFLOW_ID`，代表工作流执行。

### 查询工作流状态或结果

使用 POST 响应中的 `WORKFLOW_ID` 来查询进度或最终结果：

```bash
curl -i -X GET http://localhost:8001/agent/instances/WORKFLOW_ID
```

将 `WORKFLOW_ID` 替换为你从 POST 请求中收到的值。

### 预期行为

* Agent 在 `/agent/run` 暴露一个 REST 端点。
* 对 `/agent/run` 的 POST 请求接受提示、调度工作流执行并返回工作流 ID。
* 你可以随时 GET `/agent/instances/{WORKFLOW_ID}`（即使停止并重新启动 Agent 后），以检查状态或获取最终答案。
* 工作流编排：

    * LLM 调用来解释任务并决定是否需要工具。
    * 工具调用（使用 `slow_weather_func`）来获取天气数据。
    * 最终的 LLM 步骤，将工具结果整合到响应中。
* 每个步骤都被持久化，因此除非失败，否则不会重复 LLM 或工具调用。

## 通过中断 Agent 测试持久性

要查看持久执行的实际效果：

1. **开始运行**
   按上述方式向 `/agent/run` 发送 POST 请求，并记下 `WORKFLOW_ID`。

2. **终止 Agent 进程**
   当请求正在处理时（在 `slow_weather_func` 期间，它被故意延迟 5 秒），停止 Agent 进程：

    * 转到运行 `uv run dapr run ...` 的终端。
    * 按 `Ctrl+C` 停止应用程序和边车。

3. **重新启动 Agent**
   使用相同的命令再次启动：

```bash
   uv run dapr run --app-id durable-agent --resources-path resources -- python 02_durable_agent_http.py
```

4. **查询相同的工作流**
   在另一个终端中，查询相同的工作流 ID：

   ```bash
   curl -i -X GET http://localhost:8001/agent/instances/WORKFLOW_ID
   ```

你会看到工作流从其最后一个持久化步骤继续，而不是从头开始。工具调用或 LLM 调用不会被重新执行，除非需要，并且你不需要发送新的提示。一旦工作流完成，GET 请求将返回最终结果。

总之，Dapr 工作流引擎在重启之间保留 Agent 的执行状态，实现了结合 LLM 调用、工具和有状态推理的可靠长时间运行交互。

## 使用 Diagrid Dashboard 检查工作流执行

在使用 Dapr 启动持久化 Agent 后，你可以使用本地 [Diagrid Dashboard](https://diagrid.ws/diagrid-dashboard-docs) 来可视化和检查你的工作流状态，包括每次运行的详细执行历史。仪表板作为容器运行，并连接到 Dapr 工作流使用的相同状态存储（默认情况下是本地 Redis 实例）。

<img src="/images/workflow-overview/workflow-diagrid-dashboard.png" width=800 alt="Diagrid Dashboard showing local workflow executions"/><br/>

使用 Docker 启动 Diagrid Dashboard 容器：

```bash
docker run -p 8080:8080 ghcr.io/diagridio/diagrid-dashboard:latest
```

在浏览器中打开仪表板，访问 `http://localhost:8080` 以探索你的本地工作流执行。

## 使用 Redis Insight 检查对话历史

Dapr 默认使用 [Redis]({{% ref setup-redis.md %}}) 进行状态管理和发布订阅消息，这些是 Dapr Agents Agent 工作流的基础。要检查 Redis 实例并查看此持久化 Agent 的**对话**状态，你可以使用 Redis Insight。

运行 Redis Insight：

```bash
docker run --rm -d --name redisinsight -p 5540:5540 redis/redisinsight:latest
```

运行后，在 `http://localhost:5540/` 访问 Redis Insight 界面。

在 Redis Insight 中，你可以连接到 Dapr 使用的 Redis 实例：

* 端口：6379
* 主机（Linux）：`172.17.0.1`
* 主机（Windows/Mac）：`host.docker.internal`（例如 `host.docker.internal:6379`）

Redis Insight 可以轻松检查状态存储（如 `agent-memory` 和 `agent-workflow`）中存储的键和值，这对于调试和理解持久化 Agent 的行为非常有用。

![Redis 仪表板](/images/dapr-agents/redis_dashboard.png)

在这里你可以浏览 Agent 使用的状态存储（`agent-memory`）并探索其数据。

## 下一步

现在你已经通过快速入门安装了 Dapr Agents，并端到端运行了一个持久化 HTTP Agent，请在[快速入门]({{% ref dapr-agents-quickstarts.md %}})部分探索更多示例和模式，了解多 Agent 工作流、发布订阅驱动的 Agent、追踪以及与 Dapr 构建块的更深层次集成。
