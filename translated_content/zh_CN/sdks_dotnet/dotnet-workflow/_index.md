---
type: docs
title: "Dapr Workflow .NET SDK"
linkTitle: "workflow"
weight: 40000
description: 快速上手 Dapr Workflow 与 Dapr .NET SDK
---

`Dapr.Workflow` 包提供了类型化的 workflow 与活动、托管的工作进程，以及用于管理持久化实例的 `DaprWorkflowClient`。这些指南描述的是 **SDK 1.19.0 或更高版本**；如需完整功能集，请使用 Dapr runtime 1.19。安装该包不会配置 workflow state store，也不会启动所需的运行时服务。

```sh
dotnet add package Dapr.Workflow
```

| 任务 | 指南 |
| --- | --- |
| 注册工作进程/客户端、发现类型，并配置传输或历史缓存 | [客户端注册]({{% ref dotnet-workflowclient-usage.md %}}) |
| 编写确定性的编排、活动、重试、timer/事件、扇出、child workflow 与延续执行 | [编写 workflow]({{% ref dotnet-workflow-authoring.md %}}) |
| 调度、等待、发送信号、挂起/恢复、终止、清除、列出、检查历史或重新运行 | [管理操作]({{% ref dotnet-workflow-management-methods.md %}}) |
| 自定义 JSON 或使用其他序列化器 | [序列化]({{% ref dotnet-workflow-serialization.md %}}) |
| 将活动、child workflow 和 detached workflow 路由到其他应用 | [multi-app workflows]({{% ref dotnet-workflow-multi-app.md %}}) |
| 与 child workflow 共享祖先历史 | [history propagation]({{% ref dotnet-workflow-history-propagation.md %}}) |
| 使用补丁或带版本的名称演进已部署的 workflow | [workflow versioning]({{% ref dotnet-workflow-versioning.md %}}) |
| 卸载大负载或传递显式的二进制引用（alpha） | [Workflow data references]({{% ref dotnet-workflow-data-references.md %}}) |
| 浏览端到端示例 | [示例]({{% ref dotnet-workflow-examples.md %}}) |

workflow 代码在重放期间必须保持确定性。请将 I/O 及其他非确定性工作放在活动中，使外部副作用具有幂等性，并为保留下来的 workflow 历史保持代码与负载的兼容性。
