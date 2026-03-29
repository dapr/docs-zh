---
type: docs
title: ".NET SDK 中的工作流序列化"
linkTitle: "工作流序列化"
weight: 1500
description: 配置 Dapr .NET SDK 的工作流序列化
---

## 概述

从 Dapr .NET SDK v1.17.0 开始，`Dapr.Workflow` 支持可插拔序列化。SDK 默认继续使用 `System.Text.Json`，但现在您可以：

- 覆盖默认的 `System.Text.Json` 设置。
- 注册自定义序列化器（例如，MessagePack 或 BSON）。

序列化配置完全在客户端进行，不需要特定版本的 Dapr 运行时。

{{% alert title="注意" color="primary" %}}
此功能需要 Dapr .NET SDK v1.17.0 或更高版本。
{{% /alert %}}

## 兼容性和重大变更

{{% alert title="警告" color="warning" %}}
更改序列化可能是现有工作流的重大变更。序列化实现之间没有支持的迁移路径。

所有 Dapr SDK 默认使用标准 JSON 约定。如果您在 .NET 工作流和活动中更改序列化设置或切换到自定义序列化器，跨 SDK 工作流可能会失败，因为其他 SDK 可能不支持您的自定义序列化格式。
{{% /alert %}}

## 默认 JSON 序列化

默认情况下，.NET SDK 使用 `System.Text.Json` 并采用 `JsonSerializerDefaults.Web`（请参阅
[`JsonSerializerDefaults.Web` 参考](https://learn.microsoft.com/dotnet/api/system.text.json.jsonserializerdefaults?view=net-10.0)）。
这意味着：

- 属性名称不区分大小写。
- 属性名称使用 "camelCase" 格式。
- 读取时允许带引号的数字（数字属性的 JSON 字符串）。

此默认约定旨在与其他 Dapr 语言 SDK 兼容，以支持多应用工作流。

## 覆盖 `System.Text.Json` 默认值

要覆盖默认 JSON 设置，请使用工作流构建器注册工作流客户端，以便您可以提供自定义的 `JsonSerializerOptions`：

```csharp
builder.Services
    .AddDaprWorkflowBuilder(options =>
    {
        options.RegisterWorkflow<MyWorkflow>();
        options.RegisterActivity<MyActivity>();
    })
    .WithJsonSerializer(new JsonSerializerOptions { PropertyNamingPolicy = null });
```

从 DI 解析的所有 `DaprWorkflowClient` 实例都将使用提供的 `JsonSerializerOptions` 来处理工作流和活动负载。

## 自定义序列化提供程序

自定义序列化器必须实现 `IWorkflowSerializer` 接口。以下示例展示了基于 MessagePack 的实现，该实现将数据编码为 Base64 字符串进行传输：

```csharp
public sealed class MessagePackWorkflowSerializer : IWorkflowSerializer
{
    private readonly MessagePackSerializerOptions _options;

    public MessagePackWorkflowSerializer(MessagePackSerializerOptions options)
    {
        _options = options;
    }

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
        options.RegisterWorkflow<MyWorkflow>();
        options.RegisterActivity<MyActivity>();
    })
    .WithSerializer(new MessagePackWorkflowSerializer(MessagePackSerializerOptions.Standard));
```

如果需要 DI 提供的配置，请使用接收 `IServiceProvider` 的重载：

```csharp
builder.Services
    .AddDaprWorkflowBuilder(options =>
    {
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
