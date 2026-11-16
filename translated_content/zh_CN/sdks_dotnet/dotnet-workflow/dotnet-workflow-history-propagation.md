---
type: docs
title: "在 .NET SDK 中传播工作流历史"
linkTitle: "历史传播"
weight: 1700
description: 使用 .NET SDK 与子工作流和活动共享祖先工作流的执行历史
---

## 概述

工作流历史传播允许父工作流将其执行历史共享给子工作流，还可以选择同时共享其完整的祖先链。调用选项也提供了面向活动的传播范围，但 .NET 中的公开读取方法是工作流上的 `WorkflowContext.GetPropagatedHistory()`，而不是 `WorkflowActivityContext` 上的方法。

常见的使用场景包括：

- 审计追踪：验证多步骤工作流中的保管链
- 欺诈检测：在提交交易之前检查上游的决策
- AI 代理编排：在分层的代理工作流中传递上下文

概念性的说明请参阅 [工作流历史传播]({{% ref "workflow-history-propagation.md" %}})。

{{% alert title="注意" color="primary" %}}
此功能需要 Dapr .NET SDK v1.18.0 或更高版本，以及 Dapr 运行时 v1.18.0 或更高版本。
{{% /alert %}}

## 传播范围

传播是需要显式开启的，并且按调用生效。每次调用 `CallActivityAsync` 或 `CallChildWorkflowAsync` 时，都可以独立指定一个 `HistoryPropagationScope`：

| 范围 | 说明 |
|---|---|
| `None` | 默认值。不向被调用方传播任何历史。 |
| `OwnHistory` | 仅传播调用方工作流自身的事件。祖先历史会被丢弃，起到信任边界的作用。 |
| `Lineage` | 传播调用方工作流自身的事件，以及它从自己的父工作流继承而来的完整祖先链。 |

## 向子工作流传播历史

在 `ChildWorkflowTaskOptions` 上使用 `WithHistoryPropagation`，即可让子工作流接收父工作流的历史：

```csharp
public sealed class MerchantCheckoutWorkflow : Workflow<Order, CheckoutResult>
{
    public override async Task<CheckoutResult> RunAsync(WorkflowContext context, Order order)
    {
        // 未传播历史的活动：默认行为，无需显式开启
        await context.CallActivityAsync(nameof(ValidateMerchantActivity), order.MerchantId);

        // 使用 Lineage 范围传播历史的子工作流
        var options = new ChildWorkflowTaskOptions()
            .WithHistoryPropagation(HistoryPropagationScope.Lineage);

        var result = await context.CallChildWorkflowAsync<PaymentResult>(
            nameof(ProcessPaymentWorkflow), order, options);

        return new CheckoutResult(result);
    }
}
```

未指定传播范围的调用不会收到任何历史，工作流中的其他调用也不受这些开启设置的影响。

## 向活动传播历史

同样的 `WithHistoryPropagation` 扩展方法也可用于 `WorkflowTaskOptions`，用于活动调用：

```csharp
var options = new WorkflowTaskOptions()
    .WithHistoryPropagation(HistoryPropagationScope.OwnHistory);

var auditResult = await context.CallActivityAsync<AuditResult>(
    nameof(WriteAuditTrailActivity), payload, options);
```

{{% alert title="活动读取器限制" color="warning" %}}
在 SDK 1.19.0 中，活动调度操作会携带该范围，但 `WorkflowActivityContext` 只公开 `Identifier`、`InstanceId`、`TaskExecutionKey` 和 `ScheduledEventId`。它没有公开的历史读取器，工作进程也不会填充活动的历史属性。当应用代码需要检查传播的历史时，请使用子工作流；不要假设上面的活动可以调用 `GetPropagatedHistory()`。
{{% /alert %}}

## 读取传播的历史

在子工作流中，调用 `WorkflowContext` 上的 `GetPropagatedHistory()` 即可获取父工作流传递的历史。如果本次调用没有请求传播，该方法返回 `null`。

```csharp
public sealed class ProcessPaymentWorkflow : Workflow<Order, PaymentResult>
{
    public override async Task<PaymentResult> RunAsync(WorkflowContext context, Order order)
    {
        var history = context.GetPropagatedHistory();

        if (history != null)
        {
            foreach (var evt in history.Events)
            {
                // evt.Name, evt.InstanceId, evt.AppId
                // evt.Activities —— 该祖先下的活动结果
                // evt.Workflows —— 该祖先下的子工作流结果
            }
        }

        return await context.CallActivityAsync<PaymentResult>(
            nameof(ChargeCardActivity), order);
    }
}
```

### PropagatedHistory 类型

`GetPropagatedHistory()` 返回 `PropagatedHistory` 对象（或 `null`）。它的 `Events` 属性是一个有序列表，元素类型为 `PropagatedHistoryEvent`，每个祖先工作流对应一个元素，按执行顺序排列（最早的祖先在前，直接父工作流在最后）。

每个 `PropagatedHistoryEvent` 表示单个祖先工作流对传播历史的贡献：

| 成员 | 类型 | 说明 |
|---|---|---|
| `AppId` | `string` | 运行该工作流的 Dapr App ID |
| `InstanceId` | `string` | 工作流实例 ID |
| `Name` | `string` | 工作流的名称 |
| `Activities` | `IReadOnlyList<PropagatedHistoryActivityResult>` | 该工作流的活动结果，按执行顺序排列 |
| `Workflows` | `IReadOnlyList<PropagatedHistoryWorkflowResult>` | 该工作流的子工作流结果，按执行顺序排列 |

### PropagatedHistoryActivityResult 类型

每个 `PropagatedHistoryActivityResult` 是一个密封记录（sealed record），描述单次活动调用：

| 成员 | 类型 | 说明 |
|---|---|---|
| `Name` | `string` | 活动的调度名称 |
| `Status` | `PropagatedHistoryStatus` | 生命周期状态，即 `Pending`、`Completed` 或 `Failed` |
| `Input` | `string?` | 序列化后的输入负载，未设置时为 `null` |
| `Output` | `string?` | 序列化后的输出负载，活动未完成时为 `null` |
| `FailureDetails` | `WorkflowTaskFailureDetails?` | 当 `Status` 为 `Failed` 时的失败详情，否则为 `null` |

### PropagatedHistoryWorkflowResult 类型

每个 `PropagatedHistoryWorkflowResult` 是一个密封记录，描述单次子工作流调用：

| 成员 | 类型 | 说明 |
|---|---|---|
| `Name` | `string` | 子工作流的调度名称 |
| `Status` | `PropagatedHistoryStatus` | 生命周期状态，即 `Pending`、`Completed` 或 `Failed` |
| `Output` | `string?` | 序列化后的输出负载，工作流未完成时为 `null` |
| `FailureDetails` | `WorkflowTaskFailureDetails?` | 当 `Status` 为 `Failed` 时的失败详情，否则为 `null` |

输入与输出字符串保留所配置的序列化格式，只有在使用 JSON 序列化器时它们才是 JSON。启用二进制负载支持后，它们也可能包含引用信封（reference envelope）。传播不会自动展开所有祖先的负载，请使用兼容的序列化方式，并参阅 [工作流数据引用]({{% ref dotnet-workflow-data-references.md %}}) 中的数据引用处理方法。

### PropagatedHistoryStatus 枚举

`PropagatedHistoryStatus` 反映任务在调度之后推进到了哪一步：

| 值 | 说明 |
|---|---|
| `Pending` | 任务已调度，但尚未完成或失败 |
| `Completed` | 任务成功完成 |
| `Failed` | 任务失败 |

## 查询传播的历史

### PropagatedHistory 查询方法

`PropagatedHistory` 提供返回列表的 `Get` 方法，以及通过 `out` 参数返回单个匹配项（最近的一个）的 `TryGet` 方法。所有 `Get` 方法在没有匹配项时都返回空列表。

| 方法 | 返回类型 | 说明 |
|---|---|---|
| `GetByAppId(string)` | `IReadOnlyList<PropagatedHistoryEvent>` | 来自指定 Dapr App ID 的所有事件 |
| `GetByInstanceId(string)` | `IReadOnlyList<PropagatedHistoryEvent>` | 来自指定工作流实例 ID 的所有事件 |
| `GetEventsByWorkflowName(string)` | `IReadOnlyList<PropagatedHistoryEvent>` | 工作流名称为指定值的所有事件 |
| `TryGetLastWorkflowEventByName(string, out PropagatedHistoryEvent?)` | `bool` | 获取与工作流名称匹配的最近一个事件 |
| `GetAppIds()` | `IReadOnlyList<string>` | 历史中有序且去重的 App ID 列表 |

### PropagatedHistoryEvent 查询方法

每个 `PropagatedHistoryEvent` 还提供查询方法，用于检查该祖先下的活动和子工作流：

| 方法 | 返回类型 | 说明 |
|---|---|---|
| `GetActivitiesByName(string)` | `IReadOnlyList<PropagatedHistoryActivityResult>` | 名称匹配的所有活动 |
| `TryGetLastActivityByName(string, out PropagatedHistoryActivityResult?)` | `bool` | 获取名称匹配的最近一个活动 |
| `GetWorkflowsByName(string)` | `IReadOnlyList<PropagatedHistoryWorkflowResult>` | 名称匹配的所有子工作流 |
| `TryGetLastWorkflowByName(string, out PropagatedHistoryWorkflowResult?)` | `bool` | 获取名称匹配的最近一个子工作流 |

### 示例

```csharp
var history = context.GetPropagatedHistory();

if (history != null)
{
    // 按应用 ID 查询：适用于多应用工作流
    var fromOrderApp = history.GetByAppId("order-app");

    // 按工作流实例 ID 查询
    var fromSpecificRun = history.GetByInstanceId("checkout-abc123");

    // 按工作流名称查询：返回所有匹配项（例如递归或 ContinueAsNew 的情况）
    var checkoutEvents = history.GetEventsByWorkflowName(nameof(MerchantCheckoutWorkflow));

    // 使用 TryGet 获取单个匹配项，避免 null 的歧义
    if (history.TryGetLastWorkflowEventByName(nameof(MerchantCheckoutWorkflow), out var parentEvent))
    {
        // 检查父工作流的活动
        var failedActivities = parentEvent.Activities
            .Where(a => a.Status == PropagatedHistoryStatus.Failed)
            .ToList();

        // 或者按名称查找特定活动
        if (parentEvent.TryGetLastActivityByName(nameof(ValidateMerchantActivity), out var validation))
        {
            // validation.Status、validation.Output、validation.FailureDetails
        }
    }
}
```

## 安全注意事项

默认情况下，Dapr 在边车之间对所有跨应用通信使用双向 TLS（mTLS），为[多应用工作流]({{% ref "dotnet-workflow-multi-app.md" %}})场景中的传播历史提供传输层保护。

如需在生产环境中获得更强的保证，请启用 `WorkflowHistorySigning`。该功能使用 SPIFFE 身份对每个历史块进行加密签名，使接收方工作流能够验证传播历史的完整性和来源。如果未启用签名，Dapr 会发出警告，提示传播的历史块缺乏加密验证。

有关配置 `WorkflowHistorySigning` 的详细信息，请参阅 [工作流历史传播]({{% ref "workflow-history-propagation.md" %}})。

## 后续步骤

- [工作流历史传播]({{% ref "workflow-history-propagation.md" %}})
- [多应用工作流]({{% ref "dotnet-workflow-multi-app.md" %}})
- [工作流管理操作]({{% ref "dotnet-workflow-management-methods.md" %}})
