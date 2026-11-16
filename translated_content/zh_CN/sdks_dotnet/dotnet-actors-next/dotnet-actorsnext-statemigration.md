---
type: docs
title: ".NET SDK 中的状态迁移"
linkTitle: "状态迁移"
weight: 125000
description: "通过升级器链、增量自动生成和毕业出口，安全地跨版本演进 Actor 状态"
---

Actor 没有重放，因此不存在代码版本化问题：新部署本身就是新行为。部署之后唯一必须保留的，是 Actor 的持久化状态，因此这里的迁移只指一件具体的事：让以旧结构写入的状态在新代码下仍可加载、可使用。它是读取时的反序列化兼容性，而不是工作流式的代码版本系统。

该功能采用选择加入（opt-in）的默认策略。如果某个状态类型的结构没有改变，就无需迁移，也无需配置任何机制；该类型的行为与现在完全一致。只有当你编写了触及该类型的升级器，或者让生成器合成一个平凡的增量升级器时，该类型才会被纳入迁移。

## 心智模型

支撑整个功能的是五个核心概念。

- 节点：状态类型的每个版本化结构都是一个节点，例如 `CartState`、`CartStateV2`、`CartStateV3`。
- 跳转（hop）：`IActorStateUpcaster<TFrom, TTo>` 是一条从一个节点指向下一个节点的有向边。跳转是你唯一需要编写的迁移代码，增量跳转可以替你生成。
- 族（family）：族是通过跳转相互连通的节点集合（`CartState` 族即 `{CartState, CartStateV2, CartStateV3}`）。一个 Actor 可以持久化多个彼此独立的具名条目，每个条目都有自己的族；族之间互不冲突。
- 当前版本：你的代码所请求的类型即为当前版本。当你调用 `GetOrCreateAsync<CartStateV3>("cart", ...)` 时，运行时会发现已存储的内容，将其折叠到 `CartStateV3`，再交给你。
- 惰性重新持久化：折叠在读取时于内存中完成。迁移后的值只会在下一次保存时写回，即 Actor 在每个轮次结束时的常规状态保存。随着时间推移，存储会自动修复为当前结构，无需批量迁移作业。

## 编写：只写跳转，别的都不用

每次结构变化，你只需编写一个升级器。升级器通过依赖注入解析，因此跳转可以把注入的服务作为构造函数参数，并且升级器是异步的（`UpcastAsync` 返回 `ValueTask`）。

```csharp
// 各个结构。
public sealed class CartStateV1 { public List<string>   Skus  { get; init; } = []; }
public sealed class CartStateV2 { public List<CartLine> Lines { get; init; } = []; }
public sealed class CartStateV3 { public List<CartLine> Lines { get; init; } = []; public int TotalQuantity { get; init; } }
public sealed record CartLine(string Sku, int Quantity);

// 跳转：你唯一需要编写的迁移代码。
public sealed class CartStateV1ToV2 : IActorStateUpcaster<CartStateV1, CartStateV2>
{
    public ValueTask<CartStateV2> UpcastAsync(CartStateV1 s, CancellationToken ct = default) =>
        ValueTask.FromResult(new CartStateV2
        {
            Lines = s.Skus.GroupBy(x => x, StringComparer.Ordinal)
                          .Select(g => new CartLine(g.Key, g.Count())).ToList(),
        });
}

public sealed class CartStateV2ToV3 : IActorStateUpcaster<CartStateV2, CartStateV3>
{
    public ValueTask<CartStateV3> UpcastAsync(CartStateV2 s, CancellationToken ct = default) =>
        ValueTask.FromResult(new CartStateV3 { Lines = s.Lines.ToList(), TotalQuantity = s.Lines.Sum(l => l.Quantity) });
}
```

Actor 本身不包含任何迁移逻辑。它读写的是当前结构，折叠过程在底层完成：

```csharp
[DaprActor("MigratingCart")]
public sealed class MigratingCartActor(ActorActivationContext context) : Actor, IMigratingCartActor
{
    protected override ActorId Id => context.ActorId;
    protected override IActorStateAccessor State => context.State;

    // 无论存储的是哪个版本（V1/V2/V3），都会透明地折叠到 CartStateV3，
    // 并在下一次保存时以当前结构重新持久化。
    public async Task<CartStateV3> GetState(CancellationToken ct = default) =>
        (await State.GetOrCreateAsync("cart", () => new CartStateV3(), ct)).Value;

    public Task Clear(CancellationToken ct = default) => State.RemoveAsync("cart", ct).AsTask();
}
```

升级器由源生成器发现并为你注册（受 `EnableAutoStateMigrationRegistration` 控制，参见[编写、注册并调用 Actor]({{< ref "dotnet-actorsnext-howto.md#controlling-automatic-registration" >}})）；你无需手动注册它们。

{{% alert title="保持升级器纯净且确定" color="warning" %}}
升级器可以接受注入的依赖，但其函数体必须是纯的且确定的：不能读取挂钟时间、不能使用随机数、不能产生外部副作用。这并非风格问题。调用是至少一次的，因此折叠并保存的轮次可能在中途失败后被重新运行；只有确定性的升级器才能在重跑时产生完全相同的结果，这正是重复迁移具有幂等性的保障。确定性分析器（`DAPR1413` 针对挂钟时间，`DAPR1414` 针对未播种的随机数）正是为此而适用于升级器函数体。确保升级器中不会注入并使用非确定性功能，归根结底是开发者的责任；由于提供了注入能力，SDK 无法检测出全部非确定性用法。
{{% /alert %}}

## 增量变更无需升级器

如果新版本只新增成员，并且这些新成员都可以设置默认值，生成器会为你合成该跳转：它会复制共享成员，并为新成员赋予默认值。你只需编写新结构，别无其他。

```csharp
public sealed class MyState   { public string Name { get; init; } = ""; }
public sealed class MyStateV2 { public string Name { get; init; } = ""; public int  Age    { get; init; } }
public sealed class MyStateV3 { public string Name { get; init; } = ""; public int  Age    { get; init; } public bool Active { get; init; } }
// 未编写任何升级器。生成器会将 MyState 设为起点、排好链的顺序，
// 并自动生成 MyState -> MyStateV2 和 MyStateV2 -> MyStateV3。
```

非增量的变更（重命名、删除、结构调整，或像 `CartStateV3` 到 `ShoppingCartV4` 这样的跨名称迁移）无法被合成。这些需要你自己编写跳转，分析器会在缺少跳转时提供脚手架。

## 读写状态

状态访问器默认会进行迁移；普通的读写方法会为你完成折叠与纳入迁移。

| 方法 | 行为 |
| --- | --- |
| `TryGetAsync<T>(name, ct)` | 读取已存储的数据并将其折叠到 `T`。旧版或普通字节会被返回为 `T`。若没有存储任何内容，则返回 `null`。 |
| `GetOrCreateAsync<T>(name, factory, ct)` | 与上面相同；若没有存储任何内容，则用 `factory` 创建一个新值。 |
| `SetAsync<T>(name, value, ct)` | 写入 `value`，并将其自动纳入 `T` 的节点。没有 Schema 版本参数；判别标识由图推导得出。 |
| `GraduateAsync<T>(name, ct)` | 出口：折叠到 `T`，以普通形式写入，并停止为此条目纳入迁移。即使迁移被全局禁用，它也能工作。 |
| `RemoveAsync(name, ct)` | 删除该条目。 |

{{% alert title="Actor 代码永远看不到已存储的版本" color="primary" %}}
读取只会返回已迁移的值。返回的状态中刻意不包含 `SchemaVersion`，因为在 Actor 代码中按版本分支正是迁移机制要消除的反模式；这类逻辑应当放在升级器中。若需确认确实发生了一次折叠，请在测试中使用状态快照 API 进行断言（参见[测试]({{< ref dotnet-actorsnext-testing.md >}})），而不是在运行时读取判别标识。对状态编写 `if (version == 2)` 这类分支代码，说明缺少一个跳转。
{{% /alert %}}

### 导入外部遗留数据

要为来自存储之外的遗留结构值（HTTP 请求体、批量导入、其他系统）设定种子，请使用 `SetAsync` 写入；它接受族中的任意节点类型，而不仅仅是最新版本：

```csharp
await State.SetAsync("cart", legacyV1Value, ct);   // 纳入 V1 的节点
// 下一次读取会惰性地将其折叠到当前结构。
```

## 命名与排序：版本策略

类型名如何映射到族以及如何排序，是编译期的问题，由生成器与分析器使用。它是可插拔的，并在应用程序范围内配置，遵循 Dapr 其他地方使用的相同版本命名约定，以保持一致。

```csharp
// Program.cs：在应用程序范围内选择版本名的解析与排序方式。
builder.Services.UseActorStateVersioning<NumericVersionStrategy>();   // "V{N}" 后缀，默认值
```

策略会把类型名解析为一个规范的族名加一个版本号，并对版本进行排序；内置的 `NumericVersionStrategy` 会把 `CartStateV3` 映射到族 `CartState` 的版本 `3`，并把未编号的起点（如 `CartState`）视为排在最前的版本 `0`。此外还提供 `SemVerVersionStrategy` 和 `DateVersionStrategy`，你也可以编写自己的策略。

边优先。显式的升级器边对族成员关系具有权威性；策略只是在没有边时，用来推导族、顺序和增量跳转的约定。因此遵循约定的名称无需任何额外配置；如果两个类型应当属于同一个族，但它们的名称会把它们分开，那么只要在它们之间编写一个跳转，无论命名如何，它们都会被连接起来。你几乎不需要显式覆盖；少数情况下，是为策略无法解析的名称提供版本，或为某个族选择不同的策略。

## 退出选项与出口

控制手段分为三个层级，从让 SDK 做全部工作，到完全退出该功能。

完全自动，即不手动编写：对于仅增量的族，无需编写任何升级器，由生成器合成它们。你仍在使用迁移功能。

完全禁用，即选择退出迁移：`DaprActorsOptions` 上的一个开关会关闭该功能，使值以普通形式存储，不再有信封增强和自动生成。读取仍保持宽容，因此仍能读取已写入的任何内容，这使得翻转该开关是安全的。

毕业（graduation）是针对单个条目的出口：`GraduateAsync<T>(name, ct)` 会把该条目折叠到 `T`，以普通形式（无判别标识）写入，并停止为该条目纳入迁移。它按状态名称进行，而非全有或全无；并且它始终有效，即使全局禁用了迁移，因为它是离开该功能的可靠途径。一旦某个条目的所有实例都已毕业，就可以删除其升级器。

{{% alert title="毕业是可以撤销的" color="primary" %}}
普通形式会固定到你毕业所至的 CLR 类型，因此稍后重新纳入，只需添加一个新版本以及一个从该类型出发的升级器（如 `CartStateV3` 到 `CartStateV4`）：读取时会将普通字节反序列化为已毕业的类型，并沿链继续，该类型即成为新的起点。存储中同时存在普通实例与重新信封化实例的情况，无需任何额外工作即可被正确读取，因此毕业并非单向之门。
{{% /alert %}}

## 安全性：SDK 保证什么，以及你不能做什么

唯一必须遵守的规则是只追加：你只能向链中添加新的节点与跳转，绝不重新编辑已发布的节点。跳转内部可以做任何事（增加、重命名、删除、改变类型、重构结构）；不能改变的是已发布的节点或跳转，因为持久化的实例可能已经是在它下面写入的。

SDK 通过两道防线来支撑这一规则。

在构建时，生成器会把每个节点结构以及每个升级器的指纹写入项目基线（已提交的 `DaprActorsNext.Shipped.txt` 与 `DaprActorsNext.Unshipped.txt` 文件，`DAPR1410` 结构守卫会读取它们）。如果一个已被取代的节点，或一个已在使用中的升级器，与已提交的基线不一致，你会收到一条警告，提示你修改了已参与迁移的内容，这可能会损坏持久化状态。更新已提交的基线，是你刻意确认自己确实想这样做的表示。该检查有意保持保守，因为生成器无法看到开发与生产环境的边界，所以它会把对节点的任何改动都视为有风险。

在运行时，每个存储的值都带有其节点结构的结构指纹。如果存储的指纹与当前构建中该节点的结构不再匹配，说明该值是按该节点的另一种结构写入的，此时运行时会抛出异常，而不是悄悄地把陈旧数据反序列化到不匹配的结构中。在这里，大声失败才是正确的结果：悄无声息的部分反序列化，正是这一功能要防止的生产事故。

重命名则从另一个方向被捕获。重命名旧类型并不会改变其结构，因此不会触发指纹守卫；相反，它会破坏图的连通性：被重命名的类型无法再到达目标，分析器会将其报告为缺失的跳转或未连通的类型。

{{% alert title="回滚是安全失败，而非一等支持的路径" color="warning" %}}
把旧版构建回滚到它无法解释的新状态上是安全的，但并不作为可正常工作的路径受到支持：读取会大声失败，且该轮次不会持久化，因此你得到的是安全、不会损坏数据的失败，而不是悄无声息的降级。如果需要支持用旧版构建运行新数据，请明确规划（例如通过保持变更为增量式），而不要假设回滚能透明地读取向前写入的状态。
{{% /alert %}}

## 分析器

迁移的正确性主要在构建时强制执行，相关诊断位于 Actor 的 `DAPR14xx` 范围内，与形状基线（`DAPR1410`）、断链（`DAPR1415`）以及确定性（`DAPR1413`、`DAPR1414`）分析器并列。已分配的 ID 请参见[诊断参考]({{< ref "dotnet-actorsnext-howto.md#analyzers-and-diagnostics" >}})。

构建时的指导涵盖你会实际遇到的各种情况：状态中使用的目标缺少跳转（附带一个代码修复，可生成升级器脚手架，并预先填充共享及增量成员）；某个类型看起来属于某个族却未完全连通；链的中间存在缺口；无法自动生成的非增量步骤；多个起点或菱形结构导致折叠路径不唯一的歧义；以及上述的损坏守卫。由于分析器与生成器共享相同的版本解析与指纹辅助函数，构建时的指导与生成的输出永远不会相互矛盾；IDE 提示会显示某个类型参与的是哪个族，使（现已隐式的）迁移行为仍然可被发现。

## 测试

迁移可以使用 `ActorTestRuntime` 在内存中进行确定性测试，无需边车，也无需状态存储。

```csharp
[Fact]
public async Task V1_cart_folds_to_current_on_read()
{
    await using var rt = new ActorTestRuntime();
    await rt.SeedStateAsync("MigratingCart", ActorId.Create("u1"), "cart",
        new CartStateV1 { Skus = ["sku-1", "sku-1", "sku-2"] });

    var cart = rt.CreateActor<IMigratingCartActor>(ActorId.Create("u1"), "MigratingCart");
    var state = await cart.GetState();

    Assert.Equal(3, state.TotalQuantity);   // 已由 V1 经 V2 折叠到 V3
}
```

`SeedStateAsync` 会直接在内存存储中植入信封形式或普通形式的数据，因此你可以植入一个“V1”实例，并断言 Actor 读回的是当前结构。故障注入器在迁移读取期间以及各跳转之间添加了钩子（`FailNextMigration<T>()`、`FailNextUpcastHop<TFrom, TTo>()`），因此折叠过程中的故障路径可以进行单元测试；状态快照 API 同时处理信封形式与已毕业形式，因此测试可以断言：在一次迁移读取和保存之后，存储已修复到当前节点。一份有用的测试矩阵包括：默认折叠、自动生成的增量链、损坏守卫、同一 Actor 内多族隔离、在目标版本上恰好重新持久化一次、`SetAsync` 导入后再折叠、毕业后重新导入、迁移期间的故障，以及完全禁用的退出选项。运行时相关接口请参见[测试]({{< ref dotnet-actorsnext-testing.md >}})。

## 解释型 Actor

解释型（运行时定义）的 Actor 携带的是动态状态包，而非强类型的 CLR 结构，因此类型化的升级器并不适用于它们。它们的状态走普通路径；如果需要版本化，则随机器定义文档的版本一起版本化。迁移系统从不假设所有状态都是类型化的，因此这一点无需特殊处理即可组合在一起；参见教程中的[运行时定义的状态机]({{< ref dotnet-actorsnext-tutorial-interpreted.md >}})部分。

## 最佳实践

- 优先使用增量变更（新增可设默认值的成员），它们完全无需升级器。
- 当变更不是增量式时，每次结构变化添加一个跳转，并让链组合起来；保持每个跳转小巧。
- 保持升级器纯净且确定，让它们接受注入的依赖，而不是去获取环境状态。
- 永远不要重新编辑已发布的节点或跳转；应添加新节点和新跳转，并在分析器发出标记时有意识地提交更新后的基线。
- 将依赖版本的逻辑排除在 Actor 代码之外；基于版本的分支就是缺少跳转的信号。
- 只有当旧版本的实例已被向前读取（从而被重新持久化）或已被清空后，才退役该旧版本；只要可能仍存在以其写入的实例，就保留旧结构及其跳转。
- 使用毕业机制将某个条目干净地移出该功能；若日后需要重新纳入，请记住它是可以撤销的。
- 请记住，升级只会惰性地发生：只有当 Actor 取回状态时，状态才会迁移；迁移从不会针对 Actor 在其状态存储中写入的全部状态运行。

## 后续步骤

- [序列化]({{< ref dotnet-actorsnext-serialization.md >}})
- [教程第 2 部分：演进购物车的状态]({{< ref dotnet-actorsnext-tutorial-migration.md >}})
- [测试 Actor]({{< ref dotnet-actorsnext-testing.md >}})
