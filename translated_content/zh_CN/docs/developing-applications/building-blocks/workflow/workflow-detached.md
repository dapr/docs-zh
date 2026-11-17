---
type: docs
title: "Detached workflows"
linkTitle: "Detached workflows"
weight: 2600
description: "调度独立于调用方运行的即发即忘 workflow"
---

除了 [child workflows]({{% ref "#child-workflows" %}})之外，workflow 还可以把另一个 workflow 调度为 _detached workflow_。但在 _detached workflow_ 中，二者的关系是**即发即忘**（fire-and-forget）：调用方 workflow 请求运行时启动一个全新的、完全独立的 workflow instance，然后立即继续执行自身的逻辑，而无需等待该 detached workflow 完成。

调度 detached workflow 时，调用会同步返回新的实例 ID。随后，detached workflow 会作为自己的顶层实例运行，拥有自己的实例 ID、历史记录和生命周期，与由客户端直接调度时完全相同。二者之间没有父子关联：detached workflow 的成功或失败不会回传给调用方，终止调用方也不会终止 detached workflow。

这种引用关系是单向的。调用方 workflow 会在自己的历史记录中把这次派生记录为一个事件，因此它保存着所创建的分离实例的引用。然而，detached workflow 不持有指回调用方的引用：它没有父实例，行为与独立的顶层 workflow 一致。

将派生记录在调用方的历史中，也是为了保证调用方 workflow 的确定性。与任何 workflow 动作一样，派生操作必须被记录在历史中，这样当 workflow [重放]({{% ref "workflow-features-concepts.md#workflow-replay" %}})时，运行时才知道 detached workflow 已经被创建，不会再次调度它。如果没有这条事件，重放时就无法判断 detached workflow 是否已经启动。

{{% alert title="注意" color="primary" %}}
detached workflow 从 Dapr v1.19 起可用。目前 Go（Go SDK v1.16.0 及更高版本）和 .NET（.NET SDK 1.19 及更高版本）已提供 SDK 支持，其他 SDK 的支持即将推出。
{{% /alert %}}

## detached workflow 与 child workflow 的比较

| | Child workflow | Detached workflow |
| --- | --- | --- |
| **与调用方的关系** | 与调用方的生命周期耦合 | 完全独立（即发即忘） |
| **调用方行为** | 获得一个可等待的任务，通常会等待其完成 | 同步获得新实例 ID，并立即继续执行 |
| **返回值与错误** | 输出和异常会回传给调用方 | 不会向调用方回传任何内容 |
| **父级终止** | 终止调用方会同时终止 child workflow | 终止调用方对 detached workflow 没有影响 |
| **Retry policies** | 支持 | 不适用，因为调用方不跟踪其结果 |

如果你需要被调度 workflow 的结果、希望其失败能够向上传播，或希望它随父 workflow 一起终止，请改用 [child workflow]({{% ref "workflow-features-concepts.md#child-workflows" %}})。

## 何时使用 detached workflow

当 workflow 需要触发独立的工作，并且这些工作应与调用方相互隔离时，detached workflow 非常合适，例如：

- **多租户扇出**：workflow 遍历租户、组织或客户，并为每个实体启动一个独立的 workflow，希望每个租户的工作与编排 workflow 之间实现严格隔离。
- **即发即忘的下游工作**：触发后续处理（通知、审计、清理），其结果不应影响启动它的 workflow。
- **分叉一条新的历史链**：启动一个长时间运行或独立管理的 workflow，使其不会膨胀调用方的历史记录，也不与调用方共享故障域。

## 调度 detached workflow

以下示例展示了如何在 `ParentWorkflow` 中调度一个分离的 `AuditWorkflow`。与 child workflow 不同，这里没有需要等待的任务：调用会同步返回新实例 ID，调度 workflow 随即继续执行。调度 workflow 和 detached workflow 都必须像其他 workflow 一样注册到工作进程中。

{{< tabpane text=true >}}

{{% tab "Go" %}}

<!--go-->

```go
// ParentWorkflow 调度一个 detached workflow，并立即继续执行，
// 无需等待它完成。
func ParentWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	// ScheduleNewDetachedWorkflow 启动一个分离的即发即忘 workflow，
	// 并同步返回其实例 ID。这里没有需要等待的任务。
	instanceID, err := ctx.ScheduleNewDetachedWorkflow(AuditWorkflow,
		workflow.WithDetachedWorkflowInput("order-1234"),
	)
	if err != nil {
		return nil, err
	}

	// 父 workflow 不等待即继续执行。
	// detached workflow 的成功或失败不会影响本 workflow。
	return instanceID, nil
}

// AuditWorkflow 作为自己的顶层 workflow instance 独立运行。
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

`ScheduleNewDetachedWorkflowAsync` 接受 workflow 名称，以及可选的 `instanceId`、`input` 和 `startTime` 参数。省略 `instanceId` 时，SDK 会生成一个确定性的 GUID。.NET SDK 不接受 detached workflow 的 App ID 或应用命名空间。

```csharp
// ParentWorkflow 调度一个 detached workflow，并立即继续执行，
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

// AuditWorkflow 作为自己的顶层 workflow instance 独立运行。
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

### detached workflow 选项

调度 detached workflow 时，可以设置以下选项来控制新实例。具体的 API 与命名取决于 SDK。

| 选项 | 说明 |
| --- | --- |
| **实例 ID** | detached workflow 的实例 ID。省略时，会生成形如 `<caller-instance-id>-<n>` 的确定性 ID。 |
| **输入** | 传递给 detached workflow 的输入。 |
| **开始时间** | 将 detached workflow 的启动推迟到指定时间。 |
| **App ID** | 按目标 App ID 在另一个应用上调度 detached workflow，需遵循 [multi-application workflow]({{% ref workflow-multi-app.md %}})的规则。 |
| **应用命名空间** | 目标应用的 Dapr namespace。必须与 App ID 一起使用，并且依照多应用规则，必须与调用方的 namespace 一致。 |

## 相关链接

- [workflow 概述]({{% ref workflow-overview.md %}})
- [功能与概念]({{% ref workflow-features-concepts.md %}})
- [child workflow]({{% ref "workflow-features-concepts.md#child-workflows" %}})
- [multi-application workflow]({{% ref workflow-multi-app.md %}})
- [操作指南：编写 workflow]({{% ref howto-author-workflow.md %}})
