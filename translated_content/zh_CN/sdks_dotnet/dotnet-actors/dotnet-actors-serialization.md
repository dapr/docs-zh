---
type: docs
title: ".NET SDK 中的 Actor 序列化"
linkTitle: "Actor 序列化"
weight: 300000
description: 在 .NET 中为远程和非远程 Actor 序列化类型所需的步骤
---
# Actor 序列化

Dapr actor 包使您能够在 .NET 应用程序中使用弱类型或强类型客户端来使用 Dapr virtual actors。每种方式使用不同的序列化方法。本文档将回顾这些差异，并传达一些关键的基本规则，以便在任何一种情况下都能理解。

请注意，由于这些不同的序列化方法，不支持可互换地使用弱类型或强类型 actor 客户端。使用一个 Actor 客户端持久化的数据将无法使用另一个 Actor 客户端访问，因此重要的是选择一个并在整个应用程序中一致地使用它。

## 弱类型 Dapr Actor 客户端

在本节中，您将学习如何配置 C# 类型，以便在使用弱类型 actor 客户端时在运行时正确序列化和反序列化。这些客户端使用基于字符串的方法名称，以及使用 System.Text.Json 序列化程序序列化的请求和响应负载。请注意，此序列化框架并非特定于 Dapr，而是由 .NET 团队在 [.NET GitHub 仓库](https://github.com/dotnet/runtime/tree/main/src/libraries/System.Text.Json) 中单独维护。

当使用弱类型 Dapr Actor 客户端从各种 actor 调用方法时，不需要独立序列化或反序列化方法负载，因为 SDK 将代表您透明地执行此操作。

客户端将针对您构建的 .NET 版本可用的最新版本的 System.Text.Json，并且序列化遵循[相关 .NET 文档](https://learn.microsoft.com/dotnet/standard/serialization/system-text-json/overview)中提供的所有固有功能。

序列化程序将配置为使用 `JsonSerializerOptions.Web` [默认选项](https://learn.microsoft.com/dotnet/standard/serialization/system-text-json/configure-options?pivots=dotnet-8-0#web-defaults-for-jsonserializeroptions)，除非使用自定义选项配置覆盖，这意味着应用以下内容：
- 属性名称的反序列化以不区分大小写的方式执行
- 属性名称的序列化使用 [camel casing](https://en.wikipedia.org/wiki/Camel_case) 执行，除非属性被 `[JsonPropertyName]` 属性覆盖
- 反序列化将从数字和/或字符串值中读取数值

### 基本序列化

在以下示例中，我们展示了一个名为 Doodad 的简单类，但它也可以是一个记录。

```csharp
public class Doodad
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public int Count { get; set; }
}
```

默认情况下，这将使用类型中使用的成员名称以及其实例化的任何值进行序列化：

```json
{"id": "a06ced64-4f42-48ad-84dd-46ae6a7e333d", "name": "DoodadName", "count": 5}
```

### 覆盖序列化属性名称

可以通过将 `[JsonPropertyName]` 属性应用于所需的属性来覆盖默认属性名称。

通常，对于您持久化到 actor 状态的类型，这不是必需的，因为您不打算独立于 Dapr 相关功能读取或写入它们，但以下内容仅是为了清楚地说明这是可能的。

#### 覆盖类上的属性名称

以下示例演示了使用 `JsonPropertyName` 更改序列化后第一个属性的名称。请注意，`Count` 属性上最后一次使用 `JsonPropertyName` 与预期序列化的名称相匹配。这主要是为了证明应用此属性不会产生任何负面影响——事实上，如果您稍后决定更改默认序列化选项但仍需要在更改之前一致地访问以前序列化的属性，这可能是更可取的，因为 `JsonPropertyName` 将覆盖这些选项。

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

让我们尝试对 C# 12 或更高版本的记录执行相同的操作：

```csharp
public record Thingy(string Name, [JsonPropertyName("count")] int Count); 
```

由于在主构造函数中传递的参数（在 C# 12 中引入）可以应用于记录中的属性或字段，因此在某些不明确的情况下，使用 `[JsonPropertyName]` 属性可能需要指定您打算将属性应用于属性而不是字段。如果有必要，您可以在主构造函数中这样指示：

```csharp
public record Thingy(string Name, [property: JsonPropertyName("count")] int Count);
```

如果在不需要的情况下将 `[property: ]` 应用于 `[JsonPropertyName]` 属性，则不会对序列化或反序列化产生负面影响，因为操作将正常进行，就好像它是一个属性（通常情况下，如果没有这样标记）。

### 枚举类型

枚举（包括平面枚举）可以序列化为 JSON，但持久化的值可能会让您感到惊讶。同样，开发人员不应该独立于 Dapr 处理序列化数据，但以下信息可能至少有助于诊断为什么看似微小的版本迁移无法按预期工作。

采用以下 `enum` 类型提供一年中的各个季节：

```csharp
public enum Season
{
    Spring,
    Summer,
    Fall,
    Winter
}
```

我们将继续使用一个单独的演示类型来引用我们的 `Season`，并同时演示它如何与记录一起使用：

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

我们的 `Season.Winter` 值表示为 `3` 可能是出乎意料的，但这是因为序列化程序将自动使用枚举值的数字表示形式，第一个值从零开始，并递增每个可用附加值的数值。同样，如果正在进行迁移并且开发人员翻转了枚举的顺序，这将对您的解决方案产生重大更改，因为在反序列化时序列化的数值将指向不同的值。

相反，`System.Text.Json` 提供了一个 `JsonConverter`，它将选择使用基于字符串的值而不是数值。需要将 `[JsonConverter]` 属性应用于枚举类型本身以启用此功能，但随后将在任何引用枚举的下游序列化或反序列化操作中实现。

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

使用上面 `myEngagement` 实例中的相同值，这将生成以下 JSON：

```json
{"name":  "Ski Trip", "season":  "Winter"}
```

因此，可以移动枚举成员，而无需担心在反序列化期间引入错误。

#### 自定义枚举值

System.Text.Json 序列化平台开箱即用，不支持使用 `[EnumMember]` 来允许您更改序列化或反序列化期间使用的枚举值，但在某些情况下，这可能很有用。同样，假设您负责重构解决方案，以便为各种枚举应用更好的名称。您使用了上面详述的 `JsonStringEnumConverter<TType>`，因此您将枚举的名称保存为值而不是数值，但如果您更改枚举名称，这将引入重大更改，因为该名称将不再与状态中的名称匹配。

请注意，如果您选择使用此方法，应该用 `[EnumMember]` 属性装饰所有枚举成员，以便为每个枚举值一致地应用值，而不是杂乱无章。没有任何东西会在构建或运行时验证这一点，但它被视为最佳实践操作。

在这种情况下，如何指定持久化的精确值，同时更改枚举成员的名称？使用自定义 `JsonConverter` 和扩展方法，该方法可以在提供的情况下从附加的 `[EnumMember]` 属性中提取值。将以下内容添加到您的解决方案中：

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

        // 如果未找到匹配项，则引发异常
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

现在让我们添加一个示例枚举器。我们将设置一个值，该值使用每个枚举成员的小写版本来演示这一点。不要忘记用 `JsonConverter` 属性装饰枚举，并引用我们的自定义转换器，而不是上一节中使用的数字到字符串转换器。

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

让我们使用之前的示例记录。我们还将添加一个 `[JsonPropertyName]` 属性只是为了增强演示：
```csharp
public record Engagement([property: JsonPropertyName("event")] string Name, Season TimeOfYear);
```

最后，让我们初始化一个新的实例：

```csharp
var myEngagement = new Engagement("Conference", Season.Fall);
```

这一次，序列化将考虑来自附加的 `[EnumMember]` 属性的值，为我们提供了一种重构应用程序的机制，而不需要对状态中现有枚举值进行复杂的版本控制方案。

```json
{"event":  "Conference",  "season":  "fall"}
```

### 多态序列化

在 Dapr Actor 客户端中使用多态类型时，必须正确处理序列化和反序列化，以确保实例化适当的派生类型。多态序列化允许您序列化基类型的对象，同时保留特定的派生类型信息。

要启用多态反序列化，必须在基类型上使用 `[JsonPolymorphic]` 属性。此外，至关重要的是包含 `[AllowOutOfOrderMetadataProperties]` 属性，以确保元数据属性（如 `$type`）可以被 System.Text.Json 正确处理，即使它们不是 JSON 对象中的第一个属性。

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
在此示例中，`SampleValueBase` 类标记了 `[JsonPolymorphic]` 和 `[AllowOutOfOrderMetadataProperties]` 属性。此设置确保 `$type` 元数据属性可以在反序列化期间正确识别和处理，无论它在 JSON 对象中的位置如何。

通过遵循此方法，您可以在 Dapr Actor 客户端中有效地管理多态序列化和反序列化，确保实例化和使用正确的派生类型。


## 强类型 Dapr Actor 客户端

在本节中，您将学习如何配置类和记录，以便在使用强类型 actor 客户端时在运行时正确序列化和反序列化。这些客户端使用 .NET 接口实现，与使用其他语言编写的 Dapr Actor <u>不</u>兼容。

此 actor 客户端使用名为 [Data Contract Serializer](https://learn.microsoft.com/dotnet/framework/wcf/feature-details/serializable-types) 的序列化引擎序列化数据，该引擎将 C# 类型转换为 XML 文档并从中转换。此序列化框架并非特定于 Dapr，而是由 .NET 团队在 [.NET GitHub 仓库](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.DataContractSerialization/src/System/Runtime/Serialization/DataContractSerializer.cs) 中单独维护。

发送或接收基元类型（如字符串或整数）时，此序列化会透明地发生，您无需进行任何必要的准备。但是，在处理您自己创建的复杂类型时，需要考虑一些重要规则，以便此过程顺利进行。

### 可序列化类型

使用 Data Contract Serializer 时，有几个重要的注意事项需要牢记：

- 默认情况下，所有类型、读/写属性（构造后）和标记为公开可见的字段都会被序列化
- 所有类型必须公开公共无参构造函数或使用 DataContractAttribute 属性进行装饰
- 仅支持使用 DataContractAttribute 属性的 Init-only 设置器
- 只读字段、没有 Get 和 Set 方法的属性以及具有私有 Get 和 Set 方法的内部或私有属性在序列化期间将被忽略
- 支持对使用本身未标记 DataContractAttribute 属性的其他复杂类型的类型进行序列化，通过使用 KnownTypesAttribute 属性
- 如果类型标记了 DataContractAttribute 属性，则您希望序列化和反序列化的所有成员也必须使用 DataMemberAttribute 属性进行装饰，否则将设置为其默认值

### 反序列化如何工作？

反序列化使用的方法取决于类型是否使用 [DataContractAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.serialization.datacontractattribute) 属性进行装饰。如果不存在此属性，则使用无参构造函数创建类型的实例。然后，每个属性和字段使用其各自的设置器映射到类型中，并将实例返回给调用者。

如果类型标记了 `[DataContract]`，序列化程序将改为使用反射读取类型的元数据，并根据是否使用 DataMemberAttribute 属性标记来确定应包含哪些属性或字段，因为它是基于选择性加入的方式执行的。然后，它在内存中分配一个未初始化的对象（避免使用任何构造函数，无论是否有参数），然后直接在每个映射的属性或字段上设置值，即使是私有的或使用 init-only 设置器。在此过程中，将根据情况调用序列化回调，然后将对象返回给调用者。

强烈建议使用序列化属性，因为它们提供了更大的灵活性来覆盖名称和命名空间，并且通常使用更多的现代 C# 功能。虽然默认序列化程序可以用于基元类型，但不建议将其用于您自己的任何类型，无论是类、结构体还是记录。如果您使用 DataContractAttribute 属性装饰类型，还建议显式使用 DataMemberAttribute 属性装饰要序列化或反序列化的每个成员。

#### .NET 类

类在 Data Contract Serializer 中得到完全支持，前提是还遵循本文档和 [Data Contract Serializer](https://learn.microsoft.com/dotnet/framework/wcf/feature-details/serializable-types) 文档中详述的其他规则。

这里要记住的最重要的事情是，您必须拥有公共无参构造函数，或者必须使用适当的属性对其进行装饰。让我们查看一些示例来真正阐明什么可行，什么不可行。

在以下示例中，我们展示了一个名为 Doodad 的简单类。这里我们没有提供显式构造函数，因此编译器将提供默认的无参构造函数。因为我们使用的是 [支持的基元类型](###支持的基元类型)（Guid、string 和 int32），并且我们的所有成员都具有公共 getter 和 setter，所以不需要任何属性，并且我们可以毫无问题地在 Dapr actor 方法中发送和接收此类时使用此类。

```csharp
public class Doodad
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public int Count { get; set; }
}
```

默认情况下，这将使用类型中使用的成员名称以及其实例化的任何值进行序列化：

```xml
<Doodad>
  <Id>a06ced64-4f42-48ad-84dd-46ae6a7e333d</Id>
  <Name>DoodadName</Name>
  <Count>5</Count>
</Doodad>
```

所以让我们调整它——让我们添加自己的构造函数，并且只在成员上使用 init-only 设置器。这将无法序列化和反序列化，不是因为使用了 init-only 设置器，而是因为没有无参构造函数。

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

如果我们向类型添加公共无参构造函数，我们就可以开始了，这将无需进一步注释即可工作。

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

但是如果我们不想添加这个构造函数呢？也许您不希望您的开发人员意外地使用非预期的构造函数创建此 Doodad 的实例。这就是更灵活的属性有用的地方。如果使用 [DataContractAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.serialization.datacontractattribute) 属性装饰类型，则可以删除无参构造函数，它将再次工作。

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

在上面的示例中，我们不需要使用 [DataMemberAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.serialization.datamemberattribute) 属性，因为同样，我们使用的是序列化程序支持的 [内置基元类型](###支持的基元类型)。但是，如果我们使用属性，我们会获得更多的灵活性。通过 DataContractAttribute 属性，我们可以使用 Namespace 参数指定我们自己的 XML 命名空间，并通过 Name 参数，在序列化到 XML 文档时更改类型的名称。

建议的做法是将 DataContractAttribute 属性附加到类型，并将 DataMemberAttribute 属性附加到要序列化的所有成员——如果它们不是必需的并且您没有更改默认值，它们将被忽略，但它们为您提供了一种选择序列化本来不会包含的成员的机制，例如标记为私有的成员或本身就是复杂类型或集合的成员。

请注意，如果您选择序列化私有成员，它们的值将被序列化为纯文本——根据您在序列化后处理数据的方式，它们很有可能被查看、拦截并可能被篡改，因此重要的是在您的用例中考虑是否要标记这些成员。

在以下示例中，我们将查看使用属性来更改某些成员的序列化名称，以及引入 [IgnoreDataMemberAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.serialization.ignoredatamemberattribute) 属性。顾名思义，这告诉序列化程序跳过此属性，即使它本来符合序列化条件。此外，因为我使用 DataContractAttribute 属性装饰类型，这意味着我可以在属性上使用 init-only 设置器。

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

序列化时，因为我们更改了序列化成员的名称，我们可以期望使用默认值的新 Doodad 实例序列化为：

```xml
<Doodad>
  <id>a06ced64-4f42-48ad-84dd-46ae6a7e333d</id>
  <Count>5</Count>
</Doodad>
```

##### C# 12 中的类 - 主构造函数

C# 12 为我们带来了类的主构造函数。使用主构造函数意味着编译器将被阻止创建默认的隐式无参构造函数。虽然类上的主构造函数不会生成任何公共属性，但这意味着如果向此主构造函数传递任何参数或在类中有非基元类型，则要么需要指定自己的无参构造函数，要么使用序列化属性。

这是一个示例，我们使用主构造函数将 ILogger 注入到字段并添加我们自己的无参构造函数，而无需任何属性。

```csharp
public class Doodad(ILogger<Doodad> _logger)
{
    public Doodad() {} // 我们的无参构造函数

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

并使用我们的序列化属性（同样，因为我们使用序列化属性，所以选择使用 init-only 设置器）：

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

结构体由 Data Contract 序列化程序支持，前提是它们使用 DataContractAttribute 属性标记，并且您希望序列化的成员使用 DataMemberAttribute 属性标记。此外，为了支持反序列化，结构体还需要具有无参构造函数。即使在 C# 10 中定义了自己的无参构造函数，这也可以工作。

```csharp
[DataContract]
public struct Doodad
{
    [DataMember]
    public int Count { get; set; }
}
```

#### .NET 记录

记录是在 C# 9 中引入的，在序列化方面遵循与类完全相同的规则。我们建议您应该使用 DataContractAttribute 属性装饰所有记录，并使用 DataMemberAttribute 属性装饰要序列化的成员，以免在使用此或其他较新的 C# 功能时遇到任何反序列化问题。因为记录类默认对属性使用 init-only 设置器并鼓励使用主构造函数，所以将这些属性应用于类型可确保序列化程序能够正确地容纳您的类型。

通常，记录使用新的主构造函数概念呈现为简单的单行语句：

```csharp
public record Doodad(Guid Id, string Name, int Count);
```

一旦您在 Dapr actor 方法调用中使用它，这将抛出一个错误，鼓励使用序列化属性，因为没有可用的无参构造函数，也没有使用上述属性进行装饰。

这里我们添加一个显式的无参构造函数，它不会抛出错误，但在反序列化期间不会设置任何值，因为它们是使用 init-only 设置器创建的。因为它没有对任何成员使用 DataContractAttribute 属性或 DataMemberAttribute 属性，所以序列化程序将无法在反序列化期间正确映射目标成员。
```csharp
public record Doodad(Guid Id, string Name, int Count)
{
    public Doodad() {}
}
```

这种方法不需要额外的构造函数，而是依赖于序列化属性。因为我们使用 DataContractAttribute 属性标记类型，并使用自己的 DataMemberAttribute 属性装饰每个成员，所以序列化引擎将能够毫无问题地从 XML 文档映射到我们的类型。
```csharp
[DataContract]
public record Doodad(
        [property: DataMember] Guid Id,
        [property: DataMember] string Name,
        [property: DataMember] int Count)
```

#### 支持的基元类型

.NET 中内置了多种类型，这些类型被视为基元类型，无需开发人员付出额外努力即可进行序列化：

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

还有其他不是真正基元类型但具有类似内置支持的类型：

- [DateTime](https://learn.microsoft.com/dotnet/api/system.datetime)
- [TimeSpan](https://learn.microsoft.com/dotnet/api/system.timespan)
- [Guid](https://learn.microsoft.com/dotnet/api/system.guid)
- [Uri](https://learn.microsoft.com/dotnet/api/system.uri)
- [XmlQualifiedName](https://learn.microsoft.com/dotnet/api/system.xml.xmlqualifiedname)

同样，如果您想通过 actor 方法传递这些类型，无需额外考虑，因为它们将毫无问题地序列化和反序列化。此外，本身标记了 (SerializeableAttribute)[https://learn.microsoft.com/dotnet/api/system.serializableattribute] 属性的类型也将被序列化。

#### 枚举类型

枚举（包括标志枚举）如果适当标记则是可序列化的。您希望序列化的枚举成员必须使用 [EnumMemberAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.serialization.enummemberattribute) 属性标记才能进行序列化。在此属性的可选 Value 参数中传递自定义值将允许您指定成员在序列化文档中使用的值，而不是让序列化程序从成员名称派生它。

枚举类型不要求使用 `DataContractAttribute` 属性装饰类型——只需要您希望序列化的成员使用 `EnumMemberAttribute` 属性标记即可。

```csharp
public enum Colors
{
    [EnumMember]
    Red,
    [EnumMember(Value="g")]
    Green,
    Blue, // 即使被类型使用，此值也不会被序列化，因为它没有使用 EnumMember 属性装饰
}
```

#### 集合类型

关于数据约定序列化程序，所有实现 [IEnumerable](https://learn.microsoft.com/dotnet/api/system.collections.ienumerable) 接口的集合类型（包括数组和泛型集合）都被视为集合。实现 [IDictionary](https://learn.microsoft.com/dotnet/api/system.collections.idictionary) 或泛型 [IDictionary<TKey, TValue>](https://learn.microsoft.com/dotnet/api/system.collections.generic.idictionary-2) 的类型被视为字典集合；所有其他类型都被视为列表集合。

与其他复杂类型一样，集合类型必须具有可用的无参构造函数。此外，它们还必须具有名为 Add 的方法，以便可以正确序列化和反序列化。这些集合类型使用的类型本身必须标记 `DataContractAttribute` 属性或按照本文档中的描述可序列化。

#### 数据约定版本控制

由于数据约定序列化程序仅在 Dapr 中用于通过代理方法序列化和反序列化 .NET SDK 中的值与 Dapr actor 实例之间，因此几乎不需要考虑数据约定的版本控制，因为数据不会在使用相同序列化程序的应用程序版本之间持久化。对于那些有兴趣了解有关数据约定版本控制的更多信息的人，请访问[此处](https://learn.microsoft.com/dotnet/framework/wcf/feature-details/data-contract-versioning)。

#### 已知类型

通过使用 [DataContractAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.serialization.datacontractattribute) 属性标记每个类型，可以轻松嵌套您自己的复杂类型。这会通知序列化程序应如何执行反序列化。

但是，如果您正在处理多态类型，并且您的成员之一是具有派生类或其他实现的基类或接口呢？在这里，您将使用 [KnownTypeAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.serialization.knowntypeattribute) 属性向序列化程序提供有关如何继续的提示。

当您将 [KnownTypeAttribute](https://learn.microsoft.com/dotnet/api/system.runtime.serialization.knowntypeattribute) 属性应用于类型时，您是在通知数据约定序列化程序它可能遇到哪些子类型，允许它正确处理这些类型的序列化和反序列化，即使运行时的实际类型与声明的类型不同。

```chsarp
[DataContract]
[KnownType(typeof(DerivedClass))]
public class BaseClass
{
    // 基类的成员
}

[DataContract]
public class DerivedClass : BaseClass 
{
    // 派生类的其他成员
}
```
在此示例中，`BaseClass` 标记了 `[KnownType(typeof(DerivedClass))]`，这告诉数据约定序列化程序 `DerivedClass` 是它可能需要序列化或反序列化的 `BaseClass` 的可能实现。如果没有此属性，序列化程序在遇到实际上是 `DerivedClass` 类型的 `BaseClass` 实例时将不知道 `DerivedClass`，这可能会导致序列化异常，因为序列化程序将不知道如何处理派生类型。通过将所有可能的派生类型指定为已知类型，可以确保序列化程序可以正确处理该类型及其成员。

有关使用 `[KnownType]` 的更多信息和示例，请参阅[官方文档](https://learn.microsoft.com/dotnet/framework/wcf/feature-details/data-contract-known-types)。
