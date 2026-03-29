---
type: docs
title: 工作流概述
linkTitle: 概述
weight: 1000
description: "Dapr Workflow 概述"
---

Dapr workflow 使开发者能够以可靠的方式编写业务逻辑和集成。
由于 Dapr workflows 是有状态的，因此支持长时间运行和容错的应用程序，非常适合编排微服务。
Dapr workflow 可与其他 Dapr 构建块无缝协作，例如服务调用、发布订阅、状态管理和绑定。

持久化、有弹性的 Dapr Workflow 能力：

- 提供内置的工作流运行时来驱动 Dapr Workflow 执行。
- 提供用于以任何语言编写工作流的 SDK。
- 提供 HTTP 和 gRPC API 用于管理工作流（启动、查询、暂停/恢复、触发事件、终止、清除）。

<img src="/images/workflow-overview/workflow-overview.png" width=800 alt="显示 Dapr Workflow 基础的图表">

Dapr Workflow 可以执行的一些示例场景包括：

- 涉及库存管理、支付系统和物流服务之间编排的订单处理。
- 跨多个部门和参与者协调任务的 HR 入职工作流。
- 在全国连锁餐厅中编排数字菜单更新的推出。
- 涉及基于 API 的分类和存储的图像处理工作流。

## 功能

### 工作流和活动

使用 Dapr Workflow，你可以编写活动，然后在工作流中编排这些活动。
工作流活动具有以下特点：

- 工作流中的基本工作单元
- 用于调用其他（Dapr）服务、与状态存储和发布订阅代理交互。
- 用于调用外部第三方服务。

[详细了解工作流活动。]({{% ref "workflow-features-concepts.md##workflow-activities" %}})

### 子工作流

除了活动之外，你还可以编写工作流来调度其他工作流作为子工作流。
子工作流有其自己的实例 ID、历史记录和状态，独立于启动它的父工作流，但终止父工作流会终止其创建的所有子工作流除外。
子工作流还支持自动重试策略。

[详细了解子工作流。]({{% ref "workflow-features-concepts.md#child-workflows" %}})

### 多应用程序工作流

多应用程序工作流使你能够编排跨多个应用程序的复杂业务流程。
这允许工作流在不同应用程序中调用活动或启动子工作流，在保持 Dapr 工作流引擎的安全、可靠性和持久性保证的同时分配工作流执行。

[详细了解多应用程序工作流。]({{% ref "workflow-multi-app.md" %}})

### 定时器和提醒

与 Dapr actors 一样，你可以为任意时间范围安排类似提醒的持久延迟。

[详细了解工作流定时器]({{% ref "workflow-features-concepts.md#durable-timers" %}})和[提醒]({{% ref "workflow-architecture.md#reminder-usage-and-execution-guarantees" %}})

### 用于管理工作流的 Workflow HTTP 调用

当你使用工作流代码创建应用程序并使用 Dapr 运行它时，你可以调用驻留在该应用程序中的特定工作流。
每个独立的工作流可以：

- 通过 POST 请求启动或终止
- 通过 POST 请求触发传递命名事件
- 通过 POST 请求暂停然后恢复
- 通过 POST 请求从状态存储中清除
- 通过 GET 请求查询工作流状态

[详细了解如何使用 HTTP 调用管理工作流。]({{% ref workflow_api.md %}})

## 工作流模式

Dapr Workflow 简化了微服务架构中复杂的有状态协调需求。
以下部分描述了可以从 Dapr Workflow 中受益的几种应用程序模式。

详细了解[不同类型的工作流模式]({{% ref workflow-patterns.md %}})

## 工作流 SDK

Dapr Workflow _authoring SDK_ 是特定语言的 SDK，包含用于实现工作流逻辑的类型和函数。
工作流逻辑存在于你的应用程序中，并通过 gRPC 流由 Dapr 边车中运行的 Dapr Workflow 引擎编排。

### 支持的 SDK

你可以使用以下 SDK 编写工作流。

| 语言堆栈 | 包 |
| - | - |
| Python | [dapr-ext-workflow](https://github.com/dapr/python-sdk/tree/master/ext/dapr-ext-workflow) |
| JavaScript | [DaprWorkflowClient](https://github.com/dapr/js-sdk/blob/main/src/workflow/client/DaprWorkflowClient.ts) |
| .NET | [Dapr.Workflow](https://www.nuget.org/profiles/dapr.io) |
| Java | [io.dapr.workflows](https://dapr.github.io/java-sdk/io/dapr/workflows/package-summary.html) |
| Go | [workflow](https://github.com/dapr/go-sdk/tree/main/client/workflow.go) |

## 试用工作流

### 快速入门和教程

想测试工作流吗？请完成以下快速入门和教程来查看工作流的实际应用：

| 快速入门/教程 | 描述 |
| ------------------- | ----------- |
| [Workflow 快速入门]({{% ref workflow-quickstart.md %}}) | 运行一个包含四个工作流活动的工作流应用程序，了解 Dapr Workflow 的实际应用  |
| [Workflow Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples/demo_workflow) | 了解如何使用 Python `dapr-ext-workflow` 包创建 Dapr Workflow 并调用它。 |
| [Workflow JavaScript SDK 示例](https://github.com/dapr/js-sdk/tree/main/examples/workflow) | 了解如何使用 JavaScript SDK 创建 Dapr Workflow 并调用它。 |
| [Workflow .NET SDK 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow) | 了解如何使用 ASP.NET Core Web API 创建 Dapr Workflow 并调用它。 |
| [Workflow Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows) | 了解如何使用 Java `io.dapr.workflows` 包创建 Dapr Workflow 并调用它。 |
| [Workflow Go SDK 示例](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md) | 了解如何使用 Go `workflow` 包创建 Dapr Workflow 并调用它。 |

### 直接在你的应用中开始使用工作流

想跳过快速入门吗？没问题。你可以直接在你的应用程序中试用工作流构建块。
[安装 Dapr]({{% ref install-dapr-cli.md %}})后，你可以开始使用工作流，从[如何编写工作流]({{% ref howto-author-workflow.md %}})开始。

## 管理工作流

Dapr 通过 HTTP API 和 CLI 提供全面的工作流管理能力。

### 工作流生命周期操作

**启动工作流**
```bash
dapr workflow run MyWorkflow --app-id myapp --input '{"key": "value"}'
```

**监控工作流**
```bash
# 列出给定应用程序的活跃工作流
dapr workflow list --app-id myapp --filter-status RUNNING

# 查看执行历史
dapr workflow history <instance-id> --app-id myapp
```

**控制工作流**
```bash
# 暂停、恢复或终止
dapr workflow suspend <instance-id> --app-id myapp
dapr workflow resume <instance-id> --app-id myapp
dapr workflow terminate <instance-id> --app-id myapp
```

**维护操作**
```bash
# 清除已完成的工作流
dapr workflow purge --app-id myapp --all-older-than 720h
```

详细说明请参阅[如何：管理工作流]({{< ref howto-manage-workflow.md >}})。

## 限制

- **状态存储：**你只能使用支持工作流的状态存储，[如所述]({{% ref supported-state-stores %}})。
- Azure Cosmos DB 有[有效负载和工作流复杂性限制]({{% ref "setup-azure-cosmosdb.md#workflow-limitations" %}})。
- AWS DynamoDB 有[工作流复杂性限制]({{% ref "setup-azure-cosmosdb.md#workflow-limitations" %}})。

## 观看演示

观看[此视频了解 Dapr Workflow 概述](https://youtu.be/s1p9MNl4VGo?t=131)：

{{< youtube id=s1p9MNl4VGo start=131 >}}

## 下一步

{{< button text="工作流功能和概念 >>" page="workflow-features-concepts.md" >}}

## 相关链接

- [工作流 API 参考]({{% ref workflow_api.md %}})
- 试用完整 SDK 示例：
  - [Python 示例](https://github.com/dapr/python-sdk/tree/master/examples/demo_workflow)
  - [JavaScript 示例](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
  - [.NET 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
  - [Java 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
  - [Go 示例](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
