---
type: docs
title: ".NET SDK 中的多应用程序工作流"
linkTitle: "多应用程序工作流"
weight: 1600
description: 使用 .NET SDK 调用托管在其他 Dapr 应用程序中的活动和子工作流
---

## 概述

Dapr 工作流可以调用托管在不同 Dapr 应用程序中的活动或子工作流。在 .NET 中，多应用程序工作流的支持从以下版本开始：

- **Dapr 运行时 v1.16.0+**
- **Dapr .NET SDK v1.17.0+**

概念性指导和约束在
[多应用程序工作流]({{% ref "workflow-multi-app.md" %}}) 中介绍。

## 要求

多应用程序工作流调用需要：

- 目标应用 ID 必须存在，并且必须注册你调用的活动或工作流。
- 所有参与的应用 ID 必须位于同一命名空间中。
- 所有参与的应用 ID 必须使用相同的工作流（actor）状态存储。

## 在另一个应用程序中调用活动

在调用活动时，在 `WorkflowTaskOptions` 上设置 `TargetAppId` 以在另一个应用程序中执行它：

```csharp
public sealed class BusinessWorkflow : Workflow<string, string>
{
    public override async Task<string> RunAsync(WorkflowContext context, string input)
    {
        var options = new WorkflowTaskOptions { TargetAppId = "App2" };
        var output = await context.CallActivityAsync<string>(nameof(ActivityA), input, options);
        return output;
    }
}
```

父工作流继续在本地进行编排并接收活动结果。

## 在另一个应用程序中调用子工作流

在调用子工作流时，在 `ChildWorkflowTaskOptions` 上设置 `TargetAppId` 以在另一个应用程序中执行它：

```csharp
public sealed class BusinessWorkflow : Workflow<string, string>
{
    public override async Task<string> RunAsync(WorkflowContext context, string input)
    {
        var options = new ChildWorkflowTaskOptions { TargetAppId = "App2" };
        var output = await context.CallChildWorkflowAsync<string>(nameof(Workflow2), input, options);
        return output;
    }
}
```

{{% alert title="注意" color="primary" %}}
当在另一个应用程序中调用工作流时，你需要使用该应用程序期望的工作流名称。
如果目标应用程序是使用命名工作流版本控制的 .NET 应用程序，你可以通过其规范（未版本化）工作流名称调用它，目标应用程序会将其路由到最新版本。命名工作流版本控制需要 Dapr 运行时
v1.17.0 或更高版本（多应用程序工作流仅需要 v1.16.0+）。
{{% /alert %}}

## 后续步骤

- [多应用程序工作流]({{% ref "workflow-multi-app.md" %}})
- [工作流管理操作]({{% ref dotnet-workflow-management-methods.md %}})
