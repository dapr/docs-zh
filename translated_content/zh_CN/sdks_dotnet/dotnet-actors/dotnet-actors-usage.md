---
type: docs
title: "Author & run actors"
linkTitle: "Authoring actors"
weight: 200000
description: Learn all about authoring and running actors with the .NET SDK
---

## 创建 actor

### ActorHost

`ActorHost`：

- 是所有 actor 必需的构造函数参数
- 由运行时提供
- 必须传递给基类构造函数
- 包含允许该 actor 实例与运行时通信的所有状态

```csharp
internal class MyActor : Actor, IMyActor, IRemindable
{
    public MyActor(ActorHost host) // Accept ActorHost in the constructor
        : base(host) // Pass ActorHost to the base class constructor
    {
    }
}
```

由于 `ActorHost` 包含 actor 独有的状态，你无需将实例传递到代码的其他部分。建议仅在测试中创建自己的 `ActorHost` 实例。

### 依赖注入

Actor 支持将额外参数[依赖注入](https://docs.microsoft.com/aspnet/core/fundamentals/dependency-injection)到构造函数中。你定义的任何其他参数都将从依赖注入容器中获取其值。

```csharp
internal class MyActor : Actor, IMyActor, IRemindable
{
    public MyActor(ActorHost host, BankService bank) // Accept BankService in the constructor
        : base(host)
    {
        ...
    }
}
```

actor 类型应具有单个 `public` 构造函数。actor 基础设施使用 [`ActivatorUtilities`](https://docs.microsoft.com/dotnet/core/extensions/dependency-injection#constructor-injection-behavior) 模式来构造 actor 实例。

你可以在 `Startup.cs` 中注册类型以使其可用于依赖注入。阅读更多关于[注册类型的不同方式](https://docs.microsoft.com/aspnet/core/fundamentals/dependency-injection?#service-registration-methods)。

```csharp
// In Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    ...

    // Register additional types with dependency injection.
    services.AddSingleton<BankService>();
}
```

每个 actor 实例都有自己的依赖注入作用域，并在执行操作后的段时间内保留在内存中。在此期间，与 actor 关联的依赖注入作用域也被视为活动状态。当 actor 被停用时，该作用域将被释放。

如果 actor 在构造函数中注入了 `IServiceProvider`，则 actor 将接收对其作用域关联的 `IServiceProvider` 的引用。`IServiceProvider` 可用于在未来动态解析服务。

```csharp
internal class MyActor : Actor, IMyActor, IRemindable
{
    public MyActor(ActorHost host, IServiceProvider services) // Accept IServiceProvider in the constructor
        : base(host)
    {
        ...
    }
}
```

使用此模式时，避免创建许多实现 `IDisposable` 的**瞬态**服务实例。由于与 actor 关联的作用域可能在较长时间内被视为有效，因此可能会在内存中累积许多服务。有关更多信息，请参阅[依赖注入指南](https://docs.microsoft.com/dotnet/core/extensions/dependency-injection-guidelines)。

### IDisposable 和 actor

Actor 可以实现 `IDisposable` 或 `IAsyncDisposable`。建议依赖依赖注入进行资源管理，而不是在应用程序代码中实现 dispose 功能。在确实必要的罕见情况下才提供 dispose 支持。

### 日志记录

在 actor 类中，你可以通过基 `Actor` 类上的属性访问 `ILogger` 实例。此实例连接到 ASP.NET Core 日志系统，应用于 actor 内的所有日志记录。阅读更多关于[日志记录](https://docs.microsoft.com/dotnet/core/extensions/logging?tabs=command-line)。你可以配置多种不同的日志格式和输出接收器。

使用带有_命名占位符_的_结构化日志记录_，如下所示：

```csharp
public Task<MyData> GetDataAsync()
{
    this.Logger.LogInformation("Getting state at {CurrentTime}", DateTime.UtcNow);
    return this.StateManager.GetStateAsync<MyData>("my_data");
}
```

记录日志时，避免使用格式字符串，如：`$"Getting state at {DateTime.UtcNow}"`

日志记录应使用[命名占位符语法](https://docs.microsoft.com/dotnet/core/extensions/logging?tabs=command-line#log-message-template)，它提供更好的性能和与日志系统的集成。

### 使用显式 actor 类型名称

默认情况下，客户端看到的 actor _类型_派生自 actor 实现类的_名称_。默认名称将是类名（不带命名空间）。

如果需要，可以通过将 `ActorAttribute` 属性附加到 actor 实现类来指定显式类型名称。

```csharp
[Actor(TypeName = "MyCustomActorTypeName")]
internal class MyActor : Actor, IMyActor
{
    // ...
}
```

在上面的示例中，名称将是 `MyCustomActorTypeName`。

无需更改向运行时注册 actor 类型的代码，通过属性提供值就是所需的全部。

## 在服务器上托管 actor

### 注册 actor

Actor 注册是 `Startup.cs` 中 `ConfigureServices` 的一部分。你可以通过 `ConfigureServices` 方法注册具有依赖注入的服务。注册 actor 类型集是 actor 服务注册的一部分。

在 `ConfigureServices` 内部，你可以：

- 注册 actor 运行时（`AddActors`）
- 注册 actor 类型（`options.Actors.RegisterActor<>`）
- 配置 actor 运行时设置 `options`
- 注册额外的服务类型以注入到 actor 的依赖注入中（`services`）

```csharp
// In Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    // Register actor runtime with DI
    services.AddActors(options =>
    {
        // Register actor types and configure actor settings
        options.Actors.RegisterActor<MyActor>();
        
        // Configure default settings
        options.ActorIdleTimeout = TimeSpan.FromMinutes(10);
        options.ActorScanInterval = TimeSpan.FromSeconds(35);
        options.DrainOngoingCallTimeout = TimeSpan.FromSeconds(35);
        options.DrainRebalancedActors = true;
    });

    // Register additional services for use with actors
    services.AddSingleton<BankService>();
}
```

### 配置 JSON 选项

actor 运行时使用 [System.Text.Json](https://docs.microsoft.com/dotnet/standard/serialization/system-text-json-overview) 进行：

- 将数据序列化到状态存储
- 处理来自弱类型客户端的请求

默认情况下，actor 运行时使用基于 [JsonSerializerDefaults.Web](https://docs.microsoft.com/dotnet/api/system.text.json.jsonserializerdefaults?view=net-5.0) 的设置。

你可以作为 `ConfigureServices` 的一部分配置 `JsonSerializerOptions`：

```csharp
// In Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddActors(options =>
    {
        ...
        
        // Customize JSON options
        options.JsonSerializerOptions = ...
    });
}
```

### Actor 和路由

ASP.NET Core 对 actor 的托管支持使用[终结点路由](https://docs.microsoft.com/aspnet/core/fundamentals/routing)系统。.NET SDK 不支持使用早期 ASP.NET Core 版本中的旧路由系统托管 actor。

由于 actor 使用终结点路由，actor HTTP 处理程序是中间件管道的一部分。以下是设置带有 actor 的中间件管道的 `Configure` 方法的最小示例。

```csharp
// in Startup.cs
public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    if (env.IsDevelopment())
    {
        app.UseDeveloperExceptionPage();
    }

    app.UseRouting();

    app.UseEndpoints(endpoints =>
    {
        // Register actors handlers that interface with the Dapr runtime.
        endpoints.MapActorsHandlers();
    });
}
```

`UseRouting` 和 `UseEndpoints` 调用是配置路由所必需的。通过在终结点中间件内添加 `MapActorsHandlers` 将 actor 配置为管道的一部分。

这是一个最小示例，Actor 功能与以下功能并存是有效的：

- Controllers
- Razor Pages
- Blazor
- gRPC Services
- Dapr pub/sub handler
- 其他终结点，如运行状况检查

### 有问题的中间件

某些中间件可能会干扰 Dapr 请求到 actor 处理程序的路由。特别是，`UseHttpsRedirection` 对 Dapr 的默认配置有问题。Dapr 默认情况下通过未加密的 HTTP 发送请求，`UseHttpsRedirection` 中间件将阻止这些请求。此中间件目前不能与 Dapr 一起使用。

```csharp
// in Startup.cs
public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    if (env.IsDevelopment())
    {
        app.UseDeveloperExceptionPage();
    }

    // INVALID - this will block non-HTTPS requests
    app.UseHttpsRedirection();
    // INVALID - this will block non-HTTPS requests

    app.UseRouting();

    app.UseEndpoints(endpoints =>
    {
        // Register actors handlers that interface with the Dapr runtime.
        endpoints.MapActorsHandlers();
    });
}
```

## 后续步骤

尝试[运行和使用虚拟 actor 示例]({{% ref dotnet-actors-howto.md %}})。
