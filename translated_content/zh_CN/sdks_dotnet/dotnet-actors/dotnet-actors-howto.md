---
type: docs
title: "如何：在 .NET SDK 中运行和使用 virtual Actor"
linkTitle: "如何：运行和使用 virtual Actor"
weight: 300000
description: 通过此示例试用 .NET Dapr virtual Actor
---

Dapr Actor 包允许你从 .NET 应用程序与 Dapr virtual Actor 交互。在本指南中，你将学习如何：

- 创建一个 Actor（`MyActor`）。
- 在客户端应用程序上调用其方法。

```
MyActor --- MyActor.Interfaces
         |
         +- MyActorService
         |
         +- MyActorClient
```

**接口项目 (\MyActor\MyActor.Interfaces)** 

该项目包含 Actor 的接口定义。Actor 接口可以在任意名称的项目中定义。该接口定义了以下各方共同遵守的 Actor 契约：

- Actor 实现
- 调用 Actor 的客户端

由于客户端项目可能依赖它，最好将其定义在独立于 Actor 实现的程序集中。

**Actor 服务项目 (\MyActor\MyActorService)** 

该项目实现承载 Actor 的 ASP.NET Core Web 服务。它包含 Actor 的实现 `MyActor.cs`。Actor 实现是一个类，它：

- 派生自基类型 Actor
- 实现 `MyActor.Interfaces` 项目中定义的接口。

Actor 类还必须实现一个构造函数，该构造函数接受一个 `ActorService` 实例和一个 `ActorId`，并将它们传递给基 Actor 类。

**Actor 客户端项目 (\MyActor\MyActorClient)** 

该项目包含 Actor 客户端的实现，该客户端调用 Actor Interfaces 中定义的 MyActor 方法。

## 前置条件
- 已安装 [Dapr CLI]({{< ref install-dapr-cli.md >}})。
- 已初始化 [Dapr environment]({{< ref install-dapr-selfhost.md >}})。
- 已安装 [.NET 8](https://dotnet.microsoft.com/download)、[.NET 9](https://dotnet.microsoft.com/download)、
  [.NET 10](https://dotnet.microsoft.com/download) 或 [.NET 11](https://dotnet.microsoft.com/download)

{{% alert title=".NET 框架支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年 11 月结束支持。从 Dapr v1.20 起将不再支持这两个版本；只有 .NET 10 和 .NET 11 将支持到 2027 年底。
{{% /alert %}}

## 步骤 0：准备

由于我们将创建 3 个项目，请选择一个空目录作为起点，并在你选择的终端中打开它。

## 步骤 1：创建 Actor 接口

Actor 接口定义了 Actor 实现与调用 Actor 的客户端共同遵守的 Actor 契约。

Actor 接口需满足以下要求：

- Actor 接口必须继承 `Dapr.Actors.IActor` 接口
- Actor 方法的返回类型必须是 `Task` 或 `Task<object>`
- Actor 方法最多只能有一个参数

### 创建接口项目并添加依赖项

```bash
# 创建 Actor 接口项目
dotnet new classlib -o MyActor.Interfaces

cd MyActor.Interfaces

# 添加 Dapr.Actors NuGet 包。请使用 nuget.org 上的最新包版本
dotnet add package Dapr.Actors

cd ..
```

### 实现 IMyActor 接口

定义 `IMyActor` 接口和 `MyData` 数据对象。将以下代码粘贴到 `MyActor.Interfaces` 项目的 `MyActor.cs` 中。

```csharp
using Dapr.Actors;
using Dapr.Actors.Runtime;
using System.Threading.Tasks;

namespace MyActor.Interfaces
{
    public interface IMyActor : IActor
    {       
        Task<string> SetDataAsync(MyData data);
        Task<MyData> GetDataAsync();
        Task RegisterReminder();
        Task UnregisterReminder();
        Task<IActorReminder> GetReminder();
        Task RegisterTimer();
        Task UnregisterTimer();
    }

    public class MyData
    {
        public string PropertyA { get; set; }
        public string PropertyB { get; set; }

        public override string ToString()
        {
            var propAValue = this.PropertyA == null ? "null" : this.PropertyA;
            var propBValue = this.PropertyB == null ? "null" : this.PropertyB;
            return $"PropertyA: {propAValue}, PropertyB: {propBValue}";
        }
    }
}
```

## 步骤 2：创建 Actor 服务

Dapr 使用 ASP.NET Web 服务来承载 Actor 服务。本节将实现 `IMyActor` Actor 接口，并将 Actor 注册到 Dapr runtime。

### 创建 Actor 服务项目并添加依赖项

```bash
# 创建用于承载 Dapr Actor 的 ASP.NET Web 服务
dotnet new web -o MyActorService

cd MyActorService

# 添加 Dapr.Actors.AspNetCore NuGet 包。请使用 nuget.org 上的最新包版本
dotnet add package Dapr.Actors.AspNetCore

# 添加 Actor 接口引用
dotnet add reference ../MyActor.Interfaces/MyActor.Interfaces.csproj

cd ..
```

### 添加 Actor 实现

实现 IMyActor 接口并派生自 `Dapr.Actors.Actor` 类。以下示例还展示了如何使用 Actor reminder。要让 Actor 使用 reminder，它必须派生自 IRemindable。如果你不打算使用 reminder 功能，可以跳过实现 IRemindable 以及下方代码中展示的 reminder 相关方法。

将以下代码粘贴到 `MyActorService` 项目的 `MyActor.cs` 中：

```csharp
using Dapr.Actors;
using Dapr.Actors.Runtime;
using MyActor.Interfaces;
using System;
using System.Threading.Tasks;

namespace MyActorService
{
    internal class MyActor : Actor, IMyActor, IRemindable
    {
        // 构造函数必须接受 ActorHost 作为参数，并且可以接受其他从依赖注入容器中获取的参数
        //
        /// <summary>
        /// 初始化 MyActor 的新实例
        /// </summary>
        /// <param name="host">将承载此 Actor 实例的 Dapr.Actors.Runtime.ActorHost。</param>
        public MyActor(ActorHost host)
            : base(host)
        {
        }

        /// <summary>
        /// 每当 Actor 被激活时调用此方法。
        /// Actor 在其任一方法首次被调用时激活。
        /// </summary>
        protected override Task OnActivateAsync()
        {
            // 提供执行一些可选初始化操作的机会。
            Console.WriteLine($"Activating actor id: {this.Id}");
            return Task.CompletedTask;
        }

        /// <summary>
        /// 每当 Actor 在一段时间不活动后被停用时调用此方法。
        /// </summary>
        protected override Task OnDeactivateAsync()
        {
            // 提供执行可选清理操作的机会。
            Console.WriteLine($"Deactivating actor id: {this.Id}");
            return Task.CompletedTask;
        }

        /// <summary>
        /// 将 MyData 写入 Actor 的私有 state store
        /// </summary>
        /// <param name="data">用户定义的 MyData，将以 "my_data" 状态写入 state store</param>
        public async Task<string> SetDataAsync(MyData data)
        {
            // 每次方法执行后，Actor runtime 会隐式地将数据保存到已配置的 state store 中。
            // 也可以通过调用 this.StateManager.SaveStateAsync() 显式保存数据。
            // 要保存的状态必须可以通过 DataContract 序列化。
            await this.StateManager.SetStateAsync<MyData>(
                "my_data",  // 状态名称
                data);      // 为名为 "my_data" 的状态保存的数据

            return "Success";
        }

        /// <summary>
        /// 从 Actor 的私有 state store 中获取 MyData
        /// </summary>
        /// <return>用户定义的 MyData，以 "my_data" 状态存储在 state store 中</return>
        public Task<MyData> GetDataAsync()
        {
            // 从 state store 中获取状态。
            return this.StateManager.GetStateAsync<MyData>("my_data");
        }

        /// <summary>
        /// 为 Actor 注册 MyReminder reminder
        /// </summary>
        public async Task RegisterReminder()
        {
            await this.RegisterReminderAsync(
                "MyReminder",              // reminder 的名称
                null,                      // 传递给 IRemindable.ReceiveReminderAsync() 的用户状态
                TimeSpan.FromSeconds(5),   // 首次调用 reminder 前的延迟时间
                TimeSpan.FromSeconds(5));  // 首次调用之后，reminder 调用之间的时间间隔
        }

        /// <summary>
        /// 获取 Actor 上 MyReminder reminder 的详细信息
        /// </summary>
        public async Task<IActorReminder> GetReminder()
        {
            await this.GetReminderAsync("MyReminder");
        }

        /// <summary>
        /// 为 Actor 取消注册 MyReminder reminder
        /// </summary>
        public Task UnregisterReminder()
        {
            Console.WriteLine("Unregistering MyReminder...");
            return this.UnregisterReminderAsync("MyReminder");
        }

        // <summary>
        // 实现 IRemindable.ReceiveReminderAsync()，该回调在 Actor reminder 被触发时调用。
        // </summary>
        public Task ReceiveReminderAsync(string reminderName, byte[] state, TimeSpan dueTime, TimeSpan period)
        {
            Console.WriteLine("ReceiveReminderAsync is called!");
            return Task.CompletedTask;
        }

        /// <summary>
        /// 为 Actor 注册 MyTimer timer
        /// </summary>
        public Task RegisterTimer()
        {
            return this.RegisterTimerAsync(
                "MyTimer",                  // timer 的名称
                nameof(this.OnTimerCallBack),       // timer 回调
                null,                       // 传递给 OnTimerCallback() 的用户状态
                TimeSpan.FromSeconds(5),    // 首次调用异步回调前的延迟时间
                TimeSpan.FromSeconds(5));   // 异步回调调用之间的时间间隔
        }

        /// <summary>
        /// 为 Actor 取消注册 MyTimer timer
        /// </summary>
        public Task UnregisterTimer()
        {
            Console.WriteLine("Unregistering MyTimer...");
            return this.UnregisterTimerAsync("MyTimer");
        }

        /// <summary>
        /// timer 到期后的回调
        /// </summary>
        private Task OnTimerCallBack(byte[] data)
        {
            Console.WriteLine("OnTimerCallBack is called!");
            return Task.CompletedTask;
        }
    }
}
```

### 在 ASP.NET Core 启动时注册 Actor runtime

Actor runtime 通过 ASP.NET Core 的 `Startup.cs` 进行配置。 

运行时使用 ASP.NET Core 依赖注入系统来注册 Actor 类型和基本服务。该集成通过在 `ConfigureServices(...)` 中调用 `AddActors(...)` 方法提供。使用传递给 `AddActors(...)` 的委托来注册 Actor 类型并配置 Actor runtime 设置。你可以在 `ConfigureServices(...)` 内注册其他用于依赖注入的类型，这些类型之后即可注入到 Actor 类型的构造函数中。

Actor 通过与 Dapr runtime 之间的 HTTP 调用来实现。此功能是应用程序 HTTP 处理流水线的一部分，并在 `Configure(...)` 内的 `UseEndpoints(...)` 中注册。

将以下代码粘贴到 `MyActorService` 项目的 `Startup.cs` 中：

```csharp
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace MyActorService
{
    public class Startup
    {
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddActors(options =>
            {
                // 注册 Actor 类型并配置 Actor 设置
                options.Actors.RegisterActor<MyActor>();
            });
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseRouting();

            // 注册与 Dapr runtime 交互的 Actor 处理程序。
            app.MapActorsHandlers();
        }
    }
}
```

## 步骤 3：添加客户端

创建一个简单的控制台应用程序来调用 Actor 服务。Dapr SDK 提供了 Actor Proxy 客户端，用于调用 Actor Interface 中定义的 Actor 方法。

### 创建 Actor 客户端项目并添加依赖项

```bash
# 创建 Actor 客户端
dotnet new console -o MyActorClient

cd MyActorClient

# 添加 Dapr.Actors NuGet 包。请使用 nuget.org 上的最新包版本
dotnet add package Dapr.Actors

# 添加 Actor 接口引用
dotnet add reference ../MyActor.Interfaces/MyActor.Interfaces.csproj

cd ..
```

### 使用强类型客户端调用 Actor 方法

你可以使用 `ActorProxy.Create<IMyActor>(..)` 创建强类型客户端，并调用 Actor 上的方法。

将以下代码粘贴到 `MyActorClient` 项目的 `Program.cs` 中：

```csharp
using System;
using System.Threading.Tasks;
using Dapr.Actors;
using Dapr.Actors.Client;
using MyActor.Interfaces;

namespace MyActorClient
{
    class Program
    {
        static async Task MainAsync(string[] args)
        {
            Console.WriteLine("Startup up...");

            // 在 Actor 服务中注册的 Actor 类型
            var actorType = "MyActor";

            // ActorId 唯一标识一个 Actor 实例
            // 如果不存在与此 ID 匹配的 Actor，则会创建它
            var actorId = new ActorId("1");

            // 使用服务所实现的同一接口创建本地代理。
            //
            // 需要提供类型和 ID，以便定位该 Actor。
            var proxy = ActorProxy.Create<IMyActor>(actorId, actorType);

            // 现在可以使用 Actor 接口调用 Actor 的方法。
            Console.WriteLine($"Calling SetDataAsync on {actorType}:{actorId}...");
            var response = await proxy.SetDataAsync(new MyData()
            {
                PropertyA = "ValueA",
                PropertyB = "ValueB",
            });
            Console.WriteLine($"Got response: {response}");

            Console.WriteLine($"Calling GetDataAsync on {actorType}:{actorId}...");
            var savedData = await proxy.GetDataAsync();
            Console.WriteLine($"Got response: {savedData}");
        }
    }
}
```

## 运行代码

现在可以运行你创建的项目来测试示例。

1. 运行 MyActorService

    由于 `MyActorService` 承载着 Actor，它需要使用 Dapr CLI 运行。

    ```bash
    cd MyActorService
    dapr run --app-id myapp --app-port 5000 --dapr-http-port 3500 -- dotnet run
    ```

    你将在此终端中看到来自 `daprd` 和 `MyActorService` 的命令行输出。你应该会看到类似以下的内容，这表明应用程序已成功启动。

    ```txt
    ...
    ℹ️  Updating metadata for app command: dotnet run
    ✅  You're up and running! Both Dapr and your app logs will appear here.

    == APP == info: Microsoft.Hosting.Lifetime[0]

    == APP ==       Now listening on: https://localhost:5001

    == APP == info: Microsoft.Hosting.Lifetime[0]

    == APP ==       Now listening on: http://localhost:5000

    == APP == info: Microsoft.Hosting.Lifetime[0]

    == APP ==       Application started. Press Ctrl+C to shut down.

    == APP == info: Microsoft.Hosting.Lifetime[0]

    == APP ==       Hosting environment: Development

    == APP == info: Microsoft.Hosting.Lifetime[0]

    == APP ==       Content root path: /Users/ryan/actortest/MyActorService
    ```

2. 运行 MyActorClient

    `MyActorClient` 充当客户端，可以使用 `dotnet run` 正常运行。

    打开一个新终端并进入 `MyActorClient` 目录。然后使用以下命令运行项目：

    ```bash
    dotnet run
    ```

    你应该会看到类似以下的命令行输出：

    ```txt
    Startup up...
    Calling SetDataAsync on MyActor:1...
    Got response: Success
    Calling GetDataAsync on MyActor:1...
    Got response: PropertyA: ValueA, PropertyB: ValueB
    ```

> 💡 此示例依赖于一些假设。ASP.NET Core Web 项目的默认监听端口为 5000，该端口通过 `--app-port 5000` 传递给 `dapr run`。Dapr sidecar 的默认 HTTP 端口为 3500。我们让 `MyActorService` 的 sidecar 使用 3500，以便 `MyActorClient` 可以依赖默认值。

现在你已成功创建 Actor 服务和客户端。请参阅相关链接部分以了解更多信息。

## 相关链接

- [.NET Dapr Actors 客户端指南]({{% ref dotnet-actors-client.md %}})
- [.NET Dapr Actors 使用指南]({{% ref dotnet-actors-usage.md %}})
