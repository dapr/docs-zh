---
type: docs
title: "在 .NET SDK 中的 workflow history propagation"
linkTitle: "history propagation"
weight: 1700
description: 使用 .NET SDK 与 child workflow 和 activity 共享祖先 workflow 的执行历史
---

## 概述

workflow history propagation 允许父 workflow 将其执行历史共享给 child workflow，并可选择同时共享其完整的祖先链。调用选项也为 activity 提供了 propagation scope，但 .NET 中的公开读取方法是 workflow 上的 `WorkflowContext.GetPropagatedHistory()`，而不是 `WorkflowActivityContext` 上的方法。

常见的使用场景包括：

- 审计追踪：验证多步骤 workflow 中的保管链
- 欺诈检测：在提交交易之前检查上游的决策
- AI Agent Orchestration：在分层的代理 workflow 中传递上下文

概念性的说明请参阅 [workflow history propagation]({{% ref "workflow-history-propagation.md" %}})。

{{% alert title="注意" color="primary" %}}
此功能需要 Dapr .NET SDK v1.18.0 或更高版本，以及 Dapr runtime v1.18.0 或更高版本。
{{% /alert %}}

## propagation scopes

传播是需要显式开启的，并且按调用生效。每次调用 `CallActivityAsync` 或 `CallChildWorkflowAsync` 时，都可以独立指定一个 `HistoryPropagationScope`：

| 作用域 | 说明 |
|---|---|
| `None` | 默认值。不向被调用方传播任何历史。 |
| `OwnHistory` | 仅传播调用方 workflow 自身的事件。祖先历史会被丢弃，起到信任边界的作用。 |
| `Lineage` | 传播调用方 workflow 自身的事件，以及它从自己的父 workflow 继承而来的完整祖先链。 |

## 向 child workflow 传播历史

在 `ChildWorkflowTaskOptions` 上使用 `WithHistoryPropagation`，即可让 child workflow 接收父 workflow 的历史：

```csharp
public sealed class MerchantCheckoutWorkflow : Workflow<Order, CheckoutResult>
{
    public override async Task<CheckoutResult> RunAsync(WorkflowContext context, Order order)
    {
        // 未开启传播的 activity：默认行为，无需显式开启
        await context.CallActivityAsync(nameof(ValidateMerchantActivity), order.MerchantId);

        // 以 Lineage 范围传播完整历史的 child workflow
        var options = new ChildWorkflowTaskOptions()
            .WithHistoryPropagation(HistoryPropagationScope.Lineage);

        var result = await context.CallChildWorkflowAsync<PaymentResult>(
            nameof(ProcessPaymentWorkflow), order, options);

        return new CheckoutResult(result);
    }
}
```

未指定 propagation scope 的调用不会收到任何历史，workflow 中的其他调用也不受这些开启设置的影响。

## 向 activity 传播历史

同样的 `WithHistoryPropagation` 扩展方法也可用于 `WorkflowTaskOptions`，用于 activity 调用：

```csharp
var options = new WorkflowTaskOptions()
    .WithHistoryPropagation(HistoryPropagationScope.OwnHistory);

var auditResult = await context.CallActivityAsync<AuditResult>(
    nameof(WriteAuditTrailActivity), payload, options);
```

{{% alert title="activity 读取器限制" color="warning" %}}
在 SDK 1.19.0 中，activity 调度操作会携带该作用域，但 `WorkflowActivityContext` 只公开 `Identifier`、`InstanceId`、`TaskExecutionKey` 和 `ScheduledEventId`。它没有公开的历史读取器，工作进程也不会填充 activity 的历史属性。当应用代码需要检查传播的历史时，请使用 child workflow；不要假设上面的 activity 可以调用 `GetPropagatedHistory()`。
{{% /alert %}}

## 读取 propagated history

在 child workflow 中，调用 `WorkflowContext` 上的 `GetPropagatedHistory()` 即可获取父 workflow 传递的历史。如果本次调用没有请求传播，该方法返回 `null`。

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
                // evt.Activities —— 该祖先下的 activity 结果
                // evt.Workflows —— 该祖先下的 child workflow 结果
            }
        }

        return await context.CallActivityAsync<PaymentResult>(
            nameof(ChargeCardActivity), order);
    }
}
```

### PropagatedHistory 类型

`GetPropagatedHistory()` 返回 `PropagatedHistory` 对象（或 `null`）。它的 `Events` 属性是一个有序列表，元素类型为 `PropagatedHistoryEvent`，每个祖先 workflow 对应一个元素，按执行顺序排列（最早的祖先在最前，直接父 workflow 在最后）。

每个 `PropagatedHistoryEvent` 表示单个祖先 workflow 对 propagated history 的贡献：

| 成员 | 类型 | 说明 |
|---|---|---|
| `AppId` | `string` | 运行该 workflow 的 Dapr app ID |
| `InstanceId` | `string` | workflow 实例 ID |
| `Name` | `string` | workflow 的名称 |
| `Activities` | `IReadOnlyList<PropagatedHistoryActivityResult>` | 该 workflow 的 activity 结果，按执行顺序排列 |
| `Workflows` | `IReadOnlyList<PropagatedHistoryWorkflowResult>` | 该 workflow 的 child workflow 结果，按执行顺序排列 |

### PropagatedHistoryActivityResult 类型

每个 `PropagatedHistoryActivityResult` 是一个密封记录（sealed record），描述单次 activity 调用：

| 成员 | 类型 | 说明 |
|---|---|---|
| `Name` | `string` | activity 的调度名称 |
| `Status` | `PropagatedHistoryStatus` | 生命周期状态，即 `Pending`、`Completed` 或 `Failed` |
| `Input` | `string?` | 序列化后的输入负载，未设置时为 `null` |
| `Output` | `string?` | 序列化后的输出负载，activity 未完成时为 `null` |
| `FailureDetails` | `WorkflowTaskFailureDetails?` | 当 `Status` 为 `Failed` 时的失败详情，否则为 `null` |

### PropagatedHistoryWorkflowResult 类型

每个 `PropagatedHistoryWorkflowResult` 是一个密封记录，描述单次 child workflow 调用：

| 成员 | 类型 | 说明 |
|---|---|---|
| `Name` | `string` | child workflow 的调度名称 |
| `Status` | `PropagatedHistoryStatus` | 生命周期状态，即 `Pending`、`Completed` 或 `Failed` |
| `Output` | `string?` | 序列化后的输出负载，workflow 未完成时为 `null` |
| `FailureDetails` | `WorkflowTaskFailureDetails?` | 当 `Status` 为 `Failed` 时的失败详情，否则为 `null` |

输入与输出字符串保留所配置的序列化格式，只有在使用 JSON 序列化器时它们才是 JSON。启用二进制负载支持后，它们也可能包含引用信封（reference envelope）。传播不会自动展开所有祖先的负载，请应用兼容的序列化方式，并参阅 [数据引用处理]({{% ref dotnet-workflow-data-references.md %}})。

### PropagatedHistoryStatus 枚举

`PropagatedHistoryStatus` 反映任务在调度之后推进到了哪一步：

| 值 | 说明 |
|---|---|
| `Pending` | 任务已调度，但尚未完成或失败 |
| `Completed` | 任务成功完成 |
| `Failed` | 任务失败 |

## 查询 propagated history

### PropagatedHistory 查询方法

`PropagatedHistory` 提供返回列表的 `Get` 方法，以及通过 `out` 参数返回单个匹配项（最近的一个）的 `TryGet` 方法。所有 `Get` 方法在没有匹配项时都返回空列表。

| 方法 | 返回类型 | 说明 |
|---|---|---|
| `GetByAppId(string)` | `IReadOnlyList<PropagatedHistoryEvent>` | 来自指定 Dapr app ID 的所有事件 |
| `GetByInstanceId(string)` | `IReadOnlyList<PropagatedHistoryEvent>` | 来自指定 workflow 实例 ID 的所有事件 |
| `GetEventsByWorkflowName(string)` | `IReadOnlyList<PropagatedHistoryEvent>` | workflow 名称为指定值的所有事件 |
| `TryGetLastWorkflowEventByName(string, out PropagatedHistoryEvent?)` | `bool` | 获取与 workflow 名称匹配的最近一个事件 |
| `GetAppIds()` | `IReadOnlyList<string>` | 历史中有序且去重的 app ID 列表 |

### PropagatedHistoryEvent 查询方法

每个 `PropagatedHistoryEvent` 还提供查询方法，用于检查该祖先下的 activity 和 child workflow：

| 方法 | 返回类型 | 说明 |
|---|---|---|
| `GetActivitiesByName(string)` | `IReadOnlyList<PropagatedHistoryActivityResult>` | 名称匹配的所有 activity |
| `TryGetLastActivityByName(string, out PropagatedHistoryActivityResult?)` | `bool` | 获取名称匹配的最近一个 activity |
| `GetWorkflowsByName(string)` | `IReadOnlyList<PropagatedHistoryWorkflowResult>` | 名称匹配的所有 child workflow |
| `TryGetLastWorkflowByName(string, out PropagatedHistoryWorkflowResult?)` | `bool` | 获取名称匹配的最近一个 child workflow |

### 示例

```csharp
var history = context.GetPropagatedHistory();

if (history != null)
{
    // 按应用 ID 查询：适用于 multi-app workflow
    var fromOrderApp = history.GetByAppId("order-app");

    // 按 workflow 实例 ID 查询
    var fromSpecificRun = history.GetByInstanceId("checkout-abc123");

    // 按 workflow 名称查询：返回所有匹配项（例如递归或 ContinueAsNew 的情况）
    var checkoutEvents = history.GetEventsByWorkflowName(nameof(MerchantCheckoutWorkflow));

    // 使用 TryGet 获取单个匹配项，避免 null 的歧义
    if (history.TryGetLastWorkflowEventByName(nameof(MerchantCheckoutWorkflow), out var parentEvent))
    {
        // 检查父 workflow 的 activity
        var failedActivities = parentEvent.Activities
            .Where(a => a.Status == PropagatedHistoryStatus.Failed)
            .ToList();

        // 或者按名称查找特定 activity
        if (parentEvent.TryGetLastActivityByName(nameof(ValidateMerchantActivity), out var validation))
        {
            // validation.Status、validation.Output、validation.FailureDetails
        }
    }
}
```

## 安全注意事项

默认情况下，Dapr 在 sidecar 之间对所有跨应用通信使用双向 TLS（mTLS），为 [multi-app workflow]({{% ref "dotnet-workflow-multi-app.md" %}}) 场景中的 propagated history 提供传输层保护。

如需在生产环境中获得更强的保证，请启用 `WorkflowHistorySigning`。该功能使用 SPIFFE 身份对每个历史块进行密码学签名，使接收方 workflow 能够验证 propagated history 的完整性和来源。如果未启用签名，Dapr 会发出警告，提示传播的历史块缺乏加密验证。

有关配置 `WorkflowHistorySigning` 的详细信息，请参阅 [workflow history propagation]({{% ref "workflow-history-propagation.md" %}})。

## 后续步骤

- [workflow history propagation]({{% ref "workflow-history-propagation.md" %}})
- [multi-app workflow]({{% ref "dotnet-workflow-multi-app.md" %}})
- [workflow 管理操作]({{% ref "dotnet-workflow-management-methods.md" %}})
