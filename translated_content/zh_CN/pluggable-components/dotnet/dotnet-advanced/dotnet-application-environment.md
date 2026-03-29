---
type: docs
title: ".NET Dapr 可插拔组件的应用环境"
linkTitle: "应用环境"
weight: 1000
description: 如何配置 .NET 可插拔组件的环境
no_list: true
is_preview: true
---

.NET Dapr 可插拔组件应用可以像 ASP.NET 应用一样配置依赖注入、日志和配置值。`DaprPluggableComponentsApplication` 暴露了一组与 `WebApplicationBuilder` 相似的配置属性。

## 依赖注入

注册到服务的组件可以参与依赖注入。在创建组件时，组件构造函数中的参数将被注入，前提是这些类型已在应用中注册。你可以通过 `DaprPluggableComponentsApplication` 暴露的 `IServiceCollection` 注册它们。

```csharp
var app = DaprPluggableComponentsApplication.Create();

// 将 MyService 注册为 IService 的单例实现。
app.Services.AddSingleton<IService, MyService>();

app.RegisterService(
    "<service name>",
    serviceBuilder =>
    {
        serviceBuilder.RegisterStateStore<MyStateStore>();
    });

app.Run();

interface IService
{
    // ...
}

class MyService : IService
{
    // ...
}

class MyStateStore : IStateStore
{
    // 在创建状态存储时注入 IService。
    public MyStateStore(IService service)
    {
        // ...
    }

    // ...
}
```

{{% alert title="警告" color="warning" %}}
不建议使用 `IServiceCollection.AddScoped()`。此类实例的生命周期绑定到单个 gRPC 方法调用，这与单个组件实例的生命周期不匹配。
{{% /alert %}}

## 日志

.NET Dapr 可插拔组件可以使用[标准 .NET 日志机制](https://learn.microsoft.com/dotnet/core/extensions/logging)。`DaprPluggableComponentsApplication` 暴露了一个 `ILoggingBuilder`，可以通过它进行配置。

{{% alert title="注意" color="primary" %}}
与 ASP.NET 一样，日志记录器服务（例如 `ILogger<T>`）已预先注册。
{{% /alert %}}

```csharp
var app = DaprPluggableComponentsApplication.Create();

// 清除默认日志记录器并设置新的日志记录器。
app.Logging.ClearProviders();
app.Logging.AddConsole();

app.RegisterService(
    "<service name>",
    serviceBuilder =>
    {
        serviceBuilder.RegisterStateStore<MyStateStore>();
    });

app.Run();

class MyStateStore : IStateStore
{
    // 在创建状态存储时注入日志记录器。
    public MyStateStore(ILogger<MyStateStore> logger)
    {
        // ...
    }

    // ...
}
```

## 配置值

由于 .NET 可插拔组件基于 ASP.NET 构建，它们可以使用其[标准配置机制](https://learn.microsoft.com/dotnet/core/extensions/configuration)，并默认使用同一组[预先注册的提供程序](https://learn.microsoft.com/aspnet/core/fundamentals/configuration/?view=aspnetcore-6.0#default-application-configuration-sources)。`DaprPluggableComponentsApplication` 暴露了一个 `IConfigurationManager`，可以通过它进行配置。

```csharp
var app = DaprPluggableComponentsApplication.Create();

// 清除默认配置提供程序并添加新的提供程序。
((IConfigurationBuilder)app.Configuration).Sources.Clear();
app.Configuration.AddEnvironmentVariables();

// 在启动时获取配置值。
const value = app.Configuration["<name>"];

app.RegisterService(
    "<service name>",
    serviceBuilder =>
    {
        serviceBuilder.RegisterStateStore<MyStateStore>();
    });

app.Run();

class MyStateStore : IStateStore
{
    // 在创建状态存储时注入配置。
    public MyStateStore(IConfiguration configuration)
    {
        // ...
    }

    // ...
}
```

## 后续步骤

- [了解组件生命周期的更多信息]({{% ref "dotnet-component-lifetime" %}})
- [了解多服务的更多信息]({{% ref "dotnet-multiple-services" %}})
- 了解如何使用可插拔组件 .NET SDK：
  - [绑定]({{% ref "dotnet-bindings" %}})
  - [发布订阅]({{% ref "dotnet-pub-sub" %}})
  - [状态存储]({{% ref "dotnet-state-store" %}})
