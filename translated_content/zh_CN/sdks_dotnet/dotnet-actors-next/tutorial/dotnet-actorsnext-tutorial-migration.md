---
type: docs
title: "第 2 部分：演进购物车的状态"
linkTitle: "2. 状态迁移"
weight: 162000
description: "重大状态变更会在构建时报错，并成为可以单元测试的迁移，无需数据库"
---

第二个示例延续了同一个购物车，并经历了一次重大状态变更。`CartStateV1` 以扁平列表的形式存储 SKU；`CartStateV2` 将它们按数量组织为行项目；`CartStateV3` 再增加一个缓存的总数。每次结构变化只需发布一个小型升级器，旧购物车在读取时向前折叠，无需数据回填。

本部分的代码位于：`/examples/Actor.Next/02-Migration/`。

## 你将构建的内容

```csharp
public sealed class CartStateV1ToV2 : IActorStateUpcaster<CartStateV1, CartStateV2>
{
    public ValueTask<CartStateV2> UpcastAsync(CartStateV1 state, CancellationToken cancellationToken = default)
    {
        var lines = state.Skus
            .GroupBy(sku => sku, StringComparer.Ordinal)
            .Select(group => new CartLine(group.Key, group.Count()))
            .ToList();

        return ValueTask.FromResult(new CartStateV2 { Lines = lines });
    }
}

public sealed class CartStateV2ToV3 : IActorStateUpcaster<CartStateV2, CartStateV3>
{
    public ValueTask<CartStateV3> UpcastAsync(CartStateV2 state, CancellationToken cancellationToken = default) =>
        ValueTask.FromResult(new CartStateV3
        {
            Lines = state.Lines.ToList(), TotalQuantity = state.Lines.Sum(line => line.Quantity),
        });
}
```

这就是全部的迁移：每次结构变更对应一个小型升级器，多个升级器可以串联组合。源生成器会发现并注册这些升级器；读取时，运行时会识别所存储的版本，将其逐级折叠为你的代码所需的结构，并在下一次保存时惰性地以当前结构重新持久化。Actor 中没有任何代码需要根据版本进行分支。

### 这为什么是个好示例

这里体现了 `Dapr.Actors` 过去没有干净解法的两件事。其一，序列化只有一条可插拔的 `IDaprSerializer` 路径（默认为 System.Text.Json），而不再区分远程处理与非远程处理的 DataContract 两套机制，因此无论 Actor 以何种方式被调用，数据都只有一种写入方式。其二，也是更重要的一点：重大变更会在构建时被捕获。`DAPR1410` 分析器会报告那些会导致已持久化数据无法反序列化的状态类型变更，并提供代码修复，用于生成升级器的脚手架，或建议将变更改为增量式；较长链条中缺失的一跳也会被标记（`DAPR1415`）。

迁移是“默认静默”的：如果你从不修改状态结构，就没有需要提升的版本号，也无需编写升级器。只有在你确实做出重大变更时才需要编写升级器，而编译器会准确告诉你何时需要。增量式变更（新增带默认值的成员）完全不需要升级器，因为生成器会自动合成这一跳。

完整的模型（包括“毕业”退出通道和完整性保证）请参阅 [状态迁移]({{< ref dotnet-actorsnext-statemigration.md >}})。

## 测试

```csharp
[Fact]
public async Task GetOrCreateAsync_folds_seeded_v1_to_current_cart()
{
    await using var runtime = CreateRuntime();
    var id = ActorId.Create("cart-v1");
    await runtime.SeedStateAsync("MigratingCart", id, "cart", new CartStateV1 { Skus = ["sku-1", "sku-1", "sku-2"] });
    var cart = CreateCart(runtime, id);

    var read = cart.GetState();
    await runtime.RunToIdle();
    var current = await read;

    Assert.Equal(2, current.Lines.Single(line => line.Sku == "sku-1").Quantity);
    Assert.Equal(3, current.TotalQuantity);
    Assert.Equal(3, runtime.StateOf(cart).Get<CartStateV3>("cart")!.TotalQuantity);
}

private static ActorTestRuntime CreateRuntime()
{
    _ = typeof(MigratingCartActor);
    return new ActorTestRuntime(services => services.AddDaprActors(_ => { }));
}

private static IMigratingCartActor CreateCart(ActorTestRuntime runtime, ActorId id) =>
    runtime.CreateActor<IMigratingCartActor>(id, "MigratingCart");
```

### 为什么测试很重要

迁移测试证明了你最担心的事情（部署之后旧数据无法加载）实际上是可以正常加载的。你直接把旧结构写入运行时的存储中，在当前构建下读取，并断言迁移后的结果；整个过程既不需要真实的状态存储，也不需要任何生产数据。上面的测试已经在一次读取中折叠了完整的 `V1 -> V2 -> V3` 链；再补充针对增量式变更或已“毕业”条目的用例，即可覆盖其余的功能面。

在旧版 SDK 中，要证明生产数据迁移是正确的，需要一个具有代表性数据的预发布环境。而在这里，它只是一个在任何生产数据被触碰之前运行的单元测试。构建时的防护本身也经过了验证：`DAPR1410` 分析器使用分析器测试框架进行了测试，因此你所依赖的波浪线提示同样有测试覆盖。

## 另请参阅

- [状态迁移]({{< ref dotnet-actorsnext-statemigration.md >}})
- [测试]({{< ref dotnet-actorsnext-testing.md >}})
- 下一篇：[第 3 部分：会响应的购物车]({{< ref dotnet-actorsnext-tutorial-pubsub.md >}})
