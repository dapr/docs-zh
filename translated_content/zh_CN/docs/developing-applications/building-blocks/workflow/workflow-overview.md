---
type: docs
title: 工作流概述
linkTitle: 概述
weight: 1000
description: "Dapr Workflow 概述：Dapr 中的持久执行引擎"
---

Dapr Workflow 是一个持久执行引擎。你使用 Dapr SDK，以普通代码的形式编写工作流逻辑。
Dapr 会持久化每个已完成步骤的结果，并在崩溃、重启或重新部署后，从最后一个已完成的步骤恢复工作流。
Dapr 工作流是有状态的，因此支持长时间运行和容错的应用程序。
它们还会编排其他 Dapr 构建块，例如服务调用、发布订阅、状态管理和绑定。

持久化、有弹性的 Dapr Workflow 能力：

- 提供内置的工作流运行时，用于驱动 Dapr Workflow 执行。
- 提供用于以代码编写工作流的 SDK。参见[支持的 SDK](#支持的-sdk)。
- 提供 HTTP 和 gRPC API，用于管理工作流（启动、查询、暂停/恢复、触发事件、终止、清除）。

{{< diagram name="workflow-overview" width="80" >}}

Dapr Workflow 可以执行的一些示例场景包括：

- 涉及库存管理、支付系统和物流服务之间编排的订单处理。
- 跨多个部门和参与者协调任务的 HR 入职工作流。
- 在全国连锁餐厅中编排数字菜单更新的推出。
- 涉及基于 API 的分类与存储的图像处理工作流。

## 功能

### 工作流和活动

使用 Dapr Workflow，你可以编写活动，然后在工作流中编排这些活动。
工作流活动具有以下特点：

- 工作流中的基本工作单元
- 用于调用其他（Dapr）服务、与状态存储和发布订阅代理交互
- 用于调用外部第三方服务

[详细了解工作流活动。]({{% ref "workflow-features-concepts.md##workflow-activities" %}})

### 子工作流

除活动外，你还可以编写工作流，将其他工作流调度为子工作流。
子工作流拥有独立于启动它的父工作流的实例 ID、历史记录和状态，但终止父工作流会同时终止由其创建的所有子工作流。
子工作流还支持自动重试策略。

[详细了解子工作流。]({{% ref "workflow-features-concepts.md#child-workflows" %}})

### 分离工作流

你还可以将一个新工作流调度为_分离工作流_：这是一种即发即忘（fire-and-forget）的实例，完全独立于启动它的工作流运行。调用方工作流会立即收到新实例的 ID 并继续执行，而分离工作流的成功或失败不会回传给调用方。这适用于触发相互独立的工作，例如按租户进行的扇出（fan-out）处理。

[详细了解分离工作流。]({{% ref "workflow-detached.md" %}})

### 多应用程序工作流

多应用程序工作流使你能够编排跨越多个应用程序的复杂业务流程。这允许工作流在不同应用程序中调用活动或启动子工作流，在分布工作流执行的同时，保持 Dapr 工作流引擎的安全性、可靠性和持久性保证。

[详细了解多应用程序工作流。]({{% ref "workflow-multi-app.md" %}})

### 历史签名

当启用 mTLS 和 `WorkflowHistorySigning` 功能标志时，Dapr 会使用边车的 X.509 SPIFFE 身份，对每个工作流历史事件进行加密签名。
每次加载时，都会验证完整的签名链，从而检测状态存储中工作流状态是否遭到篡改。

例如，考虑一个订单处理工作流：它先收款，再发货，最后发送收据邮件。如果没有签名，拥有状态存储写权限的攻击者就可以在收款与发货两步之间篡改记录的订单总额，使工作流以低于实际收款的价格发货，而 Dapr 无从得知。启用签名后，被修改的事件将与其签名不再匹配，下一次加载时验证失败，Dapr 会将该工作流标记为 `FAILED`，错误类型为 `DAPR_WORKFLOW_HISTORY_TAMPERED`，而不会依据伪造的数据采取行动。同样的保护也适用于将审批从拒绝改为通过、向外发出的消息中添加额外收件人，或在收件箱中注入伪造的活动结果等情况。

签名是单向的承诺：一旦为某个工作流启用，就无法再禁用。

[详细了解工作流历史签名。]({{% ref "workflow-history-signing.md" %}})

### 快速路径

`WorkflowsFastPath` 预览功能会在已持有相应工作的主机上驱动工作流轮次和活动主体，并将活动完成事件合并到下一轮的单次状态存储提交中，而不是为每个事件创建调度器提醒。这消除了每个事件的调度器往返开销，也去掉了工作流热路径上的大部分状态存储提交。至少一次执行语义保持不变：每个实例的 janitor 提醒，以及自动回退到持久提醒的机制，提供了恢复能力。

[详细了解工作流快速路径。]({{% ref "workflow-fast-path.md" %}})

### 定时器和提醒

与 Dapr Actor 一样，你可以为任意时间范围安排类似提醒的持久延迟。

[详细了解工作流定时器]({{% ref "workflow-features-concepts.md#durable-timers" %}})和[提醒]({{% ref "workflow-architecture.md#reminder-usage-and-execution-guarantees" %}})

### 历史传播

工作流历史传播使当前工作流能够回顾其自身或其他工作流已执行的事件集合，并验证这些事件确实发生过。其适用场景包括欺诈检查、合规门禁检查（某个活动是否被调用），或让长时间运行的 AI 智能体/工作流在跨多次调用（多智能体、多应用工作流）时保持上下文，以判断智能体或工作流所声称已做的事情是否属实。

父工作流可以选择与子工作流和活动共享其执行历史，适用于证据链（chain-of-custody）验证、欺诈检测、审计，以及需要跨多跳传递的 AI 智能体上下文。

详细信息请阅读 [工作流历史传播 ]({{% ref "workflow-history-propagation.md" %}} 以了解如何将其应用于工作流、子工作流和活动。

[详细了解工作流历史传播。]({{< ref workflow-history-propagation.md >}})

### 用于管理工作流的 HTTP 调用

当你使用工作流代码创建应用程序并通过 Dapr 运行它时，你可以调用该应用程序中驻留的特定工作流。
每个工作流都可以：

- 通过 POST 请求启动或终止
- 通过 POST 请求触发并投递一个命名事件
- 通过 POST 请求暂停，然后恢复
- 通过 POST 请求从状态存储中清除
- 通过 GET 请求查询工作流状态

[详细了解如何使用 HTTP 调用管理工作流。]({{% ref workflow_api.md %}})

## 工作流模式

Dapr Workflow 简化了微服务架构中复杂的有状态协调需求。
以下各节描述了可受益于 Dapr Workflow 的几种应用模式。

详细了解[不同类型的工作流模式]({{% ref workflow-patterns.md %}})

## 工作流 SDK

Dapr Workflow 的_编写用 SDK_（authoring SDK）是特定语言的 SDK，包含用于实现工作流逻辑的类型和函数。
工作流逻辑存在于你的应用程序中，并由 Dapr 边车中运行的 Dapr Workflow 引擎通过 gRPC 流进行编排。

### 支持的 SDK

你可以使用以下 SDK 编写工作流。

| 语言堆栈 | 包 |
| - | - |
| Python | [dapr.ext.workflow](https://github.com/dapr/python-sdk/tree/main/dapr/ext/workflow)，通过 `pip install "dapr[workflow]"` 安装 |
| JavaScript | [DaprWorkflowClient](https://github.com/dapr/js-sdk/blob/main/src/workflow/client/DaprWorkflowClient.ts) |
| .NET | [Dapr.Workflow](https://www.nuget.org/profiles/dapr.io) |
| Java | [io.dapr.workflows](https://dapr.github.io/java-sdk/io/dapr/workflows/package-summary.html) |
| Go | [workflow](https://github.com/dapr/durabletask-go/tree/main/workflow) |

## 试用工作流

### 快速入门和教程

想测试工作流吗？请完成以下快速入门和教程，了解工作流的实际应用：

| 快速入门/教程 | 描述 |
| ------------------- | ----------- |
| [Workflow 快速入门]({{% ref workflow-quickstart.md %}}) | 运行一个包含五个工作流活动的工作流应用程序，了解 Dapr Workflow 的实际应用 |
| [Workflow 教程](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow) | 在 Python、.NET 或 Java 中为每种工作流模式各运行一个示例。示例涵盖任务链、扇出/扇入、子工作流、监控、外部系统交互、弹性与补偿、版本管理、工作流管理和历史传播。Go 提供历史传播教程。 |
| [Workflow Python SDK 示例](https://github.com/dapr/python-sdk/tree/main/examples/workflow) | 了解如何使用 Python `dapr.ext.workflow` 包创建 Dapr Workflow 并调用它。 |
| [Workflow JavaScript SDK 示例](https://github.com/dapr/js-sdk/tree/main/examples/workflow) | 了解如何使用 JavaScript SDK 创建 Dapr Workflow 并调用它。 |
| [Workflow .NET SDK 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow) | 了解如何使用 ASP.NET Core Web API 创建 Dapr Workflow 并调用它。 |
| [Workflow Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows) | 了解如何使用 Java `io.dapr.workflows` 包创建 Dapr Workflow 并调用它。 |
| [Workflow Go SDK 示例](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md) | 了解如何使用 Go `workflow` 包创建 Dapr Workflow 并调用它。 |

### 直接在你的应用中开始使用工作流

想跳过快速入门吗？没问题。你可以直接在你的应用程序中试用工作流构建块。
[安装 Dapr]({{% ref install-dapr-cli.md %}})后，即可从[如何编写工作流]({{% ref howto-author-workflow.md %}})开始使用工作流。

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

详细说明请参阅[操作指南：管理工作流]({{< ref howto-manage-workflow.md >}})。

**可视化查看工作流**

在本地开发期间，你可以使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 浏览工作流实例、检查其状态，并深入查看每次执行的事件历史。

## 限制

- **状态存储：**你只能使用支持工作流的状态存储，[如所述]({{% ref supported-state-stores %}})。
- Azure Cosmos DB 有[有效负载和工作流复杂性限制]({{% ref "setup-azure-cosmosdb.md#workflow-limitations" %}})。
- AWS DynamoDB 有[工作流复杂性限制]({{% ref "setup-azure-cosmosdb.md#workflow-limitations" %}})。

## 工作流安全

Dapr 通过 `WorkflowAccessPolicy` 资源，为工作流和活动调度提供细粒度的访问控制。你可以限制哪些应用程序被允许启动特定工作流，或调用应用程序上的特定活动。

应用程序（appID）的工作流访问策略会在应用实例化时由边车加载，之后在添加、更新或删除策略时进行热重载。策略是纯粹的允许列表（allow-list），由被调用方一侧进行评估：只有当已加载的某个策略中存在与调用方及工作流或活动名称相匹配的规则时，跨应用调度才会被允许。

这对于多应用程序工作流尤为重要，因为在这类工作流中，活动和子工作流会跨越应用边界执行。有关完整的配置详情，请阅读[操作指南：应用工作流访问策略]({{% ref workflow-access-policy %}})。

## 观看演示

观看[此视频，了解 Dapr Workflow 概述](https://youtu.be/s1p9MNl4VGo?t=131)：

{{< youtube id=s1p9MNl4VGo start=131 >}}

## 下一步

{{< button text="工作流功能和概念 >>" page="workflow-features-concepts.md" >}}

## 相关链接

- [工作流 API 参考]({{% ref workflow_api.md %}})
- 在 Quickstarts 仓库中[运行工作流教程](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow)
- 试用完整的 SDK 示例：
  - [Python 示例](https://github.com/dapr/python-sdk/tree/main/examples/workflow)
  - [JavaScript 示例](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
  - [.NET 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
  - [Java 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
  - [Go 示例](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
