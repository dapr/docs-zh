---
type: docs
title: ".NET SDK 中的序列化"
linkTitle: "序列化"
weight: 120000
description: "可插拔的序列化、现代 C# 类型支持，以及每个 Actor 的状态缓存"
---

`Dapr.Actors.Next` 与 Dapr State Management 和 workflow 使用同一套可插拔序列化器，开箱即支持现代 C# 类型，并保留每个 Actor 的状态缓存。本页介绍这些内容。跨版本演进状态结构是另一个更深入的主题，有独立的页面：参见 [状态迁移]({{< ref dotnet-actorsnext-statemigration.md >}})。

## 可插拔序列化

Actor 的负载和状态通过 `IDaprSerializer` 进行序列化，它从依赖注入中解析。默认实现是 `JsonDaprSerializer`（System.Text.Json），你无需修改任何 Actor 代码即可替换它。

```csharp
// 默认：System.Text.Json，无需任何配置。
builder.Services.AddDaprActors();
```

要接入自定义序列化器，请在 `AddDaprActors()` 之前注册你自己的 `IDaprSerializer`。Actor 基础设施通过 `TryAdd` 注册默认实现，因此你先注册的实现会被使用：

```csharp
builder.Services.AddSingleton<IDaprSerializer, MyProtobufSerializer>();
builder.Services.AddDaprActors();
```

为了让 Actor 路径保持裁剪与 AOT 安全，请注册一个基于源生成 `JsonSerializerContext` 的 `IDaprSerializer`，而不是依赖基于反射的默认实现。使用 `Configure<JsonSerializerOptions>(...)` 配置 `JsonSerializerOptions` 无法影响 Actor 序列化器，因为默认的 `JsonDaprSerializer` 使用它自己的选项构造。请自行注册序列化器：

```csharp
[JsonSerializable(typeof(CartState))]
[JsonSerializable(typeof(CartItem))]
internal sealed partial class MyActorJsonContext : JsonSerializerContext;

builder.Services.AddSingleton<IDaprSerializer>(new JsonDaprSerializer(
    new JsonSerializerOptions(JsonSerializerDefaults.Web) { TypeInfoResolver = MyActorJsonContext.Default }));
builder.Services.AddDaprActors();
```

对于完全提前编译（AOT）的宿主，还需注册一个匹配的 `IActorWireSerializer`，它在调用的线路边界进行序列化，因此不再保留任何基于反射的路径。

{{% alert title="为什么默认使用 System.Text.Json" color="primary" %}}
生成的代理与分发器只通过使用具体编译期类型的强类型泛型路径进行序列化，这使得整个 Actor 路径保持裁剪与 AOT 安全。这与 Dapr State Management 和 workflow 使用的序列化器抽象相同，因此应用在各 building block 之间的序列化方式保持一致。
{{% /alert %}}

### 现代 C# 类型可原样使用

使用默认的 System.Text.Json 序列化器时，你最可能用作负载和状态类型的 C# 结构无需任何序列化专用特性即可工作：record，以及带主构造函数的类，都可以原样使用。

这与 `Dapr.Actors` 有实质区别：后者的强类型客户端使用 Data Contract Serializer。该序列化器要求每个类型都有公共无参构造函数，或显式使用 `[DataContract]` 和 `[DataMember]` 标注，并且仅 init 的 setter 也需要契约特性。record 或带主构造函数的类没有无参构造函数，因此在 `Dapr.Actors` 下，你必须添加一个多余的无参构造函数，或为类型加注解。在这里则不需要：

```csharp
// 作为 Actor 方法负载或状态类型使用时，在默认序列化器下可原样工作：
public record CartItem(string Sku, int Quantity);

public sealed class CartState(string ownerId)
{
    public string OwnerId { get; } = ownerId;
    public List<CartItem> Items { get; } = [];
}
```

当你需要某项序列化器特性时，仍然会使用序列化器专用的特性，例如为多态层次结构使用 `[JsonPolymorphic]` 和 `[JsonDerivedType]`，或为自定义转换使用 `[JsonConverter]`。关键在于：添加这些特性是为了启用某项功能，而不是为了满足语言已不再要求的构造函数约束。

{{% alert title="这一保证属于默认序列化器，而非抽象本身" color="warning" %}}
上述兼容性是 System.Text.Json 的特性，它是默认的 `IDaprSerializer`。如果你用自己的 `IDaprSerializer` 实现替换序列化器，这些保证将不再适用，而取决于你的实现所支持的内容：自定义序列化器可能施加其自身的构造函数、特性或类型结构要求。对所有人都成立的是抽象本身；对 record 与主构造函数而言成立的，则是 System.Text.Json 默认实现的行为。如果你替换了序列化器，请按所选序列化器的规则验证你的负载和状态类型。
{{% /alert %}}

## 每个 Actor 的状态缓存

状态读取由一个以激活为作用域的内存中写后（write-behind）缓存提供服务。修改不会在每次变更时直写；而是在每个轮次结束时一次性保存挂起的状态，从而减少对 state store 的调用。

```csharp
public async Task AddItem(CartItem item, CancellationToken ct = default)
{
    var cart = await State.GetOrCreateAsync("cart", () => new CartState(), ct);  // 首次加载后即为缓存命中
    cart.Value.Items.Add(item);                        // 在轮次内通过 .Value 修改
    // 无需调用 Save()；轮次结束时会一次性保存
}
```

通常你不需要显式调用保存。同一方法中的多次修改（或同一轮次内跨重入调用链的修改）会合并为一次写入。

{{% alert title="轮次结束时的保存与重试相互作用" color="primary" %}}
保存使得一个轮次的状态变更具有持久性，而 SDK 随后发送的响应表示完成。这两个步骤并非单一原子操作，因此轮次可能在其状态已提交之后被重试（参见[交付保证]({{< ref "dotnet-actorsnext-howto.md#delivery-guarantees-you-must-design-for" >}})）。在重新执行时，仅状态的变更并不会自动安全：递增计数器或追加条目可能会被应用两次。请使状态更新与外部副作用都具备幂等性，或使用随变更一起持久化的稳定请求标识进行去重。[回调流故障注入]({{< ref "dotnet-actorsnext-testing.md#inject-callback-stream-failures" >}})可以测试提交后的响应丢失情况；它不会回滚状态。
{{% /alert %}}

{{% alert title="序列化器是持久化契约的一部分" color="warning" %}}
状态使用所配置的任何序列化器和设置进行存储，因此这些设置是持久性契约的一部分，而不仅仅是运行时细节。更改序列化器，或更改会改变输出形状的设置（枚举以字符串还是数字表示、属性命名策略、如何输出可空性或默认值），都可能使现有状态无法读取，即使 CLR 类型没有变化。应将状态类型的序列化器配置视为有版本的决策：谨慎地更改；如果某项更改会改变持久化的形状，则像处理状态结构变更一样处理它，使用升级器（注意升级器不会在不同序列化配置之间迁移）或兼容性设置。Actor 状态还存储在有自身值大小限制的 state store 中，因此请保持每个 Actor 的状态大小合理；整个状态每个轮次作为一个值保存。
{{% /alert %}}

## 演进状态结构：参见状态迁移

当状态类型的结构在版本之间变化时，较旧的持久化数据仍必须能够在新代码下加载。这是一项一等的、需主动启用的功能，拥有独立的页面，而不是此处的一个小节，因为它有实质性的深度：升级器链、增量自动生成、毕业退出路径（graduation off-ramp），以及构建时和运行时的完整性保证。简而言之，每次结构变更你编写一个小型升级器（纯增量变更则无需编写），运行时会在读取时将已存储的数据折叠到你的代码所要求的结构，并惰性地重新持久化。完整模型与最佳实践，参见[状态迁移]({{< ref dotnet-actorsnext-statemigration.md >}})。

## 最佳实践

- 为你的 Actor 负载注册一个 `JsonSerializerContext`，以保持在 AOT 安全的路径上。
- 保持状态类型的序列化器配置稳定，并将会改变持久化结构的更改视为版本决策（参见[状态迁移]({{< ref dotnet-actorsnext-statemigration.md >}})）。
- 保持每个 Actor 的状态大小合理，因为整个状态每个轮次作为一个值保存。
- 使状态变更与外部副作用具备幂等性，或对请求去重，使重新执行的轮次在至少一次投递下保持安全。

## 后续步骤

- [状态迁移]({{< ref dotnet-actorsnext-statemigration.md >}})
- [编写、注册和调用 Actor]({{< ref dotnet-actorsnext-howto.md >}})
- [state machine Actor]({{< ref dotnet-actorsnext-statemachine.md >}})
- [测试 Actor]({{< ref dotnet-actorsnext-testing.md >}})
