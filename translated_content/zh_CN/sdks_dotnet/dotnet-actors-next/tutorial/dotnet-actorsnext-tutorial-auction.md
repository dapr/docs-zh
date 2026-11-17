---
type: docs
title: "第 4 部分：拍卖"
linkTitle: "4. 拍卖"
weight: 164000
description: "一个状态机，以及以确定性单元测试编写的、此前无法测试的 timer 与消息竞争"
---

第四个示例是实时拍卖：拍卖处于开放状态并接受出价，同时带有一个软关闭（soft-close）timer，每个被接受的出价都会重置该 timer。timer 触发时，拍卖转为已售出状态，并标记履约已开始。它看起来像一个 workflow，但其实不是，这正是我们想说明的。在这个示例中，测试无疑是重点。

本部分的代码：`/examples/Actor.Next/04-Auction/`。

## 你将构建的内容

```csharp
[GenerateActorClient]
public interface IAuctionActor : IActor
{
    Task<BidResult> PlaceBid(Bid bid, CancellationToken cancellationToken = default);
    Task Close(CancellationToken cancellationToken = default);
    Task Expire(CancellationToken cancellationToken = default);
    Task<AuctionState> GetState(CancellationToken cancellationToken = default);
    Task<AuctionData> GetData(CancellationToken cancellationToken = default);
}

public enum AuctionState { Open, Sold, Expired }

public sealed record AuctionData(decimal HighBid, string? HighBidder, bool FulfillmentStarted)
{
    public static AuctionData Empty { get; } = new(0, null, false);
}

public sealed record Bid(decimal Amount, string Bidder);
public sealed record CloseAuction;
public sealed record ExpireAuction;
public enum BidResult { Accepted, TooLow, Closed }

[DaprActor("Auction")]
public sealed class AuctionActor(ActorActivationContext context, IActorTimerScheduler timers) : StateMachineActor<AuctionState, AuctionData>, IAuctionActor(context, timers, "Auction", AuctionData.Empty)
{
    private static readonly TimeSpan SoftClose = TimeSpan.FromSeconds(30);

    protected override void Configure(IStateMachine<AuctionState, AuctionData> sm)
    {
        sm.InitialState(AuctionState.Open);

        sm.In(AuctionState.Open)
            .On<Bid>()
                .When((data, bid) => bid.Amount > data.HighBid)
                    .Do(async ctx =>
                    {
                        ctx.Update(data => data with { HighBid = ctx.Event.Amount, HighBidder = ctx.Event.Bidder });
                        await timers.RescheduleAsync("Auction", Id, "soft-close", SoftClose, nameof(Close), string.Empty);
                        ctx.Reply(BidResult.Accepted);
                    })
                .Otherwise()
                    .Reply(BidResult.TooLow);

        sm.In(AuctionState.Open)
            .On<CloseAuction>().GoTo(AuctionState.Sold);

        sm.In(AuctionState.Open)
            .On<ExpireAuction>().GoTo(AuctionState.Expired);

        sm.In(AuctionState.Sold)
            .OnEntry(ctx => ctx.Update(data => data with { FulfillmentStarted = true }))
            .Ignore<Bid>()
            .Ignore<CloseAuction>()
            .Ignore<ExpireAuction>();

        sm.In(AuctionState.Expired)
            .Ignore<Bid>()
            .Ignore<CloseAuction>()
            .Ignore<ExpireAuction>();
    }

    public Task<BidResult> PlaceBid(Bid bid, CancellationToken cancellationToken = default)
    {
        if (CurrentState != AuctionState.Open)
        {
            return Task.FromResult(BidResult.Closed);
        }

        return Raise<BidResult>(bid, cancellationToken);
    }

    public Task Close(CancellationToken cancellationToken = default) =>
        Raise<object?>(new CloseAuction(), cancellationToken);

    public Task Expire(CancellationToken cancellationToken = default) =>
        Raise<object?>(new ExpireAuction(), cancellationToken);

    public Task<AuctionState> GetState(CancellationToken cancellationToken = default) =>
        Task.FromResult(CurrentState);

    public Task<AuctionData> GetData(CancellationToken cancellationToken = default) =>
        Task.FromResult(Data);
}
```

### 为什么使用状态机，以及它的边界

拍卖是一个长期存活、可寻址的实体，具有明确的状态，而不是一个有限的流程，因此它应当放在 state machine Actor 中，而不是 workflow 里。大量的出价会让 workflow 的重放历史无限增长；每位竞拍者都需要即时、同步地读取当前最高出价；而软关闭行为本身就是一场竞争。转移到 `Sold` 状态正是交接点：其入口动作标记履约已开始。在真实的部署中，此时会启动一个履约 workflow，处理有限的多步骤流程（向中标者扣款、通知落标者、安排发货）。因此实体留在 Actor 中，有界的编排交给 workflow。这一边界是需要记住的重点：二者是相互配合，而非彼此竞争。

有关编写细节和完整的适用场景对比，请参阅[state machine Actor]({{< ref dotnet-actorsnext-statemachine.md >}})。

## 测试

```csharp
[Fact]
public async Task Last_second_bid_wins_race_with_close_timer()
{
    await using var runtime = CreateRuntime(new PriorityActorScheduler(7));
    var auction = runtime.CreateActor<IAuctionActor>(ActorId.Create("auction-1"), "Auction");
    await PlaceBid(runtime, auction, new Bid(100, "alice"));

    runtime.Time.Advance(TimeSpan.FromSeconds(29));
    var lateBid = auction.PlaceBid(new Bid(110, "bob"));
    await runtime.RunToIdle();
    Assert.Equal(BidResult.Accepted, await lateBid);

    runtime.Time.Advance(TimeSpan.FromSeconds(2));
    await runtime.RunToIdle();

    Assert.Equal(AuctionState.Open, await ReadState(runtime, auction));
    Assert.Equal("bob", (await ReadData(runtime, auction)).HighBidder);
}

[Fact]
public void State_machine_has_no_structural_defects()
{
    ActorStateMachine.Analyze<AuctionActor>().AssertNoStructuralDefects();
    Assert.Contains(ActorStateMachine.Analyze<BadAuctionActor>().StructuralDefects, defect => defect.Contains("unreachable", StringComparison.Ordinal));

    // For deeper exploration, run the same test body under the optional Coyote bridge when enabled.
    Assert.False(CoyoteBridge.IsEnabled);
}

private static ActorTestRuntime CreateRuntime(ControlledActorScheduler? scheduler = null)
{
    _ = typeof(AuctionActor);
    return new ActorTestRuntime(services => services.AddDaprActors(_ => { }), new ActorTestRuntimeOptions { Scheduler = scheduler });
}

private static async Task<BidResult> PlaceBid(ActorTestRuntime runtime, IAuctionActor auction, Bid bid)
{
    var placed = auction.PlaceBid(bid);
    await runtime.RunToIdle();
    return await placed;
}

private static async Task<AuctionState> ReadState(ActorTestRuntime runtime, IAuctionActor auction)
{
    var read = auction.GetState();
    await runtime.RunToIdle();
    return await read;
}

private static async Task<AuctionData> ReadData(ActorTestRuntime runtime, IAuctionActor auction)
{
    var read = auction.GetData();
    await runtime.RunToIdle();
    return await read;
}
```

`BadAuctionActor` 是示例项目中刻意制造缺陷的变体（它让某个状态不可达）；第二个断言证明分析器能够捕获这一缺陷。软关闭是在出价被接受的效果（accepted-bid effect）中调度的，因此每个被接受的出价都会重新调度 `soft-close` timer；该 timer 的回调会调用 `Close`，并触发 `CloseAuction`，将拍卖转入 `Sold` 状态。

### 为什么这些测试很重要

第一个测试描述的是一个真实的竞争条件：这类问题会随代码上线、顺利通过代码审查，却在生产环境中每周复现一次。在旧版 SDK 中，这不仅是一个难写的测试，而且根本无法可靠地编写：你无法在真实的 sidecar 上按需制造 timer 与消息之间的竞争。这里，出价与关闭 timer 的触发是两个独立的轮次，它们的先后顺序并不固定；Scheduler 会探索这些顺序，而不是依赖时序，因此测试每次运行都会确定地通过或失败。两个轮次从不重叠：先运行的那个会先执行完毕，然后另一个才开始。如果你想进一步深入，同一个测试还可以在 [Coyote 桥接](https://microsoft.github.io/coyote/) 下运行，进行穷尽式探索。

第二个测试直接分析状态机的结构：`AuctionActor` 必须没有任何缺陷，而刻意制造缺陷的 `BadAuctionActor` 则会暴露一个不可达状态。由于状态机本质上是一张状态转移表，运行时可以把“重构是否让某个状态失去了入口”这类问题，从生产环境中的意外转变为构建失败。仅这一个示例就足以说明这次重写的价值。

有关测试运行时和结构分析，请参阅 [测试]({{< ref "dotnet-actorsnext-testing.md#structural-analysis-for-state-machines" >}})。

## 另请参阅

- [state machine Actor]({{< ref dotnet-actorsnext-statemachine.md >}})
- [测试]({{< ref dotnet-actorsnext-testing.md >}})
- 下一篇：[第 5 部分：运行时定义的状态机]({{< ref dotnet-actorsnext-tutorial-interpreted.md >}})
