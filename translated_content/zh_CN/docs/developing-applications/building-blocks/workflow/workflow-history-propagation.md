---
type: docs
title: "Workflow history propagation"
linkTitle: "History propagation"
weight: 2500
description: "与 child workflow 和 activity 共享父 workflow 的执行历史，用于保管链、审计以及 AI 代理上下文"
---

默认情况下，child workflow 或 activity 只能看到调度它时传入的输入。父 workflow 的执行历史（即运行过哪些 activity、派生过哪些 child workflow、观察到哪些事件）对它们不可见。workflow history propagation 允许父 workflow 选择把这段历史共享给它所调度的 workflow。

这一能力适用于以下场景：

- **保管链与审计**：欺诈检查、合规闸门或结算步骤可以核实上游已经发生的操作，而不必信任调用方的自述。
- **跨应用 workflow**：下游应用（往往由其他团队负责）无需通过带外查询，即可确认上游 activity 确实已经运行。
- **AI 代理与长时间运行的编排**：循环使用 `ContinueAsNew` 或向子代理扇出的代理，可以把上下文（工具调用、模型输出、中间决策）继续向前传递，而无需从头重新发起昂贵的调用。

## Propagation scopes

这里提供两种作用域。默认不进行传播。

| 选项辅助函数 | 携带的作用域值 | 发送的内容 | 适用场景 |
| ------------- | ------------------- | -------------- | -------------- |
| `workflow.PropagateLineage()` | `LINEAGE`（`HISTORY_PROPAGATION_SCOPE_LINEAGE`） | 调用方自身的事件，加上从调用方父 workflow 继承而来的完整祖先链 | 需要完整的保管链：下游希望看到此前发生的一切，一直追溯到根 |
| `workflow.PropagateOwnHistory()` | `OWN_HISTORY`（`HISTORY_PROPAGATION_SCOPE_OWN_HISTORY`） | 仅调用方自身的事件，祖先（父级）链被丢弃 | 信任边界：调用方愿意为自己所做的步骤担保，但接收方不应看到更上游的内容 |

调度时传入的是辅助函数（`PropagateLineage` / `PropagateOwnHistory`），每种 SDK 都有对应的等价写法（见下方示例）。作用域值（`LINEAGE` / `OWN_HISTORY`）是随传播一起携带的运行时枚举名称。

`PropagateOwnHistory` 是信任边界：选择它会告诉运行时停止转发调用方自己收到过的任何历史。当接收方是可信度较低的应用、第三方，或受不同合规规则约束时，这是正确的选择。

### 应该使用哪种作用域？

`PropagateLineage` 是最常见的选择，因为大多数 workflow 都希望接收方看到上游发生过的完整链路，这正是上文保管链、审计和代理上下文用例得以成立的原因。决定取决于你愿意把共享延伸到链路中的多深位置。

只有在跨越信任边界时才使用 `PropagateOwnHistory`：接收方是可信度较低的应用、第三方，或受不同合规规则约束，并且你愿意为自己的步骤担保，但不希望转发从自己的父 workflow 继承来的全部内容。除此之外，优先选择 lineage 作用域。

{{% alert title="注意负载大小" color="primary" %}}
传播的历史作为调度调用负载的一部分携带，并存储在接收方的历史记录中。使用 `PropagateLineage` 时，负载会随祖先链的深度增长：深层的 workflow 树和长时间运行的编排可能接近 Dapr 默认的 gRPC 消息上限（4 MB，该上限可配置）。`PropagateOwnHistory` 会丢弃继承的祖先链，因此负载更小。
{{% /alert %}}

## 设置方法

父 workflow 通过每次调用的选项，为单个 child workflow 或 activity 启用传播。同一 workflow 中的其他调用不受影响，默认仍然是不传播。

{{< tabpane text=true >}}

{{% tab header="Python" %}}

```python
import dapr.ext.workflow as wf

@wfr.workflow(name='MerchantCheckout')
def merchant_checkout(ctx: wf.DaprWorkflowContext, order_json: str):
    # validate_merchant activity 不会接收传播的历史（默认行为）。
    yield ctx.call_activity(validate_merchant, input=order_json)

    # process_payment child workflow 会接收父 workflow 的历史（LINEAGE）。
    result = yield ctx.call_child_workflow(
        process_payment,
        input=order_json,
        propagation=wf.PropagationScope.LINEAGE,
    )
    return result
```

{{% /tab %}}

{{% tab header=".NET" %}}

```csharp
using Dapr.Workflow;

public sealed class MerchantCheckoutWorkflow : Workflow<Order, string>
{
    public override async Task<string> RunAsync(WorkflowContext ctx, Order order)
    {
        // ValidateMerchantActivity 不会接收传播的历史（默认行为）。
        await ctx.CallActivityAsync<bool>(nameof(ValidateMerchantActivity), order);

        // ProcessPaymentWorkflow child workflow 会接收父 workflow 的历史（Lineage）。
        var childOptions = new ChildWorkflowTaskOptions()
            .WithHistoryPropagation(HistoryPropagationScope.Lineage);
        return await ctx.CallChildWorkflowAsync<string>(
            nameof(ProcessPaymentWorkflow),
            order,
            options: childOptions);
    }
}
```

{{% /tab %}}

{{% tab header="Go" %}}

```go
import (
    "github.com/dapr/durabletask-go/workflow"
)

func MerchantCheckout(ctx *workflow.WorkflowContext) (any, error) {
    // activity 不会接收传播的历史（默认行为）。
    if err := ctx.CallActivity("ValidateMerchant").Await(nil); err != nil {
        return nil, err
    }

    // child workflow 会接收父 workflow 的历史（LINEAGE）。
    var result string
    if err := ctx.CallChildWorkflow("ProcessPayment",
        workflow.WithHistoryPropagation(workflow.PropagateLineage()),
    ).Await(&result); err != nil {
        return nil, err
    }
    return result, nil
}
```

{{% /tab %}}

{{< /tabpane >}}

## 访问传播的历史

在 child workflow 或 activity 内部，调用 `GetPropagatedHistory()`（Go / .NET）或 `get_propagated_history()`（Python）。如果调用方选择了传播，它会返回传播的历史；如果没有选择，则返回 `None` / `nil`。

返回的内容是调用方在*调度此次调用那一刻*的执行状态快照，即已经运行完成的步骤，而不包括调用方之后做的任何操作。在上面的 `MerchantCheckout` 父 workflow 中，`ValidateMerchant` 在 child workflow 被调度之前已经完成，因此它会出现在 child workflow 接收到的传播历史中。

下面的示例假定上文所示的父 workflow 已注册为 `MerchantCheckout`，其中包含 activity `ValidateMerchant`，以及以 `Lineage` 方式调用的 child workflow `ProcessPayment`。

{{< tabpane text=true >}}

{{% tab header="Python" %}}

```python
import dapr.ext.workflow as wf

@wfr.workflow(name='FraudDetection')
def fraud_detection(ctx: wf.DaprWorkflowContext, order_json: str):
    history = ctx.get_propagated_history()
    if history is None:
        return 'no upstream history'

    # 仅在非重放时输出，避免重放期间重复记录。这并非必需，只是让日志更清爽。
    if not ctx.is_replaying:
        print(f'scope={history.scope}, workflows={[w.name for w in history.get_workflows()]}')

    try:
        merchant_wf = history.get_last_workflow_by_name('MerchantCheckout')
        validation = merchant_wf.get_last_activity_by_name('ValidateMerchant')
    except wf.PropagationNotFoundError as exc:
        return f'missing required upstream step: {exc}'

    if not validation.completed:
        return 'merchant validation did not complete, rejecting'
    return 'approved'
```

{{% /tab %}}

{{% tab header=".NET" %}}

```csharp
using Dapr.Workflow;

public sealed class FraudDetectionWorkflow : Workflow<Order, string>
{
    public override Task<string> RunAsync(WorkflowContext ctx, Order order)
    {
        var history = ctx.GetPropagatedHistory();
        if (history is null)
            return Task.FromResult("no upstream history");

        // 仅在非重放时输出，避免重放期间重复记录。这并非必需，只是让日志更清爽。
        if (!ctx.IsReplaying)
            Console.WriteLine($"received {history.Events.Count} ancestor workflow event(s)");

        // 验证 MerchantCheckout 是否存在于祖先链中。
        if (!history.TryGetLastWorkflowEventByName(nameof(MerchantCheckoutWorkflow), out _))
            return Task.FromResult("MerchantCheckout missing from propagated history, rejecting");

        return Task.FromResult("approved");
    }
}
```

{{% /tab %}}

{{% tab header="Go" %}}

```go
import (
    "fmt"

    "github.com/dapr/durabletask-go/workflow"
)

func FraudDetection(ctx *workflow.WorkflowContext) (any, error) {
    propagatedHistory := ctx.GetPropagatedHistory()
    if propagatedHistory == nil {
        return "no upstream history", nil
    }

    // 历史既暴露原始事件，也暴露按应用/按实例划分的块。
    fmt.Printf("scope: %s, %d events from apps %v\n",
        propagatedHistory.Scope(), len(propagatedHistory.Events()), propagatedHistory.GetAppIDs())

    // 深入查看某个上游 workflow 的 activity。
    merchantWf, err := propagatedHistory.GetLastWorkflowByName("MerchantCheckout")
    if err != nil {
        return nil, fmt.Errorf("expected MerchantCheckout in propagated history: %w", err)
    }
    validation, err := merchantWf.GetLastActivityByName("ValidateMerchant")
    if err != nil {
        return nil, fmt.Errorf("expected ValidateMerchant in propagated history: %w", err)
    }
    if !validation.Completed {
        return "merchant validation didn't complete, rejecting", nil
    }
    return "approved", nil
}
```

{{% /tab %}}

{{< /tabpane >}}

每种 SDK 提供的底层模型相同：一条按执行顺序排列的祖先 workflow 链，每个节点都带有其身份信息（App ID、实例 ID、名称），以及它所运行的 activity 和 child workflow。通过返回的对象，你可以：

- **列出祖先链**：每个祖先 workflow 对应一项，按执行顺序排列。
- **按名称查找祖先 workflow**：既可以取最近一次匹配，也可以取全部匹配。
- **在某一项中按名称查找 activity 或 child workflow**：模式相同。
- **查看有哪些应用参与了该链**（已去重）。
- **读取父 workflow 选择的 propagation scope**（`LINEAGE` 或 `OWN_HISTORY`），前提是 SDK 在接收方提供了该信息。

各语言的精确方法签名，请参阅 [相关链接](#相关链接) 下列出的可运行示例。

## History propagation in multi-app workflows

当父 workflow（位于应用 A）通过 multi-app workflow 的调用方式调用应用 B 中的 child workflow 时，传播的上下文会跨网络在两个 sidecar 之间传递。有两项机制保护这一次跳转：传输所用的通道，以及上下文本身的签名。

### 传输安全（mTLS）

传播的上下文走的是 sidecar 之间的 gRPC 通道，因此它继承了该通道的全部保护。当 Dapr 以 mTLS 运行时（Helm 和 `dapr init -k` 的默认设置），这些流量会被加密，两个 sidecar 相互认证，因此位于应用 A 与应用 B 之间的任何组件都无法读取或注入该上下文。mTLS 也是下文签名的前提：它提供的 SPIFFE X.509 身份，正是生产方进行签名所用的密钥。

### Workflow history signing

mTLS 保护的是上下文在传输中的安全，但并不能说明内容到达后是否真实可信。签名弥补了这一缺口。启用 `WorkflowHistorySigning` `Configuration` 功能后，生产方应用会使用其 SPIFFE 身份为每个传播的块签名，接收方则可以通过密码学方式验证该块在离开生产方之后未被篡改。关于完整机制（签名如何串联、如何存储，以及加载时如何验证），请参阅 [workflow history signing]({{% ref "workflow-history-signing.md" %}})。

如果未启用 `WorkflowHistorySigning`，daprd 会在每次派发时记录一条警告：

> `propagating unsigned workflow history to child workflow '...' (signing is not configured; context cannot be cryptographically verified by the receiver)`

{{% alert title="将未签名的块视为不可信" color="warning" %}}
不签名时，传播的上下文可以正常使用，但无法通过密码学方式验证。对于高价值决策（如支付、审批），不要把未签名的传播历史当作权威依据。对于依赖保管链的生产部署，请启用 `WorkflowHistorySigning`。
{{% /alert %}}

## ContinueAsNew 与重新运行

无论是 `ContinueAsNew` 还是 `Rerun` workflow 操作，传播的历史都会被正确保留。

- 接收到传播历史的 workflow 如果调用 `ContinueAsNew`，会把同一份传入上下文传给它的下一代。
- 重新运行 workflow 时，会以最初调度时相同的 propagation scope 重新发出 activity / child workflow 调用：`LINEAGE` 保持为 `LINEAGE`，`OWN_HISTORY` 保持为 `OWN_HISTORY`。

这使得长时间运行的代理和崩溃恢复场景都能按预期运行：接收的新一代或重新运行的实例，看到的历史与原始运行相同。

## 后续步骤

了解[如何应用 workflow history signing]({{% ref "workflow-history-signing.md" %}})，以对先前 workflow 或 activity 步骤的有效性进行密码学证明。

{{< button text="workflow 模式 >>" page="workflow-patterns.md" >}}

## 相关链接

- [workflow history signing]({{< ref workflow-history-signing.md >}})
- [workflow 概述]({{< ref workflow-overview.md >}})
- [workflow 功能与概念]({{< ref workflow-features-concepts.md >}})
- [workflow 架构]({{< ref workflow-architecture.md >}})
- [如何编写 workflow]({{< ref howto-author-workflow.md >}})
- [workflow API 参考]({{< ref workflow_api.md >}})
- 试用各 SDK 中的示例代码：
  - [Python 示例](https://github.com/dapr/python-sdk/blob/main/examples/workflow/history_propagation.py)
  - [.NET 教程](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/csharp/history-propagation)
  - [Go 示例](https://github.com/dapr/go-sdk/tree/main/examples/workflow-history-propagation)
