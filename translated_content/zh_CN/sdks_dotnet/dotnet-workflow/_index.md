---
type: docs
title: "Dapr Workflow .NET SDK"
linkTitle: "工作流"
weight: 40000
description: 快速上手 Dapr Workflow 与 Dapr .NET SDK
---

`Dapr.Workflow` 包提供了类型化的工作流与活动、托管的 worker，以及用于管理持久化实例的 `DaprWorkflowClient`。这些指南描述的是 **SDK 1.19.0 或更高版本**；如需完整功能集，请使用 Dapr 运行时 1.19。安装该包不会配置工作流状态存储，也不会启动所需的运行时服务。

```sh
dotnet add package Dapr.Workflow
```

| 任务 | 指南 |
| --- | --- |
| 注册 worker/客户端、发现类型，并配置传输或历史缓存 | [客户端注册]({{% ref dotnet-workflowclient-usage.md %}}) |
| 编写确定性的编排、活动、重试、定时器/事件、扇出、子工作流与延续执行 | [编写工作流]({{% ref dotnet-workflow-authoring.md %}}) |
| 调度、等待、发送信号、挂起/恢复、终止、清除、列出、检查历史或重新运行 | [管理操作]({{% ref dotnet-workflow-management-methods.md %}}) |
| 自定义 JSON 或使用其他序列化器 | [序列化]({{% ref dotnet-workflow-serialization.md %}}) |
| 将活动、子工作流和分离工作流路由到其他应用 | [多应用工作流]({{% ref dotnet-workflow-multi-app.md %}}) |
| 与子工作流共享祖先历史 | [历史传播]({{% ref dotnet-workflow-history-propagation.md %}}) |
| 使用补丁或带版本的名称演进已部署的工作流 | [版本控制]({{% ref dotnet-workflow-versioning.md %}}) |
| 卸载大负载或传递显式的二进制引用（alpha） | [数据引用]({{% ref dotnet-workflow-data-references.md %}}) |
| 浏览端到端示例 | [示例]({{% ref dotnet-workflow-examples.md %}}) |

工作流代码在重放期间必须保持确定性。请将 I/O 及其他非确定性工作放在活动中，使外部副作用具有幂等性，并为保留下来的工作流历史保持代码与负载的兼容性。
