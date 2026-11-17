---
type: docs
title: "第 6 部分：用 workflow 组合 interpreted Actor"
linkTitle: "6. 审批与 workflow"
weight: 166000
description: "运行时定义的审批状态机把结算交给带重试与补偿的 workflow，且无需 sidecar 即可测试"
---

第六个示例把[第 5 部分]({{< ref dotnet-actorsnext-tutorial-interpreted.md >}})中的解释型运行时与一个 Dapr Workflow 放在一起，展示二者如何组合。审批文档是一个长期存在、可寻址的实体，因此它是一个行为以数据形式编写的 interpreted state machine Actor。结算一份已批准的文档则是一个有限且容易失败的过程，因此它是一个 workflow。实体启动 workflow，workflow 再把实体推回去：各自做自己擅长的事。

场景是一个文档流转平台。每种文档类型（费用报销单或合同）都是一个在运行时提供的状态机，而一个编译好的 `InterpretedStateMachineActor` 运行其中的所有类型，因此新增一种文档类型只是配置，而无需代码部署。文档到达 `Approved` 时，一个经过审核的效果会启动结算 workflow：它通知各方、在 retry policy 下扣款，并在扣款无法完成时进行补偿。

本部分的代码位于 `/examples/Actor.Next/06-Approvals/`。

## 两层结构：一个编译好的运行时，多种动态行为

本示例由两层构成，二者从不混用，而保持二者分离正是关键所在。

编译层随程序集一同发布，并在启动时注册一次：唯一的 `InterpretedStateMachineActor` 类型、能力注册表 `ICapabilityRegistry`（收录经过审核的守卫与效果，如 `WithinApprovalLimit`、`StartSettlement` 等）、`InterpretedMachineVerifier`、`InterpretedMachineDeployer`、定义存储以及 `SettlementWorkflow`。它们都不区分费用报销单与合同；这是通用的机制，新增文档类型时无需重新注册。

动态层是 `InterpretedMachineDefinition` 本身（它的状态、转换、分支，以及它所组合的守卫与效果名称），以数据形式编写，并在接入时为每种文档类型分别部署。`ExpenseReport()` 与 `Contract()` 这两个构建器看起来像逻辑，实际上是数据工厂：它们的输出才是动态部分。在真实系统中，同一个定义完全可以从数据库或 HTTP 请求体以 JSON 的形式到达，无需重新编译。两台真正不同的状态机（一台包含 `LegalReview` 阶段，另一台没有）运行在同一个编译好的 Actor 上，正是因为差异存在于数据之中，而非代码之中。

两层通过名称相接，而从不通过引用相连。正如调用 Actor 必须提供其名称一样，定义中从不包含已编译的守卫或效果；它保存的是类似 `"StartSettlement"` 这样的字符串，并在运行时通过能力注册表 binding 到已编译的 `IActorEffect`。验证是保证 binding 一定成功的唯一 checkpoint：`InterpretedMachineVerifier` 在 `InterpretedMachineDeployer.DeployAsync` 内运行，恰好位于定义被存储之前，拒绝结构不健全的定义（存在死胡同或不可达的状态），以及引用了注册表未收录的守卫或效果的定义。有问题的文档类型会在接入时被拦下，而不会出现在正在运行的文档上。

由于行为是数据而运行时是编译好的，新增文档类型就是配置，而非代码部署。接下来的各节正是这种划分的具体展开：一个以数据编写的文档类型、一个作为通往 workflow 接缝的已编译效果，以及一个把数据定义的文档推回去的已编译 workflow。这些已编译的部件都不指定任何一种文档类型。

## 你将构建的内容

### 以数据编写的文档类型

费用报销单状态机是一份 `InterpretedMachineDefinition` 文档。它的 `Approved` 状态带有一个进入效果 `StartSettlement`，这是通往 workflow 的接缝。可选参数会为测试构建一台刻意搁浅（没有出路）的状态机；效果名称也是一个参数，因此测试可以引用一个未注册的效果。

```csharp
public static InterpretedMachineDefinition ExpenseReport(
    bool includeSettlementCompletion = true,
    string settlementEffect = StartSettlementEffect) =>
    new()
    {
        DocumentVersion = 1,
        InitialState = "Draft",
        InitialData = InitialData("ExpenseReport"),
        States =
        [
            new InterpretedStateDefinition { Name = "Draft" },
            new InterpretedStateDefinition { Name = "Submitted" },
            new InterpretedStateDefinition { Name = "InReview" },
            new InterpretedStateDefinition { Name = "Escalated" },
            new InterpretedStateDefinition { Name = "Approved", EntryEffects = [settlementEffect] },
            new InterpretedStateDefinition { Name = "Rejected", Terminal = true },
            new InterpretedStateDefinition { Name = "Archived", Terminal = true },
            new InterpretedStateDefinition { Name = "SettlementFailed", Terminal = true },
        ],
        Transitions = [ /* 包括 Submit、BeginReview，以及共享的 review/approve/settle 尾部 */ ],
    };
```

`InReview` 转换使用一个具名守卫：金额不超过自动审批上限的直接进入 `Approved`，其余则上报给经理。合同类型复用同一段尾部，但插入了一个 `LegalReview` 阶段，因此这两种文档类型确实是运行在同一个已编译 Actor 上的两台不同状态机。

```csharp
new()
{
    Source = "InReview",
    Event = "Approve",
    Branches =
    [
        new InterpretedBranchDefinition { Guards = ["WithinApprovalLimit"], Target = "Approved", Effects = ["RecordDecision"] },
        new InterpretedBranchDefinition { Otherwise = true, Target = "Escalated", Effects = ["NotifyManager"] },
    ],
}
```

### 组合接缝：从 Actor 到 workflow

`StartSettlement` 是能力注册表中一个已编译的 `IActorEffect`，通过注入的 `IDaprWorkflowClient` 构造。进入 `Approved` 时，它会用一个由 Actor 类型与文档 ID 推导出的确定性实例 ID 来调度 workflow。方法调用即一个事件，与任何 Actor 调用一样是至少一次的，因此批准轮次的重新运行会重新调度同一个实例，而不是启动第二个 workflow。这种确定性 ID 正是把[state machine Actor]({{< ref "dotnet-actorsnext-statemachine.md" >}})中的重新运行安全规则，应用到一个真实外部副作用上。

```csharp
public async ValueTask ExecuteAsync(ActorCapabilityContext context, CancellationToken cancellationToken = default)
{
    var bag = ApprovalCapabilityRegistry.State(context);
    var input = new SettlementInput(
        DocumentId: context.ActorId.Value,
        DocumentType: bag.Get<string>("documentType") ?? context.ActorType,
        Requester: bag.Get<string>("requester") ?? string.Empty,
        Amount: bag.Get<decimal>("amount"),
        Parties: bag.Get<string[]>("parties") ?? [],
        SimulateChargeFailure: bag.Get<bool>("simulateChargeFailure"));

    var instanceId = InstanceIdFor(context.ActorType, context.ActorId.Value);   // 形如 "settlement-{type}-{id}"
    await workflowClient.ScheduleNewWorkflowAsync(WorkflowName, instanceId, input);
}
```

### 结算 workflow：重试、补偿并把实体推回去

workflow 先并行扇出通知，然后在 retry policy 下扣款；若扣款的重试次数耗尽，它就进行补偿，并把文档推进到 `SettlementFailed`；若成功，则把文档推进到 `Archived`。把文档推回去使用的是 `IDynamicActorClient`，即组合中从 workflow 到 Actor 的那一半，它不依赖已编译的文档契约。

```csharp
public override async Task<SettlementResult> RunAsync(WorkflowContext context, SettlementInput input)
{
    // 1. 扇出：并行通知每一方。
    await Task.WhenAll(input.Parties.Select(party =>
        context.CallActivityAsync(nameof(NotifyPartiesActivity), new PartyNotification(input.DocumentId, party))));

    // 2. 重试：按退避策略扣款。
    try
    {
        await context.CallActivityAsync(
            nameof(ChargeOrProvisionActivity),
            new ChargeRequest(input.DocumentId, input.Amount, input.SimulateChargeFailure),
            ChargeRetry);
    }
    catch (WorkflowTaskFailedException)
    {
        // 3. 补偿，然后把失败报告回文档实体。
        await context.CallActivityAsync(nameof(ReleaseReservationActivity), new ReleaseRequest(input.DocumentId, input.Amount));
        await context.CallActivityAsync(nameof(SignalDocumentActivity), new DocumentSignal(input.DocumentId, "SettlementFailed"));
        return new SettlementResult(Settled: false, FinalState: "SettlementFailed");
    }

    // 4. 成功：把文档推进到其归档结果。
    await context.CallActivityAsync(nameof(SignalDocumentActivity), new DocumentSignal(input.DocumentId, "SettlementCompleted"));
    return new SettlementResult(Settled: true, FinalState: "Archived");
}
```

`SignalDocumentActivity` 通过动态路径回调 interpreted Actor，即 `client.InvokeAsync("ApprovalDocument", documentId, "Raise", ...)`，触发 `SettlementCompleted` 或 `SettlementFailed`。文档的轮次是在批准轮次已经提交之后运行的，因此这是一个有序的后续操作，而不是可重入调用。

## 测试

这一组合可以在没有 sidecar、也没有 workflow 引擎的情况下测试，接缝两侧都可以测试。

### Actor 启动 workflow，且可安全重新运行

通过解释型状态机（使用假的 Workflow Client）把文档推进到 `Approved`，即可证明进入效果会调度 workflow；而把进入效果运行两次，则可证明它不会启动第二个 workflow，因为实例 ID 是确定性的。

```csharp
[Fact]
public async Task Approving_schedules_settlement_with_a_deterministic_id_and_does_not_double_schedule()
{
    var scheduled = new List<string>();
    var workflowClient = new Mock<IDaprWorkflowClient>();
    workflowClient
        .Setup(client => client.ScheduleNewWorkflowAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<object?>()))
        .Returns((string _, string? instanceId, object? _) => { scheduled.Add(instanceId!); return Task.FromResult(instanceId!); });

    var effect = new StartSettlementEffect(workflowClient.Object, NullLogger.Instance);
    var context = ApprovedContext("exp-9", amount: 250m, parties: ["finance", "alice"]);

    await effect.ExecuteAsync(context);
    await effect.ExecuteAsync(context);   // 模拟批准轮次的至少一次重新运行

    var expected = StartSettlementEffect.InstanceIdFor("ApprovalDocument", "exp-9");
    Assert.All(scheduled, id => Assert.Equal(expected, id));
    Assert.Single(scheduled.Distinct());   // Dapr 按实例 ID 去重，因此只会运行一个 workflow
}
```

### workflow 的重试与补偿

workflow 直接针对一个模拟的 `WorkflowContext` 运行，这与[测试]({{< ref "dotnet-actorsnext-testing.md" >}})工具为 Actor 所用的技术相同。一个测试让扣款成功，并断言文档被归档；另一个测试让扣款耗尽重试次数（抛出 `WorkflowTaskFailedException`），并断言补偿被执行、文档被推进到 `SettlementFailed`。

```csharp
[Fact]
public async Task Charge_that_exhausts_its_retries_compensates_and_fails_the_document()
{
    var input = new SettlementInput("exp-2", "ExpenseReport", "carol", 8500m, ["finance", "carol", "vendor"], SimulateChargeFailure: true);
    var context = MockContext();
    context.Setup(ctx => ctx.CallActivityAsync(nameof(ChargeOrProvisionActivity), It.IsAny<ChargeRequest>(), It.IsAny<WorkflowTaskOptions>()))
        .Returns(Task.FromException(new WorkflowTaskFailedException("charge failed", new WorkflowTaskFailureDetails("Declined", "Charge was declined"))));

    var result = await new SettlementWorkflow().RunAsync(context.Object, input);

    Assert.False(result.Settled);
    Assert.Equal("SettlementFailed", result.FinalState);
    context.Verify(ctx => ctx.CallActivityAsync(nameof(ReleaseReservationActivity), It.IsAny<ReleaseRequest>(), It.IsAny<WorkflowTaskOptions>()), Times.Once());
    context.Verify(ctx => ctx.CallActivityAsync(nameof(SignalDocumentActivity), It.Is<DocumentSignal>(s => s.EventName == "SettlementFailed"), It.IsAny<WorkflowTaskOptions>()), Times.Once());
}
```

还有一个验证测试作为补充：一个搁浅的定义（没有出路的 `Approved` 状态），以及一个引用了未注册效果的定义，都会在上线前被拒绝，与第 5 部分中的做法完全相同，因此有问题的文档类型无法被接入。

### 为什么这一组合是关键

state machine Actor 与 workflow 很容易混淆，本示例展示了一条更具体的边界。文档是响应式的、可寻址的、长期存在的：它回答文档此刻身处何处，并在不定的生命周期内对提交、审核与决定事件作出反应，这正是 state machine Actor 所擅长的。结算则是一个有界的序列，包含重试、补偿性撤销以及明确的终点，这正是 workflow 所擅长、而放进 Actor 轮次中会使其臃肿的部分。具名状态让接缝一目了然：进入 `Approved` 的转换，正是启动该状态所隐含的 workflow 的自然位置；而 workflow 的终态结果，则是回传的自然事件。

## 编写与测试的脉络

每个教程都比上一个更有野心，但测试始终是贯穿全局的主线：第 1 部分中有必要进行最低限度的测试，随后测试在没有数据库的情况下证明了状态迁移。接着，我们在没有 PubSub broker 的情况下验证了事件流，让竞态条件可以重现，最后看到状态机验证器作为部署关卡得以实现。结论是：旧 SDK 能够运行 Actor；新 SDK 则让你能够证明它们是正确的，包括直到运行时才存在的行为。

## 另请参阅

- [state machine Actor]({{< ref dotnet-actorsnext-statemachine.md >}})
- [运行时定义的状态机]({{< ref dotnet-actorsnext-tutorial-interpreted.md >}})
- [动态调用]({{< ref dotnet-actorsnext-dynamic.md >}})
- 返回[教程概览]({{< ref "_index.md" >}})
