---
type: docs
title: ".NET SDK 中的 state machine Actor"
linkTitle: "state machine Actor"
weight: 130000
description: "使用 StateMachineActor 将长期存活的响应式实体编写为状态机，并对其进行确定性测试"
---

某些 Actor 本质上就是状态机：一个连接、一台设备、一场拍卖、一个订阅、一份租约。每个 Actor 都是长期存活、可寻址的实体，它会对事件作出反应，并在不确定的生命周期内经历明确的状态迁移。`Dapr.Actors.Next` 为此提供了一等模型 `StateMachineActor<TState, TData>`：从外部看，它仍是普通的强类型 Dapr Actor；从内部看，你可以把行为编写为明确的状态机。

## 何时使用 state machine Actor

当一个 Actor 只有少量不同的状态，并且它能做什么取决于其所处的状态时，就应考虑这种模型。把这些状态和转换显式地编码出来，可以让规则一目了然，避免非法转换意外发生；而且由于状态机是一张表，而不是分散的 `if` 语句，测试运行时可以替你检查其结构。

如果一个 Actor 只是简单的数据持有者，或者它的方法并不依赖显式的生命周期状态，那么普通的 `[DaprActor]` Actor 才是更好的选择；状态机模型会增加你用不上的结构。

### 它与 Dapr Workflows 的关系

state machine Actor 与 Dapr Workflows 解决的是不同的问题，而混淆两者是最常见的建模错误，因为一个有状态、多步骤的事物乍看之下两者都可以用。区别在于工作单元究竟是什么。

workflow instance 是一次编排：其进度通过重放已记录的历史被持久地跟踪。workflow 擅长编排多个步骤和服务，支持重试、超时、扇出与扇入，并且在中途失败时可能进行补偿。编排可以是短期的，也可以是长期的；它可以无限循环，并通过“continue as new”执行来保持历史有界，因此它不必一定运行到单一的完成。

state machine Actor 则是一个实体：一个单一的、可寻址的事物，它无限期存活，并由许多短暂的执行作用于它。它擅长保存当前状态、在一次轮次中从内存中立即同步回答对该状态的读取，以及在其整个生命周期中响应事件流。

| 方面 | state machine Actor | Dapr Workflow |
| --- | --- | --- |
| 工作单元 | 长期存活、可寻址的实体 | 跨服务的步骤编排 |
| 生命周期 | 无限期；在激活之间持续转换并持久化 | 长期存活；可无限循环并以新执行继续，因此不要求终止 |
| 执行 | 基于轮次、单线程地作用于已持久化的状态 | 代码针对已记录的历史进行重放，通过“continue as new”压缩 |
| 读取当前状态 | 同步，在一次轮次中从内存读取 | 可查询的编排状态 |
| 事件速率 | 将高频事件作为低成本的轮次处理 | 频繁的 external event 会增大重放历史，通过压缩缓解 |
| 定位 | 是其他人交互的对象 | 编排其他工作 |

拍卖是最典型的例子：它看起来像一个流程，实际上却是一个实体。它会收到高频率的出价，每位竞拍者都需要即时读取当前最高价，而临近结束时的一次出价会延长截止时间，并与关闭 timer 产生竞争。在这样的出价频率下，workflow 会积累大量重放历史，无法干净地回答同步读取，并且会笨拙地建模“timer 与出价之间的竞争”。state machine Actor 则把这一切都当作普通的轮次来处理。

### 两者如何相互补充

两者可以组合使用，设计良好的系统往往会同时使用两者，各自发挥所长。

实体在进入一个会开启有限流程的状态时，会把工作交给 workflow。当拍卖转入 `Sold` 时，它的进入动作会启动一个履约 workflow，负责向中标者收费、通知落选者并安排发货，并在支付失败时进行补偿。Actor 仍是存活的、可寻址的实体；workflow 负责有界的多步骤编排，然后结束。

workflow 也可以作为其编排的一部分驱动实体。供应或订单 workflow 可以调用 Actor 的方法来保留库存或更新设备，并在完成时向 Actor 发送信号。workflow 负责协调各个步骤；而 Actor 是这些步骤所作用的可寻址对象。

一条实用的经验法则是：一个响应式、可寻址、无限期存活的事物是 state machine Actor，而它所启动或协调的有限多步骤流程则是 workflow。命名的状态让两者的边界变得清晰，因为转入某个状态的那一刻，正是启动该状态所暗示的 workflow 的自然时机。

## 模型

state machine Actor 具有一个离散状态（`TState`，一个枚举）和一个扩展状态（`TData`，即你的强类型数据），两者一起持久化。你在 `Configure` 中描述状态机，它会构建一张转换表；这是一种数据结构，而非控制流，由运行时执行。

```csharp
public enum AuctionState { Open, Sold, Expired }

public sealed record AuctionData
{
    public decimal HighBid { get; init; }
    public string? HighBidder { get; init; }
}

[DaprActor("Auction")]
public sealed class AuctionActor(ActorActivationContext context, IActorTimerScheduler timers)
    : StateMachineActor<AuctionState, AuctionData>(context, timers, "Auction", new AuctionData()), IAuctionActor
{
    protected override void Configure(IStateMachine<AuctionState, AuctionData> sm)
    {
        sm.InitialState(AuctionState.Open);

        sm.In(AuctionState.Open)
          .OnEntry(ScheduleSoftClose)                                    // 仅在实际转换进入 Open 时触发
          .On<Bid>()
              .When((d, e) => e.Amount > d.HighBid).Do(AcceptBid)        // 内部转换：保持 Open
              .Otherwise().Reply(BidResult.TooLow)                       // 守卫穿透，不发生转换
          .On<StateMachineTimerFired>()
              .When(ctx => ctx.Event.Name == "soft-close").GoTo(AuctionState.Sold)   // 定时器触发：先 OnExit(Open)，再 OnEntry(Sold)
          .OnExit(CancelSoftClose);

        sm.In(AuctionState.Sold)
          .OnEntry(StartFulfillment)                                     // 开始履约（见下文）
          .Ignore<Bid>();                                                // 迟到的出价被丢弃，不报错
        
        sm.OnUnhandled(ctx => throw new InvalidActorEventException(ctx.State, ctx.Event));
    }

    // 命令方法会将其负载具体化为一个事件；返回值来自匹配处理器的 Reply。
    public Task<BidResult> PlaceBid(Bid bid, CancellationToken ct = default) => Raise<BidResult>(bid, ct);

    private void ScheduleSoftClose(IEffectContext<AuctionState, AuctionData, object> ctx) =>
        ctx.Timers.Schedule("soft-close", TimeSpan.FromSeconds(30));

    private void CancelSoftClose(IEffectContext<AuctionState, AuctionData, object> ctx) =>
        ctx.Timers.Cancel("soft-close");

    private void AcceptBid(IEffectContext<AuctionState, AuctionData, Bid> ctx)
    {
        ctx.Update(d => d with { HighBid = ctx.Event.Amount, HighBidder = ctx.Event.Bidder });
        ctx.Timers.Reschedule("soft-close", TimeSpan.FromSeconds(30));   // 每次出价都会重置软关闭
        ctx.Reply(BidResult.Accepted);
    }

    private void StartFulfillment(IEffectContext<AuctionState, AuctionData, object> ctx)
    {
        // 真实部署会在此处启动履约工作流（收费、通知、发货）。
    }
}
```

### 方法调用即事件

Actor 接口上的命令方法会把它的负载具体化为进入状态机的一个事件；方法的返回值就是所匹配处理器的 Reply 结果。只读取 `CurrentState` 或 `Data` 的查询方法会绕过状态机。这使得 state machine Actor 仍然是普通的 Dapr Actor：代理、注册表、动态调用和 Subscription streams 都可以原样工作。

### 驱动定时转换

state machine Actor 有两种方式在 timer 上触发转换，并且两者在停用之后都是持久的。

**机器内 timer（上文已使用）。** 在效果中使用 `ctx.Timers.Schedule`、`Reschedule` 或 `Cancel` 进行调度（每个调用都接受一个名称和到期时间）。timer 到期时，它会以携带该名称的 `StateMachineTimerFired` 事件重新进入状态机，你可以像处理其他事件一样处理它：

```csharp
sm.In(AuctionState.Open)
  .On<Bid>().When((d, e) => e.Amount > d.HighBid)
      .Do(ctx => ctx.Timers.Reschedule("soft-close", TimeSpan.FromSeconds(30)))
  .On<StateMachineTimerFired>()
      .When(ctx => ctx.Event.Name == "soft-close").GoTo(AuctionState.Sold);
```

对于普通的状态超时，`.After(timeout)` 可以声明式地设置一个超时：它以 `StateTimeout<TState>` 的形式到达，你可以在效果中用 `ctx.Timers.Reschedule(StateMachineConstants.StateTimeoutTimerName, timeout)` 重新设置它：

```csharp
sm.In(AuctionState.Open)
  .After(TimeSpan.FromSeconds(30))
  .On<StateTimeout<AuctionState>>().GoTo(AuctionState.Sold);
```

**注入的 Scheduler。** 注入 `IActorTimerScheduler`（若需要持久的、直到确认才停止的重试 reminder，则注入 `IActorReminderScheduler`），并调度一个指向 Actor 自身某个方法的回调，该方法会引发一个领域事件：

```csharp
// 在效果内，使用注入的调度器而非 ctx.Timers：
await timers.RescheduleAsync("Auction", Id, "soft-close", TimeSpan.FromSeconds(30), nameof(Close), arguments: Array.Empty<byte>());

public Task Close(CancellationToken ct = default) => Raise<object?>(new CloseAuction(), ct);
// 由下面的处理器处理：sm.In(AuctionState.Open).On<CloseAuction>().GoTo(AuctionState.Sold);
```

当你希望 timer 引发你自己的领域事件（而不是框架的 `StateMachineTimerFired`/`StateTimeout`）、需要持久 reminder，或者需要与非状态机代码共享同一条调度路径时，应选择注入的 Scheduler。[拍卖教程]({{< ref dotnet-actorsnext-tutorial-auction.md >}}) 使用的就是第二种方式。两种方式下，Actor 都需要注入 `IActorTimerScheduler` 并将其传给基类构造函数，因为 `ctx.Timers` 正是以它为后端的。

## DSL 参考

| 动词 | 含义 |
| --- | --- |
| `InitialState(s)` | 新建实例开始所处的状态。 |
| `In(state)` | 开始配置某个状态。 |
| `OnEntry(a)` / `OnExit(a)` | 在实际转换进入或离开该状态时运行的动作。 |
| `On<TEvent>()` | 在此状态中处理一个事件。 |
| `.When(pred)` / `.Otherwise()` | 守卫链；第一个匹配者胜出；`Otherwise` 是兜底分支。 |
| `.GoTo(state)` | 外部转换：依次执行 `OnExit(current)`、效果，再 `OnEntry(target)`。 |
| `.Do(effect)` | 运行一个效果；若没有 `GoTo`，则为内部转换（保持状态，不触发进入或离开）。 |
| `.Reply(value)` | 提供调用方法的返回值。 |
| `.Raise<TEvent>(e)` | 排队一个内部事件，在同一轮次内处理。 |
| `.Ignore<TEvent>()` | 丢弃该事件，不报错，也不发生转换。 |
| `.Defer<TEvent>()` | 持久延迟（见下文）。 |
| `.After(timeout)` | 声明式的状态超时，以 `StateTimeout<TState>` 形式送达（具名的 `ctx.Timers` timer 则以 `StateMachineTimerFired` 形式触发）。 |
| `SubstateOf(parent)` | 层次结构：子状态未处理的事件会向上冒泡到父状态。 |
| `OnUnhandled(h)` | 对没有任何状态处理的事件的全局兜底。 |

`OnEntry`、`OnExit`、`Do` 和 `OnUnhandled` 都接受内联 lambda 或作用于 `IEffectContext<…>` 的方法组委托。它们也接受 `string` 类型的效果名，但该形式通过 `ICapabilityRegistry` 解析，且只适用于解释型（以数据定义的）状态机；编译型的 `StateMachineActor` 若在没有注册表的情况下遇到具名效果或守卫，会抛出异常。

## 必须了解的语义

以下三条规则是正确的 state machine Actor 与存在微妙缺陷的 state machine Actor 之间的区别。

运行至完成：一个事件，连同其内部引发的事件，会先被处理到稳定状态，然后才接受下一个事件。这直接对应 Dapr 基于轮次的保证。

静默再水合：当空闲 Actor 被重新激活时，`CurrentState` 和 `Data` 会被恢复，而不会运行 `OnEntry` 或 `OnExit`。进入和离开动作只在实际转换时触发。任何必须在每次激活时运行的内容，都应放在 `OnActivateAsync` 中，而不是 `OnEntry` 中；否则，重新设置 timer 或重新发出事件等副作用会在 Actor 每次被唤醒时都触发。

持久延迟：由于传入的事件是一个必须返回的方法调用，`Defer` 无法为等待未来消息而保持轮次打开，否则会死锁。`Defer<TEvent>()` 改为将事件持久化到 Actor 的状态中，返回一个已接受或已延迟的确认，并在下一次不再延迟该事件的转换时重新引发它。

{{% alert title="效果在“至少一次”的轮次内运行" color="primary" %}}
方法调用就是一个事件，和任何 Actor 调用一样，如果响应在状态提交之后丢失，它可能会被重新投递（参见[交付保证]({{< ref "dotnet-actorsnext-howto.md#delivery-guarantees-you-must-design-for" >}})）。只有当状态机被设计为从已提交的状态幂等地处理该事件时，转换才可以安全地重复。自转换、会重复修改 `Data` 的效果，或其他接受同一事件的转换，都可能再次应用变更。应显式测试重复事件，并在需要处去重。发布事件或启动 workflow 的效果与进入动作同样需要幂等性，例如以由 Actor 与转换派生出的确定性实例 ID 为已启动的 workflow 做键，而不是每次都使用新的 ID。
{{% /alert %}}

## 层次状态

声明一个父状态，以便在多个状态之间共享处理器。子状态未处理的事件会向上冒泡到父状态。

```csharp
sm.In(AuctionState.Open).SubstateOf(AuctionState.Live);
sm.In(AuctionState.Paused).SubstateOf(AuctionState.Live);
sm.In(AuctionState.Live).On<Cancel>().GoTo(AuctionState.Expired);   // 同时适用于 Open 与 Paused
```

## 状态机的版本管理

`CurrentState` 与 `Data` 会一起持久化。`Data` 通过[序列化与状态迁移]({{< ref dotnet-actorsnext-serialization.md >}})中描述的相同升级器链演进。如果某次部署移除或重命名了某个已持久化实例当前所处的枚举值，就应在激活时通过升级器把这个失去归属的状态映射到一个合法状态；状态版本钩子在此同时承担了状态机逻辑位置的职责。

## 测试 state machine Actor

由于状态机是一张表，测试运行时既可以确定性地演练其行为，也可以在不运行它的情况下校验其结构。

### 行为测试

驱动事件并推进虚拟时间，以测试转换以及轮次的运行顺序，无需 sidecar。软关闭竞争（即最后一刻的出价延长截止时间）因此变成一个普通的、可重复的测试。出价与关闭 timer 的触发是两个独立的轮次，它们的到达顺序并不固定；运行时从不让它们重叠，而是先运行一个、再运行另一个，测试断言无论以哪种顺序运行，结果都是正确的。

```csharp
[Fact]
public async Task Last_second_bid_extends_close_and_is_not_lost()
{
    await using var rt = new ActorTestRuntime();
    var auction = rt.CreateActor<IAuctionActor>(ActorId.Create("a1"), "AuctionActor");

    await auction.PlaceBid(new Bid(100m, "alice"));
    rt.Time.Advance(TimeSpan.FromSeconds(29));               // 恰好在软关闭之前
    var late = auction.PlaceBid(new Bid(110m, "bob"));       // 此时出价轮次与关闭定时器轮次都处于待处理状态
    rt.Time.Advance(TimeSpan.FromSeconds(2));
    await rt.RunToIdle();                                    // 调度器会探索这两个轮次的先后顺序

    Assert.Equal(BidResult.Accepted, await late);
    Assert.Equal(AuctionState.Open, rt.StateOf(auction).CurrentState<AuctionState>());   // 不会过早变为 Sold
}
```

### 结构校验

可以直接分析转换表，因此可以在状态机运行之前发现其结构上的缺陷。`ActorStateMachine.Analyze<TActor>()` 会检查该表，报告没有任何转换能够到达的状态、无法离开的状态、永远不会被选中的守卫分支，以及跨层次结构的进入与离开顺序问题。`AssertNoStructuralDefects()` 会把任何发现转换为测试失败，因此重构导致某个状态被孤立时，会让构建失败，而不是在生产环境中暴露出来。

```csharp
[Fact]
public void Auction_machine_is_structurally_sound()
    => ActorStateMachine.Analyze<AuctionActor>().AssertNoStructuralDefects();
```

`Analyze` 也会返回完整报告；如果你更希望检查或断言特定的发现，而不是对任何发现都失败，可以使用它。结构分析是内存测试运行时的一部分；关于它如何与行为、并发和故障注入工具配合，请参见[测试]({{< ref "dotnet-actorsnext-testing.md#structural-analysis-for-state-machines" >}})。

## 最佳实践

- 当基于状态的规则是核心时，使用 state machine Actor；否则使用普通 Actor。
- 把重新激活的逻辑放在 `OnActivateAsync` 中，而不是 `OnEntry` 中。
- 保持效果小而确定；使用 `IEffectContext.Update` 演进 `Data`，并用 `ctx.Timers` 处理时间。
- 对在某个状态中确实无关紧要的事件使用 `Ignore`，并用 `OnUnhandled` 让真正的协议违规变得显眼。
- 当某个状态开始一个有限的多步骤流程时，从该状态的进入动作启动 workflow；实体本身保留在 Actor 中。
- 把 `ActorStateMachine.Analyze<T>().AssertNoStructuralDefects()` 作为单元测试运行，使结构回归导致构建失败。

## 后续步骤

- [教程第 4 部分：拍卖]({{< ref dotnet-actorsnext-tutorial-auction.md >}})
- [教程第 6 部分：组合 interpreted Actor 与 workflow]({{< ref dotnet-actorsnext-tutorial-approvals.md >}})——从状态的进入动作启动 workflow 的完整示例
- [Subscription streams]({{< ref dotnet-actorsnext-streams.md >}})
- [测试 Actor]({{< ref dotnet-actorsnext-testing.md >}})
