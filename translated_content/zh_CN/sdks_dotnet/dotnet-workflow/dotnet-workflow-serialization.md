---
type: docs
title: ".NET SDK 中的工作流序列化"
linkTitle: "工作流序列化"
weight: 1500
description: 配置 Dapr .NET SDK 的工作流序列化
---

## 概述

从 Dapr .NET SDK v1.17.0 开始，`Dapr.Workflow` 支持可插拔序列化。SDK 默认继续使用 `System.Text.Json`，但你现在可以：

- 覆盖默认的 `System.Text.Json` 设置。
- 注册自定义序列化器（例如，MessagePack 或 BSON）。

序列化配置完全在客户端进行，不需要特定版本的 Dapr 运行时。

对于大负载，[工作流数据引用（alpha）]({{% ref dotnet-workflow-data-references.md %}})可以将序列化后的数据存储在二进制存储中，而不是内联保存在历史记录里。卸载（offloading）与序列化器的选择相互独立，发生在序列化之后。与仅配置序列化器不同，它需要运行时支持二进制存储。仅完成注册时，普通的内联值保持不变；若要启用自动卸载，请选择 `PayloadWritePreference.PreferReference`。除非调用显式允许引用，否则跨应用调用的输入保持内联。转发引用需要兼容的、能感知负载的目标端，且目标端有权访问相同的被引用对象。[JavaScript SDK]({{% ref js-workflow-data-references.md %}})还支持来自 `@dapr/dapr` 3.19.0 的版本 1 引用信封，前提是序列化与存储访问兼容，并且负载的各个阶段都不需要逆向处理。不要假设其他语言的 SDK 支持数据引用。

{{% alert title="注意" color="primary" %}}
此功能需要 Dapr .NET SDK v1.17.0 或更高版本。
{{% /alert %}}

## 兼容性和重大变更

{{% alert title="警告" color="warning" %}}
更改序列化可能会对现有工作流造成重大变更。序列化实现之间不存在受支持的迁移路径。

所有 Dapr SDK 默认都使用标准 JSON 约定。如果你在 .NET 工作流和活动中更改了序列化设置或切换为自定义序列化器，跨 SDK 工作流可能会失败，因为其他 SDK 可能不支持你的自定义序列化格式。
{{% /alert %}}

## 默认 JSON 序列化

默认情况下，.NET SDK 使用 `System.Text.Json` 并采用 `JsonSerializerDefaults.Web`（请参阅
[`JsonSerializerDefaults.Web` 参考](https://learn.microsoft.com/dotnet/api/system.text.json.jsonserializerdefaults)）。
这意味着：

- 属性名称不区分大小写。
- 属性名称使用 “camelCase” 格式。
- 读取时允许带引号的数字（即数字属性对应的 JSON 字符串）。

该默认约定旨在与其他 Dapr 语言 SDK 兼容，以支持多应用工作流。

## 覆盖 `System.Text.Json` 默认值

要覆盖默认的 JSON 设置，请使用工作流构建器注册工作流客户端，以便提供自定义的 `JsonSerializerOptions`：

```csharp
builder.Services
    .AddDaprWorkflowBuilder(options =>
    {
        // 显式注册是可选的。
        options.RegisterWorkflow<MyWorkflow>();
        options.RegisterActivity<MyActivity>();
    })
    .WithJsonSerializer(new JsonSerializerOptions { PropertyNamingPolicy = null });
```

通过 DI 注册的客户端和工作器使用这些设置处理负载。独立构造的客户端也必须使用兼容的设置。序列化器实例是共享的，因此自定义实现必须能够安全地并发使用。

## 自定义序列化提供程序

在 SDK 1.19.0 中，序列化器需实现 `Dapr.Common.Serialization` 中的 `IDaprSerializer`。来自 `Dapr.Workflow.Serialization` 的 `IWorkflowSerializer` 继承了该共享接口，并且仍然受支持，包括基于工厂的注册重载。直接在 DI 中注册 `IWorkflowSerializer` 已标记为 `[Obsolete]`，并将在与 Dapr v1.20 同期发布的 SDK 版本中移除；新代码请优先实现 `IDaprSerializer`。需要实现全部四个方法，包括 `Serialize<T>`。
以下示例展示了基于 MessagePack 的实现，它将数据编码为 Base64 字符串以便传输。该示例还需要 `MessagePack` NuGet 包；请选择与你的 DTO 契约兼容的序列化选项：

```csharp
using Dapr.Workflow.Serialization;
using MessagePack;

public sealed class MessagePackWorkflowSerializer : IWorkflowSerializer
{
    private readonly MessagePackSerializerOptions _options;

    public MessagePackWorkflowSerializer(MessagePackSerializerOptions options)
    {
        _options = options;
    }

    public string Serialize<T>(T value) => Serialize(value, typeof(T));

    /// <inheritdoc/>
    public string Serialize(object? value, Type? inputType = null)
    {
        if (value == null)
        {
            return string.Empty;
        }

        var targetType = inputType ?? value.GetType();
        var bytes = MessagePackSerializer.Serialize(targetType, value, _options);
        return Convert.ToBase64String(bytes);
    }

    /// <inheritdoc/>
    public T? Deserialize<T>(string? data)
    {
        return (T?)Deserialize(data, typeof(T));
    }

    /// <inheritdoc/>
    public object? Deserialize(string? data, Type returnType)
    {
        if (returnType == null)
        {
            throw new ArgumentNullException(nameof(returnType));
        }

        if (string.IsNullOrEmpty(data))
        {
            return default;
        }

        try
        {
            var bytes = Convert.FromBase64String(data);
            return MessagePackSerializer.Deserialize(returnType, bytes, _options);
        }
        catch (FormatException ex)
        {
            throw new InvalidOperationException(
                "Failed to decode Base64 data. The input may not be valid MessagePack-serialized data.",
                ex);
        }
        catch (MessagePackSerializationException ex)
        {
            throw new InvalidOperationException(
                $"Failed to deserialize data to type {returnType.FullName}.",
                ex);
        }
    }
}
```

### 注册自定义序列化器

使用工作流构建器注册序列化器：

```csharp
builder.Services
    .AddDaprWorkflowBuilder(options =>
    {
        // 显式注册是可选的。
        options.RegisterWorkflow<MyWorkflow>();
        options.RegisterActivity<MyActivity>();
    })
    .WithSerializer(new MessagePackWorkflowSerializer(MessagePackSerializerOptions.Standard));
```

如果需要由 DI 提供配置，请使用接收 `IServiceProvider` 的重载：

```csharp
builder.Services
    .AddDaprWorkflowBuilder(options =>
    {
        // 显式注册是可选的。
        options.RegisterWorkflow<MyWorkflow>();
        options.RegisterActivity<MyActivity>();
    })
    .WithSerializer(serviceProvider =>
    {
        var options = serviceProvider
            .GetRequiredService<IOptions<MessagePackSerializerOptions>>()
            .Value;

        return new MessagePackWorkflowSerializer(options);
    });
```

## 后续步骤

- [工作流客户端注册]({{% ref dotnet-workflowclient-usage.md %}})
- [工作流数据引用]({{% ref dotnet-workflow-data-references.md %}})
- [工作流版本控制]({{% ref dotnet-workflow-versioning.md %}})
