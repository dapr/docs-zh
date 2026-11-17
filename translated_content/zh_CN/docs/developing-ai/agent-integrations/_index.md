---
type: docs
title: "Agent 集成"
linkTitle: "Agent 集成"
weight: 25
description: "为 Google ADK、Claude Agent SDK、CrewAI、LangChain Deep Agents、HolmesGPT、LangGraph、OpenAI Agents SDK、Pydantic AI、Strands Agents、Microsoft Agent Framework 和 Flock 提供持久执行"
---

### Dapr 中的社区 agent 集成是什么？

Agent 会失败。Pod 会被驱逐，进程会崩溃，笔记本电脑也可能在运行途中死机。如果没有持久执行，这些故障就意味着上下文丢失、工具调用重复、token 被白白消耗，而 agent 只能从头开始。[Diagrid](https://www.diagrid.io/) 维护着一个开源库来彻底解决这个问题：它可以直接嵌入你现有的 agent 代码，并用 [Dapr Workflow]({{% ref workflow-overview %}}) 将其包装起来，把每一次大型语言模型 (LLM) 调用和每一次工具执行都变成可持久化、带检查点的 activity。只需大约**三行代码**，即可获得**大规模运行的自动故障检测与恢复能力**：

```python
# 1. 包装现有 agent——无需重写
runner = DaprWorkflowAgentRunner(agent=agent, name="my-agent")
# 2. 启动持久 workflow 运行时
runner.start()
# 3. 运行它——现在每一步都会设置检查点，并具备崩溃防护能力
async for event in runner.run_async(user_message="...", session_id="..."):
    ...
```

这些扩展由社区构建，并由 Diagrid 基于 Dapr Workflow 进行维护。它们不属于 Dapr 核心项目，但以开源形式发布在 [diagridio/python-ai](https://github.com/diagridio/python-ai) 下。欢迎随时在 [Diagrid Community Discord](https://diagrid.ws/diagrid-community) 中提问、反馈 bug 或分享示例。

#### 支持的框架

| 框架 | 持久化的内容 | 安装 |
|-----------|-----------------------|---------|
| [Google ADK](https://docs.diagrid.io/getting-started/quickstarts/ai-agents/?agentframework=adk) | ADK agent 中的每一次 LLM 调用和工具执行 | `pip install "diagrid[adk]"` |
| [Claude Agent SDK](https://docs.diagrid.io/getting-started/quickstarts/ai-agents/?agentframework=claude-agents) | 每一次 Anthropic API 轮次和工具调用，并支持并行的 `tool_use` 扇出 | `pip install "diagrid[claude_agents]"` |
| [CrewAI](https://docs.diagrid.io/getting-started/quickstarts/ai-agents/?agentframework=crewai) | 每一次 crew/task 的 LLM 调用和工具执行 | `pip install "diagrid[crewai]"` |
| [LangChain Deep Agents](https://docs.diagrid.io/getting-started/quickstarts/ai-agents/?agentframework=deepagents) | Deep Agents 图（基于 LangGraph 构建） | `pip install "diagrid[deepagents]"` |
| [HolmesGPT](https://github.com/diagridio/python-ai/tree/main/diagrid/agent/holmesgpt) | 每一次调查迭代和工具调用，以及可持久化的人工介入（human-in-the-loop）审批 | `pip install "diagrid[holmesgpt]"` |
| [LangGraph](https://docs.diagrid.io/getting-started/quickstarts/ai-agents/?agentframework=langgraph) | 图中的每一个节点执行 | `pip install "diagrid[langgraph]"` |
| [OpenAI Agents SDK](https://docs.diagrid.io/getting-started/quickstarts/ai-agents/?agentframework=openai-agents) | 每一次 LLM 调用和工具执行 | `pip install "diagrid[openai_agents]"` |
| [Pydantic AI](https://docs.diagrid.io/getting-started/quickstarts/ai-agents/?agentframework=pydantic-ai) | 每一次 LLM 调用和工具执行 | `pip install "diagrid[pydantic_ai]"` |
| [Strands Agents](https://docs.diagrid.io/getting-started/quickstarts/ai-agents/?agentframework=strands) | Strands agent 循环中的每一次工具调用 | `pip install "diagrid[strands]"` |
| [Microsoft Agent Framework](https://docs.diagrid.io/getting-started/quickstarts/ai-agents/?agentframework=microsoft-dotnet) | 每一次 agent 调用都作为一个 Dapr Workflow activity 运行 | `dotnet add package Diagrid.AI.Microsoft.AgentFramework` |
| [Flock](https://whiteducksoftware.github.io/flock/) | 通过 Dapr state store 持久化黑板状态和产物，同时保持 Flock agent 定义不变 | `pip install "flock-core[dapr]"` |
