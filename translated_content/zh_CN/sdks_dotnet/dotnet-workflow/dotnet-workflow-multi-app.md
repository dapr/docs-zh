---
type: docs
title: ".NET SDK 中的多应用程序工作流"
linkTitle: "多应用程序工作流"
weight: 1600
description: 使用 .NET SDK 调用托管在其他 Dapr 应用程序中的活动和子工作流
---

## 概述

Dapr 工作流可以调用托管在其他 Dapr 应用程序中的活动或子工作流。在 .NET 中，多应用程序工作流的支持始于以下版本：

- **Dapr 运行时 v1.16.0+**
- **Dapr .NET SDK v1.17.0+**

概念性指导和约束见 [多应用程序工作流]({{% ref "workflow-multi-app.md" %}})。

## 要求

多应用程序工作流调用需要满足以下条件：

- 目标应用 ID 必须存在，并且必须注册你调用的活动或工作流。
- 所有参与的应用 ID 必须位于同一命名空间中。
- 所有参与的应用 ID 必须使用相同的工作流（actor）状态存储。

{{% alert title="数据引用兼容性" color="warning" %}}
在[工作流数据引用实现（alpha）]({{% ref dotnet-workflow-data-references.md %}})中，跨应用的活动、子工作流和分离工作流的输入**默认内联**，即使发送方主机使用了 `PayloadWritePreference.PreferReference`。发送方会在提交调用之前解析顶层的 `PayloadReference<T>`，因此目标端应接受普通的 `T`，无需为该输入启用负载支持。发送方需要已注册的负载支持和存储访问权限才能内联引用；解析错误会阻止提交，而不会回退为发送引用。

只有在目标端兼容且支持负载时，才应在调用的 `WorkflowTaskOptions` 或 `ChildWorkflowTaskOptions` 上设置 `AllowPayloadReferences: true`。这只会允许主机的写入偏好生效，不会强制卸载，也不会覆盖 `PreferInline`。每个读取方都必须通过自己的边车，将引用的存储名称和键解析为同一个二进制对象，并且序列化与契约需兼容。独立的内存存储不共享对象。

[JavaScript SDK]({{% ref js-workflow-data-references.md %}}) 也支持 `@dapr/dapr` 3.19.0 中的版本 1 信封，前提是序列化和存储访问兼容，但它不实现负载阶段的反向转换。不要假定其他语言的 SDK 支持数据引用。默认内联只覆盖顶层调用输入，不包括嵌套引用、结果或已传播的历史记录。示例与限制见[跨应用输入处理]({{% ref dotnet-workflow-data-references.md %}}#cross-app-input-handling)。
{{% /alert %}}

## 在另一个应用程序中调用活动

在调用活动时，在 `WorkflowTaskOptions` 上设置 `TargetAppId`，即可在另一个应用程序中执行该活动：

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

父工作流继续在本地编排，并接收活动的结果。

## 在另一个应用程序中调用子工作流

在调用子工作流时，在 `ChildWorkflowTaskOptions` 上设置 `TargetAppId`，即可在另一个应用程序中执行该子工作流：

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
在另一个应用程序中调用工作流时，你需要使用该应用程序所期望的工作流名称。
如果目标应用程序是使用命名工作流版本控制的 .NET 应用程序，你可以通过其规范（未版本化）工作流名称调用它，目标应用程序会将其路由到最新版本。命名工作流版本控制需要 Dapr 运行时 v1.17.0 或更高版本（多应用程序工作流仅需要 v1.16.0+）。
{{% /alert %}}

## 在另一个应用程序中调度分离工作流

SDK/运行时 1.19 还支持从工作流上下文中调度独立的、重放安全的分离工作流：

```csharp
var detachedId = await context.ScheduleNewDetachedWorkflowAsync(
    workflowName: "DocumentWorkflow",
    instanceId: null,
    input: document,
    startTime: null,
    options: new WorkflowTaskOptions(TargetAppId: "document-service"));
```

与 `CallChildWorkflowAsync` 不同，这里返回的是已调度的 ID，而不等待输出。分离实例的失败与终止语义相互独立：终止源工作流不会终止它。选项重载允许 `TargetAppId` 和 `AllowPayloadReferences`，但会拒绝 `RetryPolicy` 以及除 `None` 之外的任何 `PropagationScope`。

## 事件与客户端的目标指定

`WorkflowContext.SendEvent` 不接受 `TargetAppId`，它只会向当前应用程序中的实例发送信号。对于外部事件的提交，`DaprWorkflowClient.RaiseEventAsync` 的目标是与客户端边车关联的应用程序，而不是任意的应用 ID 参数。不要在确定性的工作流代码中直接调用管理客户端来绕过此限制；请把外部 I/O 放在活动中完成。

## 后续步骤

- [多应用程序工作流]({{% ref "workflow-multi-app.md" %}})
- [工作流管理操作]({{% ref dotnet-workflow-management-methods.md %}})
