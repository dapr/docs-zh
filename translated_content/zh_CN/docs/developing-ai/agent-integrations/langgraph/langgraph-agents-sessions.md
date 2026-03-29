---
type: docs
title: "Agent 会话"
linkTitle: "Agent 会话"
weight: 30
description: "如何使用 Dapr 可靠且安全地管理 LangGraph Agent 检查点"
---

## 概述

Dapr Python SDK 通过 `dapr-ext-langgraph` 扩展与 LangGraph 检查点器集成。

## 快速开始

在本地初始化 Dapr 以设置用于开发的自托管环境。此过程会获取并安装 Dapr 边车二进制文件，将基本服务作为 Docker 容器运行，并为您的应用程序准备默认的组件文件夹。有关详细步骤，请参阅官方[本地初始化 Dapr 指南]({{% ref install-dapr-cli.md %}})。

要初始化 Dapr 控制平面容器并创建默认配置文件，请运行：

```bash
dapr init
```

使用 `docker ps` 验证您是否有运行 `daprio/dapr`、`openzipkin/zipkin` 和 `redis` 镜像的容器实例：

```bash
docker ps
```

### 安装 Python

{{% alert title="注意" color="info" %}}
请确保您已安装 Python。`Python >=3.10`。有关安装说明，请访问官方 [Python 安装指南](https://www.python.org/downloads/)。
{{% /alert %}}

### 下载依赖项

使用以下命令下载并安装 Dapr LangGraph 扩展：

{{< tabpane text=true >}}

{{% tab header="稳定版" %}}

```bash
pip install dapr-ext-langgraph langchain_openai langchain_core langgraph langgraph-prebuilt
```

{{% /tab %}}

{{% tab header="开发版" %}}
{{% alert title="注意" color="warning" %}}
开发包将包含与 Dapr 运行时预发布版本兼容的功能和行为。在安装 `dapr-dev` 包之前，请确保已卸载任何稳定版本的 Python SDK 扩展。
{{% /alert %}}

```bash
pip install dapr-ext-langgraph-dev langchain_openai langchain_core langgraph langgraph-prebuilt
```

{{% /tab %}}

{{< /tabpane >}}

### 创建 LangGraph Agent

要让 Dapr 处理 agent 的内存，请在编译图时使用 `DaprCheckpointer` 作为检查点器对象。像传递其他检查点器提供程序一样传递检查点器：

```python
from dapr.ext.langgraph import DaprCheckpointer
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import START, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition


def add(a: int, b: int) -> int:
    """Adds a and b.

    Args:
        a: first int
        b: second int
    """
    return a + b

tools = [add]
llm = ChatOpenAI(model="gpt-4o")
llm_with_tools = llm.bind_tools(tools)

sys_msg = SystemMessage(
    content='You are a helpful assistant tasked with performing arithmetic on a set of inputs.'
)

def assistant(state: MessagesState):
    return {'messages': [llm_with_tools.invoke([sys_msg] + state['messages'])]}

builder = StateGraph(MessagesState)
builder.add_node('assistant', assistant)
builder.add_node('tools', ToolNode(tools))
builder.add_edge(START, 'assistant')
builder.add_conditional_edges(
    'assistant',
    tools_condition,
)
builder.add_edge('tools', 'assistant')

memory = DaprCheckpointer(store_name='statestore', key_prefix='dapr')
react_graph_memory = builder.compile(checkpointer=memory)

config = {'configurable': {'thread_id': '1'}}

messages = [HumanMessage(content='Add 3 and 4.')]
messages = react_graph_memory.invoke({'messages': messages}, config)
for m in messages['messages']:
    m.pretty_print()
```

### 设置 OpenAI API 密钥

```bash
export OPENAI_API_KEY=sk-...
```

### 创建 Python venv

```bash
python -m venv .venv                                                                                                                                                                      
source .venv/bin/activate  # 在 Windows 上: .venv\Scripts\activate
```

## 创建数据库组件

组件文件是 Dapr 连接到数据库的方式。支持的数据库完整列表可以在[这里]({{% ref supported-state-stores %}})找到。创建一个 `components` 目录并在其中创建此文件：

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

## 后续步骤

现在您已经有了一个使用 Dapr 管理 agent 会话的 LangGraph agent，进一步探索您可以使用 [State API]({{% ref "state-management-overview" %}}) 做更多事情，以及如何启用[弹性策略]({{% ref resiliency-overview %}})以增强可靠性。
