---
type: docs
title: ".NET SDK 中的 Actor 序列化"
linkTitle: "Actor 序列化"
weight: 300000
description: "在 .NET 中为远程和非远程 Actor 序列化类型所需的步骤"
---

Dapr Actor 包使您能够在 .NET 应用程序中使用弱类型或强类型客户端来调用 Dapr 虚拟 Actor。两种客户端采用不同的序列化方法。本文档将回顾这些差异，并说明在任一场景下都需要理解的几项关键基本规则。

请注意，由于这两种序列化方法不同，不支持混用弱类型和强类型 Actor 客户端。使用一种 Actor 客户端持久化的数据，无法通过另一种 Actor 客户端访问，因此请务必选定一种，并在整个应用程序中始终如一地使用它。

## 弱类型 Dapr Actor 客户端
在本节中，您将学习如何配置 C# 类型，使其在使用弱类型 Actor 客户端时能够在运行时被正确地序列化和反序列化。这些客户端使用基于字符串的方法名称，其请求和响应负载使用 System.Text.Json 序列化程序进行序列化。请注意，此序列化框架并非 Dapr 专有，而是由 .NET 团队在 [.NET GitHub 仓库](https://github.com/dotnet/runtime/tree/main/src/libraries/System.Text.Json) 中单独维护。

使用弱类型 Dapr Actor 客户端调用各个 Actor 的方法时，无需自行序列化或反序列化方法负载，因为 SDK 会代您透明地完成这一过程。

客户端将使用您所构建的 .NET 版本中可用的最新版 System.Text.Json，序列化行为受[相关 .NET 文档](https://learn.microsoft.com/dotnet/standard/serialization/system-text-json/overview)中所述的全部固有功能约束。

除非使用自定义选项配置进行覆盖，序列化程序将配置为使用 `JsonSerializerOptions.Web` [默认选项](https://learn.microsoft.com/dotnet/standard/serialization/system-text-json/configure-options?pivots=dotnet-8-0#web-defaults-for-jsonserializeroptions)，这意味着以下规则将生效：
- 属性名称的反序列化以不区分大小写的方式进行
- 属性名称的序列化使用 [camel casing](https://en.wikipedia.org/wiki/Camel_case)，除非属性被 `[JsonPropertyName]` 属性覆盖
- 反序列化时将从数字和/或字符串值中读取数值

### 基本序列化
在以下示例中，我们展示一个名为 Doodad 的简单类，不过它同样也可以是一个记录（record）。

```csharp
public class Doodad
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public int Count { get; set; }
}
```

默认情况下，这将按照类型中使用的成员名称以及实例化时所赋的值进行序列化：

```json
{"id": "a06ced64-4f42-48ad-84dd-46ae6a7e333d", "name": "DoodadName", "count": 5}
```

### 覆盖序列化属性名称
可以通过为所需属性应用 `[JsonPropertyName]` 属性，来覆盖默认的属性名称。

通常，对于持久化到 Actor 状态中的类型而言，这并非必需，因为您不打算脱离 Dapr 相关功能来读取或写入它们，但下面的内容仅用于清楚地说明这种做法是可行的。

#### 覆盖类上的属性名称
下面的示例演示了使用 `JsonPropertyName` 更改序列化后第一个属性的名称。请注意，`Count` 属性上最后一次使用 `JsonPropertyName` 与其预期的序列化名称相匹配。这主要是为了说明应用此属性不会产生任何负面影响——事实上，如果您以后决定更改默认序列化选项，但仍需要一致地访问之前序列化的属性，那么这种做法可能更为可取，因为 `JsonPropertyName` 会覆盖这些选项。

```csharp
public class Doodad
{
    [JsonPropertyName("identifier")]
    public Guid Id { get; set; }
    public string Name { get; set; }
    [JsonPropertyName("count")]
    public int Count { get; set; }
}
```

这将序列化为以下内容：

```json
{"identifier": "a06ced64-4f42-48ad-84dd-46ae6a7e333d", "name": "DoodadName", "count": 5}
```

#### 覆盖记录上的属性名称
让我们对 C# 12 或更高版本中的记录尝试同样的做法：

```csharp
public record Thingy(string Name, [JsonPropertyName("count")] int Count); 
```

由于在主构造函数中传递的参数（C# 12 中引入）既可以应用于记录中的属性，也可以应用于字段，因此在某些含糊的情况下，使用 `[JsonPropertyName]` 属性时可能需要明确指出您是打算将其应用于属性而非字段。如有必要，您可以在主构造函数中这样指定：

```csharp
public record Thingy(string Name, [property: JsonPropertyName("count")] int Count);
```

如果在不需要的情况下将 `[property: ]` 应用于 `[JsonPropertyName]` 属性，它不会对序列化或反序列化产生负面影响，因为操作会照常进行，就如同它被当作属性一样（通常情况下，如果没有这样标记，也是如此）。

### 枚举类型
枚举（包括普通枚举）可以序列化为 JSON，但所持久化的值可能会出乎您的意料。同样，开发人员不应脱离 Dapr 单独处理序列化后的数据，但以下信息至少有助于诊断为何一次看似微小的版本迁移未能按预期工作。

请看以下表示一年四季的 `enum` 类型：

```csharp
public enum Season
{
    Spring,
    Summer,
    Fall,
    Winter
}
```

我们将使用一个单独的演示类型来引用 `Season`，同时说明它在记录中的用法：

```csharp
public record Engagement(string Name, Season TimeOfYear);
```

给定以下初始化实例：

```csharp
var myEngagement = new Engagement("Ski Trip", Season.Winter);
```

这将序列化为以下 JSON：
```json
{"name":  "Ski Trip", "season":  3}
```

`Season.Winter` 被表示为 `3` 可能令人意外，但这是因为序列化程序会自动使用枚举值的数字表示形式：第一个值从零开始，之后的每个可用值依次递增。同样，如果正在进行迁移，而开发人员调换了枚举的顺序，这将构成解决方案中的一项重大变更，因为反序列化时，序列化后的数值将指向不同的值。

相反，`System.Text.Json` 提供了一个 `JsonConverter`，它会选择使用基于字符串的值来代替数值。要启用此功能，需要将 `[JsonConverter]` 属性应用于枚举类型本身，此后在任何引用该枚举的下游序列化或反序列化操作中都会生效。

```csharp
[JsonConverter(typeof(JsonStringEnumConverter<Season>))]
public enum Season
{
    Spring,
    Summer,
    Fall,
    Winter
}
```

使用上文 `myEngagement` 实例中的相同值，这将生成以下 JSON：

```json
{"name":  "Ski Trip", "season":  "Winter"}
```

因此，枚举成员可以随意调整顺序，而不必担心在反序列化时引入错误。

#### 自定义枚举值

System.Text.Json 序列化平台开箱即用，并不支持使用 `[EnumMember]` 来更改序列化或反序列化期间所用的枚举值，但在某些场景下这可能会很有用。同样，假设您负责重构解决方案，为各种枚举应用更好的名称。您使用了上文详述的 `JsonStringEnumConverter<TType>`，因此保存的是枚举的名称而非数值，但如果更改了枚举名称，这将引入重大变更，因为该名称将不再与状态中保存的内容匹配。

请注意，如果您选择采用这种方法，应当为所有枚举成员都加上 `[EnumMember]` 属性，以确保每个枚举值都得到一致的应用，而不是随意为之。构建或运行时都不会对此进行验证，但它被视为一项最佳实践。

在这种场景下，如何在更改枚举成员名称的同时，指定所持久化的精确值？可以使用自定义的 `JsonConverter`，并配合一个扩展方法，该方法能够在提供了 `[EnumMember]` 属性时，从其中提取对应的值。将以下内容添加到您的解决方案中：

```csharp
public sealed class EnumMemberJsonConverter<T> : JsonConverter<T> where T : struct, Enum
{
    /// <summary>读取并将 JSON 转换为类型 <typeparamref name="T" />。</summary>
    /// <param name="reader">读取器。</param>
    /// <param name="typeToConvert">要转换的类型。</param>
    /// <param name="options">指定要使用的序列化选项的对象。</param>
    /// <returns>转换后的值。</returns>
    public override T Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        // 从 JSON 读取器获取字符串值
        var value = reader.GetString();

        // 遍历所有枚举值
        foreach (var enumValue in Enum.GetValues<T>())
        {
            // 从 EnumMember 属性获取值（如果有）
            var enumMemberValue = GetValueFromEnumMember(enumValue);

            // 如果值匹配，则返回枚举值
            if (value == enumMemberValue)
            {
                return enumValue;
            }
        }

        // 如果未找到匹配项，则抛出异常
        throw new JsonException($"Invalid value for {typeToConvert.Name}: {value}");
    }

    /// <summary>将指定值写入 JSON。</summary>
    /// <param name="writer">要写入的写入器。</param>
    /// <param name="value">要转换为 JSON 的值。</param>
    /// <param name="options">指定要使用的序列化选项的对象。</param>
    public override void Write(Utf8JsonWriter writer, T value, JsonSerializerOptions options)
    {
        // 从 EnumMember 属性获取值（如果有）
        var enumMemberValue = GetValueFromEnumMember(value);

        // 将值写入 JSON 写入器
        writer.WriteStringValue(enumMemberValue);
    }

    private static string GetValueFromEnumMember(T value)
    {
        MemberInfo[] member = typeof(T).GetMember(value.ToString(), BindingFlags.DeclaredOnly | BindingFlags.Static | BindingFlags.Public);
        if (member.Length == 0)
            return value.ToString();
        object[] customAttributes = member.GetCustomAttributes(typeof(EnumMemberAttribute), false);
        if (customAttributes.Length != 0)
        {
            EnumMemberAttribute enumMemberAttribute = (EnumMemberAttribute)customAttributes;
            if (enumMemberAttribute != null && enumMemberAttribute.Value != null)
                return enumMemberAttribute.Value;
        }
        return value.ToString();
    }
}
```

现在让我们添加一个示例枚举。我们将设置一组值，使用每个枚举成员的小写形式来演示这一点。别忘了用 `JsonConverter` 属性装饰该枚举，并引用我们的自定义转换器，以替代上一节中使用的数字到字符串转换器。

```csharp
[JsonConverter(typeof(EnumMemberJsonConverter<Season>))]
public enum Season
{
    [EnumMember(Value="spring")]
    Spring,
    [EnumMember(Value="summer")]
    Summer,
    [EnumMember(Value="fall")]
    Fall,
    [EnumMember(Value="winter")]
    Winter
}
```

让我们使用前面的示例记录。我们还将添加一个 `[JsonPropertyName]` 属性，仅用于丰富演示效果：
```csharp
public record Engagement([property: JsonPropertyName("event")] string Name, Season TimeOfYear);
```

最后，让我们初始化该记录的一个新实例：

```csharp
var myEngagement = new Engagement("Conference", Season.Fall);
```

这一次，序列化会考虑附加的 `[EnumMember]` 属性中的值，这为我们提供了一种重构应用程序的机制，而无需为状态中现有的枚举值设计复杂的版本控制方案。

```json
{"event":  "Conference",  "season":  "fall"}
```

### 多态序列化

在 Dapr Actor 客户端中处理多态类型时，必须正确地进行序列化和反序列化，以确保实例化出恰当的派生类型。多态序列化允许您序列化基类型的对象，同时保留特定的派生类型信息。

要启用多态反序列化，必须在基类型上使用 `[JsonPolymorphic]` 属性。此外，务必包含 `[AllowOutOfOrderMetadataProperties]` 属性，以确保即使 `$type` 等元数据属性不是 JSON 对象中的第一个属性，System.Text.Json 也能正确处理它们。

#### 示例
```cs
[JsonPolymorphic]
[AllowOutOfOrderMetadataProperties]
public abstract class SampleValueBase
{
    public string CommonProperty { get; set; }
}

public class DerivedSampleValue : SampleValueBase
{
    public string SpecificProperty { get; set; }
}
```
在此示例中，`SampleValueBase` 类同时标记了 `[JsonPolymorphic]` 和 `[AllowOutOfOrderMetadataProperties]` 属性。此设置可确保在反序列化期间，无论 `$type` 元数据属性位于 JSON 对象中的哪个位置，都能被正确识别和处理。

通过遵循这一方法，您可以在 Dapr Actor 客户端中有效地管理多态序列化与反序列化，确保实例化并使用正确的派生类型。


## 强类型 Dapr Actor 客户端
在本节中，您将学习如何配置类和记录，使其在使用强类型 Actor 客户端时能够在运行时被正确地序列化和反序列化。这些客户端使用 .NET 接口实现，与使用其他语言编写的 Dapr Actor <u>不</u>兼容。

此 Actor 客户端使用名为 [Data Contract Serializer](https://learn.microsoft.com/dotnet/framework/wcf/feature-details/serializable-types) 的序列化引擎来序列化数据，该引擎会在 C# 类型与 XML 文档之间进行相互转换。此序列化框架并非 Dapr 专有，而是由 .NET 团队在 [.NET GitHub 仓库](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.DataContractSerialization/src/System/Runtime/Serialization/DataContractSerializer.cs) 中单独维护。

在发送或接收基元类型（如字符串或整数）时，此序列化会透明地进行，您无需做任何准备。但是，在处理您自己创建的复杂类型时，需要考虑一些重要规则，以确保这一过程顺利进行。

### 可序列化类型
使用 Data Contract Serializer 时，有几项重要事项需要牢记：

- 默认情况下，所有类型、（构造后的）读/写属性以及标记为公开可见的字段都会被序列化
- 所有类型必须公开提供公共无参构造函数，或使用 DataContractAttribute 属性进行装饰
- 仅在使用 DataContractAttribute 属性时才支持 Init-only 设置器
- 只读字段、没有 Get 和 Set 方法的属性，以及具有私有 Get 和 Set 方法的内部属性或私有属性，在序列化期间都会被忽略
- 对于使用了其他复杂类型（而这些类型本身未标记 DataContractAttribute 属性）的类型，可通过使用 KnownTypesAttribute 属性来支持序列化
- 如果类型标记了 DataContractAttribute 属性，那么您希望序列化和反序列化的所有成员也必须使用 DataMemberAttribute 属性进行装饰，否则它们将被设置为其默认值

### 反序列化如何工作？
反序列化所采用的方法取决于类型是否使用 [DataContractAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.serialization.datacontractattribute) 属性进行了装饰。如果不存在此属性，则使用无参构造函数创建类型的实例。然后，每个属性和字段通过各自的设置器映射到该类型中，并将实例返回给调用方。

如果类型_是_标记了 `[DataContract]` 的，序列化程序则改为使用反射读取类型的元数据，并根据成员是否标记了 DataMemberAttribute 属性来确定应包含哪些属性或字段，因为这是一种选择加入（opt-in）的机制。随后，它会在内存中分配一个未初始化的对象（无论是否带参数，都不调用任何构造函数），并直接在每个已映射的属性或字段上设置值，即使它们是私有的或使用了 init-only 设置器。在此过程中，会在适当时调用序列化回调，然后将对象返回给调用方。

强烈建议使用序列化属性，因为它们在覆盖名称和命名空间方面提供了更大的灵活性，并且通常会用到更多现代 C# 功能。虽然默认序列化程序可用于基元类型，但不建议将其用于您自己的任何类型，无论是类、结构体还是记录。如果您使用 DataContractAttribute 属性装饰了类型，同时建议也显式地使用 DataMemberAttribute 属性装饰要序列化或反序列化的每个成员。

#### .NET 类
只要同时遵循本文档以及 [Data Contract Serializer](https://learn.microsoft.com/dotnet/framework/wcf/feature-details/serializable-types) 文档中详述的其他规则，类便会获得 Data Contract Serializer 的完全支持。

这里最重要的一点是，您必须拥有公共无参构造函数，或者必须使用适当的属性对其进行装饰。让我们看几个示例，以真正厘清哪些做法可行，哪些不可行。

在以下示例中，我们展示一个名为 Doodad 的简单类。这里我们没有提供显式构造函数，因此编译器会提供默认的无参构造函数。由于我们使用的是[支持的基元类型](###支持的基元类型)（Guid、string 和 int32），并且所有成员都具有公共 getter 和 setter，因此无需任何属性，我们就能在通过 Dapr Actor 方法发送和接收此类时毫无问题地使用它。

```csharp
public class Doodad
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public int Count { get; set; }
}
```

默认情况下，这将按照类型中使用的成员名称以及实例化时所赋的任何值进行序列化：

```xml
<Doodad>
  <Id>a06ced64-4f42-48ad-84dd-46ae6a7e333d</Id>
  <Name>DoodadName</Name>
  <Count>5</Count>
</Doodad>
```

所以，让我们稍作调整——添加我们自己的构造函数，并且只在成员上使用 init-only 设置器。这将无法正确地序列化和反序列化，原因不在于使用了 init-only 设置器，而在于缺少无参构造函数。

```csharp
// 无法正确序列化！
public class Doodad
{
    public Doodad(string name, int count)
    {
        Id = Guid.NewGuid();
        Name = name;
        Count = count;
    }

    public Guid Id { get; set; }
    public string Name { get; init; }
    public int Count { get; init; }
}
```

如果我们为该类型添加公共无参构造函数，就可以正常工作了，并且无需进一步的注释即可生效。

```csharp
public class Doodad
{
    public Doodad()
    {
    }

    public Doodad(string name, int count)
    {
        Id = Guid.NewGuid();
        Name = name;
        Count = count;
    }

    public Guid Id { get; set; }
    public string Name { get; set; }
    public int Count { get; set; }
}
```

但如果我们不想添加这个构造函数呢？也许您不希望开发人员不小心使用非预期的构造函数来创建此 Doodad 的实例。这正是更灵活的属性发挥作用之处。如果使用 [DataContractAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.serialization.datacontractattribute) 属性装饰类型，您就可以去掉无参构造函数，它将再次正常工作。

```csharp
[DataContract]
public class Doodad
{
    public Doodad(string name, int count)
    {
        Id = Guid.NewGuid();
        Name = name;
        Count = count;
    }

    public Guid Id { get; set; }
    public string Name { get; set; }
    public int Count { get; set; }
}
```

在上面的示例中，我们不需要同时使用 [DataMemberAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.serialization.datamemberattribute) 属性，因为同样地，我们使用的是序列化程序所支持的[内置基元类型](###支持的基元类型)。不过，如果使用这些属性，我们将获得更大的灵活性。通过 DataContractAttribute 属性，我们可以使用 Namespace 参数指定自己的 XML 命名空间，并通过 Name 参数更改类型在序列化为 XML 文档时所使用的名称。

建议的做法是为类型附加 DataContractAttribute 属性，并为所有要序列化的成员附加 DataMemberAttribute 属性——即使它们并非必需，并且您没有更改默认值，它们也会被忽略，但它们为您提供了一种选择机制，可将原本不会包含的成员纳入序列化范围，例如标记为私有的成员，或本身为复杂类型或集合的成员。

请注意，如果您选择序列化私有成员，它们的值将以纯文本形式被序列化——根据您在序列化之后处理数据的方式，这些值很可能被查看、拦截，甚至被篡改，因此在您的使用场景中，是否要标记这些成员，是一项需要慎重考虑的问题。

在以下示例中，我们将看到如何使用属性来更改某些成员的序列化名称，并引入 [IgnoreDataMemberAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.serialization.ignoredatamemberattribute) 属性。顾名思义，它会告诉序列化程序跳过该属性，即使它原本符合序列化条件。此外，由于我使用 DataContractAttribute 属性装饰了该类型，这意味着我可以在属性上使用 init-only 设置器。

```csharp
[DataContract(Name="Doodad")]
public class Doodad
{
    public Doodad(string name = "MyDoodad", int count = 5)
    {
        Id = Guid.NewGuid();
        Name = name;
        Count = count;
    }

    [DataMember(Name = "id")]
    public Guid Id { get; init; }
    [IgnoreDataMember]
    public string Name { get; init; }
    [DataMember]
    public int Count { get; init; }
}
```

序列化时，由于我们更改了序列化成员的名称，使用默认值的新 Doodad 实例预计会被序列化为：

```xml
<Doodad>
  <id>a06ced64-4f42-48ad-84dd-46ae6a7e333d</id>
  <Count>5</Count>
</Doodad>
```

##### C# 12 中的类 - 主构造函数
C# 12 为类引入了主构造函数。使用主构造函数意味着编译器将不会生成隐式的默认无参构造函数。虽然类上的主构造函数不会生成任何公共属性，但这意味着，如果向该主构造函数传递了任何参数，或者类中包含非基元类型，那么您要么需要指定自己的无参构造函数，要么使用序列化属性。

下面是一个示例：我们使用主构造函数将 ILogger 注入到字段中，并添加我们自己的无参构造函数，无需任何属性。

```csharp
public class Doodad(ILogger<Doodad> _logger)
{
    public Doodad() {} // 我们自己的无参构造函数

    public Doodad(string name, int count)
    {
        Id = Guid.NewGuid();
        Name = name;
        Count = count;
    }

    public Guid Id { get; set; }
    public string Name { get; set; }
    public int Count { get; set; } 
}
```

并使用我们的序列化属性（同样，因为使用了序列化属性，所以选择使用 init-only 设置器）：

```csharp
[DataContract]
public class Doodad(ILogger<Doodad> _logger)
{
    public Doodad(string name, int count)
    {
        Id = Guid.NewGuid();
        Name = name;
        Count = count;
    }

    [DataMember]
    public Guid Id { get; init; }
    [DataMember]
    public string Name { get; init; }
    [DataMember]
    public int Count { get; init; }
}
```

#### .NET 结构体
只要结构体使用 DataContractAttribute 属性标记，并且希望序列化的成员使用 DataMemberAttribute 属性标记，Data Contract 序列化程序便会支持该结构体。此外，为了支持反序列化，该结构体还需要具有无参构造函数。即使像 C# 10 所允许的那样定义了自己的无参构造函数，这也同样可行。

```csharp
[DataContract]
public struct Doodad
{
    [DataMember]
    public int Count { get; set; }
}
```

#### .NET 记录
记录是在 C# 9 中引入的，在序列化方面，它与类遵循完全相同的规则。我们建议您使用 DataContractAttribute 属性装饰所有记录，并使用 DataMemberAttribute 属性装饰要序列化的成员，这样在使用此功能或其他较新的 C# 功能时，就不会遇到任何反序列化问题。由于记录类默认对属性使用 init-only 设置器，并且鼓励使用主构造函数，因此为类型应用这些属性可确保序列化程序能够按原样正确地容纳您的类型。

通常，记录会以简洁的单行语句形式呈现，使用新的主构造函数概念：

```csharp
public record Doodad(Guid Id, string Name, int Count);
```

一旦您在 Dapr Actor 方法调用中使用它，由于既没有可用的无参构造函数，也没有使用上述属性进行装饰，它就会抛出错误，并提示使用序列化属性。

这里我们添加一个显式的无参构造函数，它不会再抛出错误，但在反序列化期间不会设置任何值，因为这些属性是通过 init-only 设置器创建的。由于它没有对任何成员使用 DataContractAttribute 属性或 DataMemberAttribute 属性，序列化程序将无法在反序列化期间正确映射目标成员。
```csharp
public record Doodad(Guid Id, string Name, int Count)
{
    public Doodad() {}
}
```

这种方法无需额外的构造函数，而是依赖于序列化属性。由于我们使用 DataContractAttribute 属性标记类型，并为每个成员使用各自的 DataMemberAttribute 属性进行装饰，序列化引擎便能毫无问题地从 XML 文档映射到我们的类型。
```csharp
[DataContract]
public record Doodad(
        [property: DataMember] Guid Id,
        [property: DataMember] string Name,
        [property: DataMember] int Count)
```

#### 支持的基元类型
.NET 中内置了多种被视为基元类型的类型，开发人员无需额外努力即可对其进行序列化：

- [Byte](https://learn.microsoft.com/dotnet/api/system.byte)
- [SByte](https://learn.microsoft.com/dotnet/api/system.sbyte)
- [Int16](https://learn.microsoft.com/dotnet/api/system.int16)
- [Int32](https://learn.microsoft.com/dotnet/api/system.int32)
- [Int64](https://learn.microsoft.com/dotnet/api/system.int64)
- [UInt16](https://learn.microsoft.com/dotnet/api/system.uint16)
- [UInt32](https://learn.microsoft.com/dotnet/api/system.uint32)
- [UInt64](https://learn.microsoft.com/dotnet/api/system.uint64)
- [Single](https://learn.microsoft.com/dotnet/api/system.single)
- [Double](https://learn.microsoft.com/dotnet/api/system.double)
- [Boolean](https://learn.microsoft.com/dotnet/api/system.boolean)
- [Char](https://learn.microsoft.com/dotnet/api/system.char)
- [Decimal](https://learn.microsoft.com/dotnet/api/system.decimal)
- [Object](https://learn.microsoft.com/dotnet/api/system.object)
- [String](https://learn.microsoft.com/dotnet/api/system.string)

还有另外一些类型，它们并非真正的基元类型，但同样获得了类似的内置支持：

- [DateTime](https://learn.microsoft.com/dotnet/api/system.datetime)
- [TimeSpan](https://learn.microsoft.com/dotnet/api/system.timespan)
- [Guid](https://learn.microsoft.com/dotnet/api/system.guid)
- [Uri](https://learn.microsoft.com/dotnet/api/system.uri)
- [XmlQualifiedName](https://learn.microsoft.com/dotnet/api/system.xml.xmlqualifiedname)

同样，如果您想通过 Actor 方法传递这些类型，无需额外考虑，因为它们会毫无问题地被序列化和反序列化。此外，本身标记了 [SerializableAttribute](https://learn.microsoft.com/dotnet/api/system.serializableattribute) 属性的类型也会被序列化。

#### 枚举类型
如果枚举被适当地标记，那么包括标志枚举（flag enumerations）在内的枚举都是可序列化的。您希望序列化的枚举成员必须使用 [EnumMemberAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.serialization.enummemberattribute) 属性进行标记，才能被序列化。在该属性的可选 Value 参数中传入自定义值，即可指定成员在序列化文档中使用的值，而不必让序列化程序根据成员名称自动推导。

枚举类型本身无需使用 `DataContractAttribute` 属性进行装饰，只需要您希望序列化的成员使用 `EnumMemberAttribute` 属性进行标记即可。

```csharp
public enum Colors
{
    [EnumMember]
    Red,
    [EnumMember(Value="g")]
    Green,
    Blue, // 即使被某个类型使用，此值也不会被序列化，因为它没有使用 EnumMember 属性进行装饰
}
```

#### 集合类型
对于数据约定序列化程序而言，所有实现了 [IEnumerable](https://learn.microsoft.com/dotnet/api/system.collections.ienumerable) 接口的集合类型（包括数组和泛型集合）都被视为集合。实现了 [IDictionary](https://learn.microsoft.com/dotnet/api/system.collections.idictionary) 或泛型 [IDictionary<TKey, TValue>](https://learn.microsoft.com/dotnet/api/system.collections.generic.idictionary-2) 的类型被视为字典集合；其他所有类型都被视为列表集合。

与其他复杂类型一样，集合类型必须具有可用的无参构造函数。此外，它们还必须具有名为 Add 的方法，以便能够被正确地序列化和反序列化。这些集合类型所使用的类型本身必须标记 `DataContractAttribute` 属性，或者按照本文档的描述是可序列化的。

#### 数据约定版本控制
由于数据约定序列化程序在 Dapr 中仅用于通过代理方法，在 .NET SDK 中的值与 Dapr Actor 实例之间进行序列化和反序列化，因此几乎无需考虑数据约定的版本控制，因为数据不会在使用同一序列化程序的应用程序版本之间持久化。如果您有兴趣进一步了解数据约定版本控制，请访问[此处](https://learn.microsoft.com/dotnet/framework/wcf/feature-details/data-contract-versioning)。

#### 已知类型
通过为每个类型标记 [DataContractAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.serialization.datacontractattribute) 属性，可以轻松地嵌套您自己的复杂类型。这会告知序列化程序应如何执行反序列化。

但是，如果您正在处理多态类型，并且某个成员是基类或接口，而它具有派生类或其他实现，该怎么办？此时，您可以使用 [KnownTypeAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.serialization.knowntypeattribute) 属性，向序列化程序提供关于如何继续处理的提示。

当您将 [KnownTypeAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.serialization.knowntypeattribute) 属性应用于某个类型时，就是在告知数据约定序列化程序它可能会遇到哪些子类型，从而使其能够正确处理这些类型的序列化和反序列化，即使运行时的实际类型与声明的类型不同。

```csharp
[DataContract]
[KnownType(typeof(DerivedClass))]
public class BaseClass
{
    //基类的成员
}

[DataContract]
public class DerivedClass : BaseClass 
{
    //派生类的其他成员
}
```

在此示例中，`BaseClass` 标记了 `[KnownType(typeof(DerivedClass))]`，这告诉数据约定序列化程序，`DerivedClass` 是 `BaseClass` 的一种可能实现，在序列化或反序列化时可能需要用到它。如果没有此属性，当序列化程序遇到实际类型为 `DerivedClass` 的 `BaseClass` 实例时，将无法识别 `DerivedClass`，这可能会导致序列化异常，因为序列化程序不知道如何处理该派生类型。通过将所有可能的派生类型指定为已知类型，可以确保序列化程序能够正确处理该类型及其成员。

有关使用 `[KnownType]` 的更多信息和示例，请参阅[官方文档](https://learn.microsoft.com/dotnet/framework/wcf/feature-details/data-contract-known-types)。
