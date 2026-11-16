---
type: docs
title: "分离工作流"
linkTitle: "分离工作流"
weight: 2600
description: "调度独立于调用方运行的即发即忘工作流"
---

除了[子工作流]({{% ref "#child-workflows" %}})之外，工作流还可以把另一个工作流调度为 _分离工作流_。但在 _分离工作流_ 中，二者的关系是**即发即忘**（fire-and-forget）：调用方工作流请求运行时启动一个全新的、完全独立的工作流实例，然后立即继续执行自身的逻辑，而无需等待该分离工作流完成。

调度分离工作流时，调用会同步返回新的实例 ID。随后，分离工作流会作为自己的顶层实例运行，拥有自己的实例 ID、历史记录和生命周期，与由客户端直接调度时完全相同。二者之间没有父子关联：分离工作流的成功或失败不会回传给调用方，终止调用方也不会终止分离工作流。

这种引用关系是单向的。调用方工作流会在自己的历史记录中把这次派生记录为一个事件，因此它保存着所创建的分离实例的引用。然而，分离工作流不持有指回调用方的引用：它没有父实例，行为与独立的顶层工作流一致。

将派生记录在调用方的历史中，也是为了保证调用方工作流的确定性。与任何工作流动作一样，派生操作必须被记录在历史中，这样当工作流[重放]({{% ref "workflow-features-concepts.md#workflow-replay" %}})时，运行时才知道分离工作流已经被创建，不会再次调度它。如果没有这条事件，重放时就无法判断分离工作流是否已经启动。

{{% alert title="注意" color="primary" %}}
分离工作流从 Dapr v1.19 起可用。目前 Go（Go SDK v1.16.0 及更高版本）和 .NET（.NET SDK 1.19 及更高版本）已提供 SDK 支持，其他 SDK 的支持即将推出。
{{% /alert %}}

## 分离工作流与子工作流的比较

| | 子工作流 | 分离工作流 |
| --- | --- | --- |
| **与调用方的关系** | 与调用方的生命周期耦合 | 完全独立（即发即忘） |
| **调用方行为** | 获得一个可等待的任务，通常会等待其完成 | 同步获得新实例 ID，并立即继续执行 |
| **返回值与错误** | 输出和异常会回传给调用方 | 不会向调用方回传任何内容 |
| **父级终止** | 终止调用方会同时终止子工作流 | 终止调用方对分离工作流没有影响 |
| **重试策略** | 支持 | 不适用，因为调用方不跟踪其结果 |

如果你需要被调度工作流的结果、希望其失败能够向上传播，或希望它随父工作流一起终止，请改用[子工作流]({{% ref "workflow-features-concepts.md#child-workflows" %}})。

## 何时使用分离工作流

当工作流需要触发独立的工作，并且这些工作应与调用方相互隔离时，分离工作流非常合适，例如：

- **多租户扇出**：工作流遍历租户、组织或客户，并为每个实体启动一个独立的工作流，希望每个租户的工作与编排工作流之间实现严格隔离。
- **即发即忘的下游工作**：触发后续处理（通知、审计、清理），其结果不应影响启动它的工作流。
- **分叉一条新的历史链**：启动一个长时间运行或独立管理的工作流，使其不会膨胀调用方的历史记录，也不与调用方共享故障域。

## 调度分离工作流

以下示例展示了如何在 `ParentWorkflow` 中调度一个分离的 `AuditWorkflow`。与子工作流不同，这里没有需要等待的任务：调用会同步返回新实例 ID，调度工作流随即继续执行。调度工作流和分离工作流都必须像其他工作流一样注册到 worker 中。

{{< tabpane text=true >}}

{{% tab "Go" %}}

<!--go-->

```go
// ParentWorkflow 调度一个分离工作流，并立即继续执行，
// 无需等待它完成。
func ParentWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	// ScheduleNewDetachedWorkflow 启动一个分离的即发即忘工作流，
	// 并同步返回其实例 ID。这里没有需要等待的任务。
	instanceID, err := ctx.ScheduleNewDetachedWorkflow(AuditWorkflow,
		workflow.WithDetachedWorkflowInput("order-1234"),
	)
	if err != nil {
		return nil, err
	}

	// 父工作流不等待即继续执行。分离工作流的成功或失败不会影响本工作流。
	return instanceID, nil
}

// AuditWorkflow 作为自己的顶层工作流实例独立运行。
func AuditWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var orderID string
	if err := ctx.GetInput(&orderID); err != nil {
		return nil, err
	}
	if err := ctx.CreateTimer(3 * time.Second).Await(nil); err != nil {
		return nil, err
	}
	return "audit completed for " + orderID, nil
}
```

{{% /tab %}}

{{% tab ".NET" %}}

<!--dotnet-->

`ScheduleNewDetachedWorkflowAsync` 接受工作流名称，以及可选的 `instanceId`、`input` 和 `startTime` 参数。省略 `instanceId` 时，SDK 会生成一个确定性的 GUID。.NET SDK 不接受分离工作流的应用 ID 或应用命名空间。

```csharp
// ParentWorkflow 调度一个分离工作流，并立即继续执行，
// 无需等待它完成。
public sealed class ParentWorkflow : Workflow<string, string>
{
    public override async Task<string> RunAsync(WorkflowContext context, string orderId)
    {
        // 返回新的实例 ID。这里没有需要等待的结果。
        string instanceId = await context.ScheduleNewDetachedWorkflowAsync(
            nameof(AuditWorkflow), input: orderId);
        return instanceId;
    }
}

// AuditWorkflow 作为自己的顶层工作流实例独立运行。
public sealed class AuditWorkflow : Workflow<string, string>
{
    public override async Task<string> RunAsync(WorkflowContext context, string orderId)
    {
        await context.CreateTimer(TimeSpan.FromSeconds(3));
        return $"audit completed for {orderId}";
    }
}
```

{{% /tab %}}

{{< /tabpane >}}

### 分离工作流选项

调度分离工作流时，可以设置以下选项来控制新实例。具体的 API 与命名取决于 SDK。

| 选项 | 说明 |
| --- | --- |
| **实例 ID** | 分离工作流的实例 ID。省略时，会生成形如 `<caller-instance-id>-<n>` 的确定性 ID。 |
| **输入** | 传递给分离工作流的输入。 |
| **开始时间** | 将分离工作流的启动推迟到指定时间。 |
| **应用 ID** | 按目标应用 ID 在另一个应用上调度分离工作流，需遵循[多应用程序工作流]({{% ref workflow-multi-app.md %}})的规则。 |
| **应用命名空间** | 目标应用的 Dapr 命名空间。必须与应用 ID 一起使用，并且依照多应用规则，必须与调用方的命名空间一致。 |

## 相关链接

- [工作流概述]({{% ref workflow-overview.md %}})
- [功能与概念]({{% ref workflow-features-concepts.md %}})
- [子工作流]({{% ref "workflow-features-concepts.md#child-workflows" %}})
- [多应用程序工作流]({{% ref workflow-multi-app.md %}})
- [操作指南：编写工作流]({{% ref howto-author-workflow.md %}})
