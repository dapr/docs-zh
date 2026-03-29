---
type: docs
title: "CrewAI Workflows"
linkTitle: "CrewAI Workflows"
weight: 25
description: "如何使用 Dapr Workflows 以持久、容错的方式运行 CrewAI 代理"
---

## 概述

Dapr Workflows 使 CrewAI 代理能够**可靠地**、**持久地**且**具备内置弹性**地运行。  
通过 Dapr Workflow 引擎编排 CrewAI 任务，开发者可以：

- 确保长时间运行的 CrewAI 工作在崩溃和重启后仍能继续。
- 获得自动检查点、重试和状态恢复。
- 将每个 CrewAI 任务作为持久活动运行。
- 通过追踪、指标和结构化日志观察执行情况。

本指南将介绍如何使用 Dapr Workflows 编排多个 CrewAI 任务，确保即使进程重启，每个步骤也只执行*一次*。

## 入门

在本地初始化 Dapr 以设置自托管开发环境。此过程会安装 Dapr 边车二进制文件、配置工作流引擎并准备默认组件目录。有关完整详情，请参阅[本地初始化 Dapr 的指南]({{% ref install-dapr-selfhost.md %}})。

初始化 Dapr：

```bash
dapr init
```

验证 daprio/dapr、openzipkin/zipkin 和 redis 是否正在运行：

```bash
docker ps
```

### 安装 Python

{{% alert title="Note" color="info" %}}
确保已安装 Python。`Python >=3.10`。有关安装说明，请访问官方 [Python 安装指南](https://www.python.org/downloads/)。
{{% /alert %}}

### 创建 Python 虚拟环境（推荐）

```bash
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
```

### 安装依赖

```bash
pip install dapr dapr-ext-workflow crewai
```

### 创建工作流以运行 CrewAI 任务

创建一个名为 crewai_workflow.py 的文件并粘贴以下内容：

```python
from dapr.ext.workflow import (
    WorkflowRuntime,
    DaprWorkflowContext,
    WorkflowActivityContext,
    DaprWorkflowClient,
)
from crewai import Agent, Task, Crew
import time

wfr = WorkflowRuntime()

# ------------------------------------------------------------
# 1. 定义代理、任务和任务字典
# ------------------------------------------------------------
agent = Agent(
    role="Research Analyst",
    goal="Research and summarize impactful technology updates.",
    backstory="A skilled analyst who specializes in researching and summarizing technology topics.",
)

tasks = {
    "latest_ai_news": Task(
        description="Find the latest news about artificial intelligence.",
        expected_output="A 3-paragraph summary of the top 3 stories.",
        agent=agent,
    ),
    "ai_startup_launches": Task(
        description="Summarize the most impactful AI startup launches in the last 6 months.",
        expected_output="A list summarizing 2 AI startups with links.",
        agent=agent,
    ),
    "ai_policy_updates": Task(
        description="Summarize the newest AI government policy and regulation updates.",
        expected_output="A bullet-point list summarizing the latest policy changes.",
        agent=agent,
    ),
}

# ------------------------------------------------------------
# 2. 活动 — 按名称运行一个任务
# ------------------------------------------------------------
@wfr.activity(name="run_task")
def run_task_activity(ctx: WorkflowActivityContext, task_name: str):
    print(f"Running CrewAI task: {task_name}", flush=True)

    task = tasks[task_name]

    # 为这单个任务创建一个 Crew
    temp_crew = Crew(agents=[agent], tasks=[task])

    # kickoff() 适用于所有 CrewAI 版本
    result = temp_crew.kickoff()

    return str(result)

# ------------------------------------------------------------
# 3. 工作流 — 持久地编排任务
# ------------------------------------------------------------
@wfr.workflow(name="crewai_multi_task_workflow")
def crewai_workflow(ctx: DaprWorkflowContext):
    print("Starting multi-task CrewAI workflow", flush=True)

    latest_news = yield ctx.call_activity(run_task_activity, input="latest_ai_news")
    startup_summary = yield ctx.call_activity(run_task_activity, input="ai_startup_launches")
    policy_updates = yield ctx.call_activity(run_task_activity, input="ai_policy_updates")

    return {
        "latest_news": latest_news,
        "startup_summary": startup_summary,
        "policy_updates": policy_updates,
    }

# ------------------------------------------------------------
# 4. 运行时 + 客户端（入口点）
# ------------------------------------------------------------
if __name__ == "__main__":
    wfr.start()

    client = DaprWorkflowClient()
    instance_id = "crewai-multi-01"

    client.schedule_new_workflow(
        workflow=crewai_workflow,
        input=None,
        instance_id=instance_id
    )

    state = client.wait_for_workflow_completion(instance_id, timeout_in_seconds=60)
    print(state.serialized_output)
```

这个 CrewAI 代理启动了一个工作流，用于收集和汇总 AI 和创业公司相关新闻。

### 创建工作流数据库组件

Dapr Workflows 使用任何支持工作流的 [Dapr 状态存储]({{% ref supported-state-stores %}}) 来持久化状态。
创建一个名为 `components` 的目录，然后创建文件 workflowstore.yaml：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: workflowstore
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

此组件存储：

* 代码执行检查点
* 执行历史
* 确定性恢复状态
* 最终输出数据

### 设置 CrewAI LLM 提供商

CrewAI 需要 LLM 配置或令牌才能运行。请参阅[此处](https://docs.crewai.com/en/concepts/llms#setting-up-your-llm)的说明。

例如，设置 OpenAI：

```
export OPENAI_API_KEY=sk-...
```

### 运行工作流

使用 Dapr CLI 启动 CrewAI 工作流：

```bash
dapr run \
  --app-id crewaiwf \
  --dapr-grpc-port 50001 \
  --resources-path ./components \
  -- python3 ./crewai_workflow.py
```

工作流运行时，每个 CrewAI 任务都作为持久活动执行。
如果进程崩溃，工作流会从中断的地方精确恢复。您可以通过在第一个活动后终止进程，然后使用相同的应用 ID 重新运行上述命令来尝试此操作。

打开 Zipkin 查看工作流追踪：

```
http://localhost:9411
```
