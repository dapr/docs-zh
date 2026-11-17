---
type: docs
title: "How to: Retrieve Dapr runtime metadata with the .NET SDK"
linkTitle: "操作指南：获取运行时 metadata"
weight: 54010
description: "了解如何使用 Dapr Metadata .NET SDK 获取 Dapr runtime metadata"
---

让我们一步步了解如何使用 `Dapr.Metadata` 包获取 Dapr runtime metadata。该包会注册一个托管服务，在应用启动期间从 Dapr sidecar 获取 metadata，然后通过 .NET 选项模式（options pattern）公开类型化的 `DaprMetadata` 值。在本指南中，你将：

- 安装并注册 Dapr Metadata .NET SDK
- 通过 `IOptions<DaprMetadata>`、`IOptionsSnapshot<DaprMetadata>` 或 `IOptionsMonitor<DaprMetadata>` 注入 metadata
- 读取运行时 metadata、component metadata、订阅、Actor、workflow、Scheduler 以及应用连接详情
- 配置用于获取 metadata 的 Dapr HTTP 端点与 API 令牌

## 前提条件
- [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/)
- [已初始化的 Dapr environment](https://docs.dapr.io/getting-started/install-dapr-selfhost)
- 已安装 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、
  [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)、
  [.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0) 或
  [.NET 11](https://dotnet.microsoft.com/download/dotnet/11.0)
- 已将 [Dapr.Metadata](https://www.nuget.org/packages/Dapr.Metadata) NuGet 包安装到你的项目中

## 安装包

{{% alert title=".NET 框架支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年十一月结束支持。二者的支持将在 Dapr v1.20 中停止；只有 .NET 10 和 .NET 11 会支持到 2027 年底。
{{% /alert %}}

安装 Dapr Metadata 包：

```sh
dotnet add package Dapr.Metadata
```

## 使用依赖注入注册 Dapr Metadata

在应用启动期间使用 `AddDaprMetadata()` 注册 metadata 服务：

```csharp
using Dapr.Metadata.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprMetadata();

var app = builder.Build();
```

注册过程会添加 metadata 选项类型，以及一个内部托管服务，该服务在应用启动时从 Dapr runtime 获取 metadata。

## 使用选项模式注入 metadata

`Dapr.Metadata` 包通过 .NET 选项模式公开运行时 metadata，类型为 `DaprMetadata`。请根据消费 metadata 的服务的生命周期，选择与之匹配的选项接口。

### 使用 `IOptions<DaprMetadata>`

当单例风格的 metadata 视图已经足够时，使用 `IOptions<DaprMetadata>`：

```csharp
using Dapr.Metadata.Abstractions;
using Microsoft.Extensions.Options;

public sealed class MetadataReporter(IOptions<DaprMetadata> metadata)
{
    public void PrintRuntimeDetails()
    {
        var value = metadata.Value;

        Console.WriteLine($"App ID: {value.AppId}");
        Console.WriteLine($"Runtime version: {value.RuntimeVersion}");
    }
}
```

### 使用 `IOptionsSnapshot<DaprMetadata>`

在作用域服务中使用 `IOptionsSnapshot<DaprMetadata>`，例如请求 handler 或 MVC 控制器：

```csharp
using Dapr.Metadata.Abstractions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

[ApiController]
[Route("metadata")]
public sealed class MetadataController(IOptionsSnapshot<DaprMetadata> metadata) : ControllerBase
{
    [HttpGet("components")]
    public IActionResult GetComponents()
    {
        var components = metadata.Value.Components.Select(component => new
        {
            component.Name,
            component.Type,
            component.Version,
            component.Capabilities
        });

        return Ok(components);
    }
}
```

### 使用 `IOptionsMonitor<DaprMetadata>`

当你的应用使用配置热重载，或者你希望确保消费者读取的是最新的 metadata 值（以防自应用启动以来发生过变化）时，使用 `IOptionsMonitor<DaprMetadata>`。当新鲜度很重要时，这是首选方式；代价是读取当前值时可能会有短暂延迟，因为 metadata 值需要被加载：

```csharp
using Dapr.Metadata.Abstractions;
using Microsoft.Extensions.Options;

public sealed class ComponentHealthReporter(IOptionsMonitor<DaprMetadata> metadata)
{
    public IReadOnlyCollection<string> GetLoadedComponentNames()
    {
        return metadata.CurrentValue.Components
            .Select(component => component.Name)
            .OfType<string>()
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .ToArray();
    }
}
```

## 读取 metadata 值

`DaprMetadata` 类型表示 Dapr runtime metadata 端点返回的响应。

| 属性 | 说明 |
| -------- | ----------- |
| `AppId` | 在 Dapr 中注册的应用 ID。 |
| `RuntimeVersion` | Dapr runtime 版本。 |
| `EnabledFeatures` | 通过 Dapr 配置启用的命名功能。 |
| `Actors` | 已注册的 Actor 类型及其数量。 |
| `CustomAttributes` | 运行时公开的自定义 metadata 属性。 |
| `Components` | 已加载的 component 名称、类型、版本和能力。 |
| `HttpEndpoints` | 已注册的 HTTP 端点 metadata。 |
| `Subscriptions` | pub/sub 的订阅 metadata，包括规则与死信主题。 |
| `AppConnectionProperties` | 应用端口、协议、通道地址、最大并发数以及 health probe 设置。 |
| `SchedulerMetadata` | 已连接的 Scheduler 主机地址。 |
| `Workflows` | workflow runtime metadata，包括已连接的工作进程数量。 |

例如，你可以检查订阅和应用连接属性：

```csharp
using Dapr.Metadata.Abstractions;
using Microsoft.Extensions.Options;

public sealed class RuntimeMetadataService(IOptions<DaprMetadata> metadata)
{
    public void PrintSubscriptions()
    {
        foreach (var subscription in metadata.Value.Subscriptions)
        {
            Console.WriteLine($"{subscription.PubSubName}: {subscription.Topic} ({subscription.Type})");

            foreach (var rule in subscription.Rules)
            {
                Console.WriteLine($"  {rule.Match} -> {rule.Path}");
            }
        }
    }

    public void PrintAppConnection()
    {
        var appConnection = metadata.Value.AppConnectionProperties;

        Console.WriteLine($"Protocol: {appConnection.Protocol}");
        Console.WriteLine($"Address: {appConnection.ChannelAddress}:{appConnection.Port}");
        Console.WriteLine($"Max concurrency: {appConnection.MaxConcurrency}");
        Console.WriteLine($"Health path: {appConnection.Health?.HealthCheckPath}");
    }
}
```

## 配置 Dapr 端点

metadata 服务从 Dapr HTTP 端点获取 metadata。默认情况下，它使用其他 .NET SDK 客户端所使用的相同 Dapr 配置值：

| 键 | 说明 |
| --- | ----------- |
| `DAPR_HTTP_ENDPOINT` | Dapr sidecar 的 HTTP 端点。 |
| `DAPR_HTTP_PORT` | 未设置 `DAPR_HTTP_ENDPOINT` 时，本地 Dapr sidecar 的 HTTP 端口。 |
| `DAPR_API_TOKEN` | 用于与 Dapr sidecar 进行身份验证的 API 令牌。 |

这些值可以来自环境变量，也可以来自任何已注册的 `IConfiguration` 源。

### 通过 `ConfigurationBuilder` 配置

```csharp
using Dapr.Metadata.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
{
    ["DAPR_HTTP_ENDPOINT"] = "http://localhost:3500",
    ["DAPR_API_TOKEN"] = "abc123"
});

builder.Services.AddDaprMetadata();
```

### 通过环境变量配置

应用设置可以从应用可用的环境变量中读取。

| 键 | 值 |
| --- | ----- |
| `DAPR_HTTP_ENDPOINT` | `http://localhost:3500` |
| `DAPR_API_TOKEN` | `abc123` |

```csharp
using Dapr.Metadata.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddEnvironmentVariables();
builder.Services.AddDaprMetadata();
```

### 通过带前缀的环境变量配置

在共享宿主场景中，你可以将带前缀的环境变量加载到 `IConfiguration` 中，然后正常注册 metadata：

| 键 | 值 |
| --- | ----- |
| `myapp_DAPR_HTTP_ENDPOINT` | `http://localhost:3500` |
| `myapp_DAPR_API_TOKEN` | `abc123` |

```csharp
using Dapr.Metadata.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddEnvironmentVariables(prefix: "myapp_");
builder.Services.AddDaprMetadata();
```

## 本地运行

启动应用时同时启动 Dapr sidecar。sidecar 的 HTTP 端口必须与你配置的端点或端口一致：

```sh
dapr run --app-id metadata-example --dapr-http-port 3500 -- dotnet run
```

> Dapr 在 `http://localhost:3500` 上监听 HTTP 请求。

应用启动时，metadata 服务会从 sidecar 获取 metadata，并通过已注册的选项接口提供类型化的值。
