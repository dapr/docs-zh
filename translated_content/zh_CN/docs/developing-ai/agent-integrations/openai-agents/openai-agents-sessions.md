---
type: docs
title: "Agent Sessions"
linkTitle: "Agent Sessions"
weight: 20
description: "如何使用 Dapr 可靠且安全地管理边车状态"
---

## 概述

通过使用 Dapr 管理 OpenAI Agent 的状态和[会话数据](https://openai.github.io/openai-agents-python/sessions/)，用户可以将 Agent 状态存储在 Dapr 支持的所有数据库中，包括键值存储、缓存和 SQL 数据库。开发者还可以获得内置的跟踪、指标和弹性策略，使 Agent 会话数据在生产环境中可靠运行。

## 入门

在本地初始化 Dapr 以设置自托管开发环境。此过程获取并安装 Dapr 边车二进制文件，将必要的服务作为 Docker 容器运行，并准备应用程序的默认组件文件夹。详细步骤，请参阅官方[本地初始化 Dapr 指南]({{% ref install-dapr-cli.md %}})。

要初始化 Dapr 控制平面容器并创建默认配置文件，请运行：

```bash
dapr init
```

验证你正在运行的容器实例是否包含 `daprio/dapr`、`openzipkin/zipkin` 和 `redis` 镜像：

```bash
docker ps
```

### 安装 Python

{{% alert title="注意" color="info" %}}
确保你已经安装了 Python。`Python >=3.10`。安装说明请参阅官方 [Python 安装指南](https://www.python.org/downloads/)。
{{% /alert %}}

### 安装依赖项

```bash
pip install openai-agents dapr
```

### 创建 OpenAI Agent

让我们创建一个简单的 OpenAI Agent。将以下代码放入名为 `openai_agent.py` 的文件中：

```python
import asyncio
from agents import Agent, Runner
from agents.extensions.memory.dapr_session import DaprSession

async def main():
    agent = Agent(
        name="Assistant",
        instructions="Reply very concisely.",
    )

    session = DaprSession.from_address(
        session_id="123",
        state_store_name="statestore"
    )

    result = await Runner.run(agent, "What city is the Golden Gate Bridge in?", session=session)
    print(result.final_output)

    result = await Runner.run(agent, "What state is it in?", session=session)
    print(result.final_output)

    result = await Runner.run(agent, "What's the population?", session=session)
    print(result.final_output)

asyncio.run(main())
```

### 设置 OpenAI API 密钥

```bash
export OPENAI_API_KEY=sk-...
```

### 创建 Python 虚拟环境

```bash
python -m venv .venv                                                                                                                                                                      
source .venv/bin/activate  # 在 Windows 上：.venv\Scripts\activate
```

### 创建数据库组件

组件文件是 Dapr 连接数据库的方式。完整的支持数据库列表可以在这里找到[这里]({{% ref supported-state-stores %}})。创建一个 `components` 目录并在其中创建此文件：

`statestore.yaml`：

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
```

### 运行 Agent

现在使用 Dapr CLI 运行本地 Dapr 进程和 Python 脚本。

```bash
dapr run --app-id openaisessions --dapr-grpc-port 50001 --resources-path ./components -- python3 ./openai_agent.py
```

打开 `http://localhost:9411` 查看追踪和依赖关系图。

你可以使用以下命令[查看存储在 Redis 中的会话数据]({{% ref "getting-started/get-started-api" %}}#step-4-see-how-the-state-is-stored-in-redis)

```bash
hgetall "123:messages" 
```

## 下一步

现在你已拥有使用 Dapr 管理 Agent 会话的 OpenAI Agent，可以进一步探索[状态 API]({{% ref "state-management-overview" %}})的更多功能，以及如何启用[弹性策略]({{% ref resiliency-overview %}})以增强可靠性。

在此处了解更多关于 OpenAI Agent 会话和 Dapr 的信息[详情](https://openai.github.io/openai-agents-python/sessions/)。
