---
type: docs
title: "MCP Toolbox for Databases"
linkTitle: "MCP Toolbox for Databases"
weight: 50
description: "加载用于数据库交互的 MCP Toolbox 工具"
---

Dapr Agents 通过实现一个包装器来支持与 [MCP Toolbox for Databases](https://mcp-toolbox.dev/documentation/introduction/) 集成，该包装器会把可用工具加载为 Dapr Agents 使用的 `Tool` 模型。  
  
要集成 Toolbox，请按如下方式加载工具：

```python
from toolbox_core import ToolboxSyncClient

client = ToolboxSyncClient("http://127.0.0.1:5000")
try:
    agent_tools = AgentTool.from_toolbox_many(client.load_toolset("your-tools-name-here"))
    agent = DurableAgent(
        # ...
        tools=agent_tools,
    )
finally:
    client.close()
```

或者将其放在 `with` 语句中：

```python
from toolbox_core import ToolboxSyncClient
with ToolboxSyncClient("http://127.0.0.1:5000") as client:
    agent_tools = AgentTool.from_toolbox_many(client.load_toolset("your-tools-name-here"))
    agent = DurableAgent(
        # ...
        tools=agent_tools,
    )
```
