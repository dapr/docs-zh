---
type: docs
title: "如何：在 .NET SDK 中运行和使用虚拟 Actor"
linkTitle: "如何：运行和使用虚拟 Actor"
weight: 300000
description: 通过此示例试用 .NET Dapr 虚拟 Actor
---

Dapr Actor 包允许你从 .NET 应用程序与 Dapr 虚拟 Actor 交互。在本指南中，你将学习如何：

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

该项目包含 actor 的接口定义。Actor 接口可以在任何名称的项目中定义。接口定义了由以下各方共享的 actor 契约：

- actor 实现
- 调用 actor 的客户端

由于客户端项目可能依赖它，最好在独立于 actor 实现的程序集中定义它。

**Actor 服务项目 (\MyActor\MyActorService)** 

该项目实现承载 actor 的 ASP.Net Core Web 服务。它包含 actor 的实现 `MyActor.cs`。Actor 实现是一个类，它：

- 派生自基类型 Actor
- 实现 `MyActor.Interfaces` 项目中定义的接口。

Actor 类还必须实现一个构造函数，该构造函数接受一个 `ActorService` 实例和一个 `ActorId`，并将它们传递给基 Actor 类。

**Actor 客户端项目 (\MyActor\MyActorClient)** 

该项目包含 actor 客户端的实现，该客户端调用 MyActor 的在 Actor Interfaces 中定义的方法。

## 前置条件
- 已安装 [Dapr CLI]({{< ref install-dapr-cli.md >}})。
- 已初始化 [Dapr 环境]({{< ref install-dapr-selfhost.md >}})。
- 已安装 [.NET 8](https://dotnet.microsoft.com/download)、[.NET 9](https://dotnet.microsoft.com/download) 或
  [.NET 10](https://dotnet.microsoft.com/download)

## 步骤 0：准备

由于我们将创建 3 个项目，请选择一个空目录作为起点，并在你选择的终端中打开它。

## 步骤 1：创建 actor 接口

Actor 接口定义了由 actor 实现和调用 actor 的客户端共享的 actor 契约。

Actor 接口定义需满足以下要求：

- Actor 接口必须继承 `Dapr.Actors.IActor` 接口
- Actor 方法的返回类型必须是 `Task` 或 `Task<object>`
- Actor 方法最多只能有一个参数

### 创建接口项目并添加依赖项

```bash
# Create Actor Interfaces
dotnet new classlib -o MyActor.Interfaces

cd MyActor.Interfaces

# Add Dapr.Actors nuget package. Please use the latest package version from nuget.org
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

## 步骤 2：创建 actor 服务

Dapr 使用 ASP.NET Web 服务来承载 Actor 服务。本节将实现 `IMyActor` actor 接口并将 Actor 注册到 Dapr Runtime。

### 创建 actor 服务项目并添加依赖项

```bash
# Create ASP.Net Web service to host Dapr actor
dotnet new web -o MyActorService

cd MyActorService

# Add Dapr.Actors.AspNetCore nuget package. Please use the latest package version from nuget.org
dotnet add package Dapr.Actors.AspNetCore

# Add Actor Interface reference
dotnet add reference ../MyActor.Interfaces/MyActor.Interfaces.csproj

cd ..
```

### 添加 actor 实现

实现 IMyActor 接口并派生自 `Dapr.Actors.Actor` 类。以下示例还展示了如何使用 Actor Reminders。要使 Actors 使用 Reminders，它必须派生自 IRemindable。如果你不打算使用 Reminder 功能，可以跳过实现 IRemindable 和下面代码中显示的 reminder 特定方法。

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
        // The constructor must accept ActorHost as a parameter, and can also accept additional
        // parameters that will be retrieved from the dependency injection container
        //
        /// <summary>
        /// Initializes a new instance of MyActor
        /// </summary>
        /// <param name="host">The Dapr.Actors.Runtime.ActorHost that will host this actor instance.</param>
        public MyActor(ActorHost host)
            : base(host)
        {
        }

        /// <summary>
        /// This method is called whenever an actor is activated.
        /// An actor is activated the first time any of its methods are invoked.
        /// </summary>
        protected override Task OnActivateAsync()
        {
            // Provides opportunity to perform some optional setup.
            Console.WriteLine($"Activating actor id: {this.Id}");
            return Task.CompletedTask;
        }

        /// <summary>
        /// This method is called whenever an actor is deactivated after a period of inactivity.
        /// </summary>
        protected override Task OnDeactivateAsync()
        {
            // Provides Opporunity to perform optional cleanup.
            Console.WriteLine($"Deactivating actor id: {this.Id}");
            return Task.CompletedTask;
        }

        /// <summary>
        /// Set MyData into actor's private state store
        /// </summary>
        /// <param name="data">the user-defined MyData which will be stored into state store as "my_data" state</param>
        public async Task<string> SetDataAsync(MyData data)
        {
            // Data is saved to configured state store implicitly after each method execution by Actor's runtime.
            // Data can also be saved explicitly by calling this.StateManager.SaveStateAsync();
            // State to be saved must be DataContract serializable.
            await this.StateManager.SetStateAsync<MyData>(
                "my_data",  // state name
                data);      // data saved for the named state "my_data"

            return "Success";
        }

        /// <summary>
        /// Get MyData from actor's private state store
        /// </summary>
        /// <return>the user-defined MyData which is stored into state store as "my_data" state</return>
        public Task<MyData> GetDataAsync()
        {
            // Gets state from the state store.
            return this.StateManager.GetStateAsync<MyData>("my_data");
        }

        /// <summary>
        /// Register MyReminder reminder with the actor
        /// </summary>
        public async Task RegisterReminder()
        {
            await this.RegisterReminderAsync(
                "MyReminder",              // The name of the reminder
                null,                      // User state passed to IRemindable.ReceiveReminderAsync()
                TimeSpan.FromSeconds(5),   // Time to delay before invoking the reminder for the first time
                TimeSpan.FromSeconds(5));  // Time interval between reminder invocations after the first invocation
        }

        /// <summary>
        /// Get MyReminder reminder details with the actor
        /// </summary>
        public async Task<IActorReminder> GetReminder()
        {
            await this.GetReminderAsync("MyReminder");
        }

        /// <summary>
        /// Unregister MyReminder reminder with the actor
        /// </summary>
        public Task UnregisterReminder()
        {
            Console.WriteLine("Unregistering MyReminder...");
            return this.UnregisterReminderAsync("MyReminder");
        }

        // <summary>
        // Implement IRemindeable.ReceiveReminderAsync() which is call back invoked when an actor reminder is triggered.
        // </summary>
        public Task ReceiveReminderAsync(string reminderName, byte[] state, TimeSpan dueTime, TimeSpan period)
        {
            Console.WriteLine("ReceiveReminderAsync is called!");
            return Task.CompletedTask;
        }

        /// <summary>
        /// Register MyTimer timer with the actor
        /// </summary>
        public Task RegisterTimer()
        {
            return this.RegisterTimerAsync(
                "MyTimer",                  // The name of the timer
                nameof(this.OnTimerCallBack),       // Timer callback
                null,                       // User state passed to OnTimerCallback()
                TimeSpan.FromSeconds(5),    // Time to delay before the async callback is first invoked
                TimeSpan.FromSeconds(5));   // Time interval between invocations of the async callback
        }

        /// <summary>
        /// Unregister MyTimer timer with the actor
        /// </summary>
        public Task UnregisterTimer()
        {
            Console.WriteLine("Unregistering MyTimer...");
            return this.UnregisterTimerAsync("MyTimer");
        }

        /// <summary>
        /// Timer callback once timer is expired
        /// </summary>
        private Task OnTimerCallBack(byte[] data)
        {
            Console.WriteLine("OnTimerCallBack is called!");
            return Task.CompletedTask;
        }
    }
}
```

### 在 ASP.NET Core 启动时注册 actor 运行时

Actor 运行时通过 ASP.NET Core `Startup.cs` 进行配置。

运行时使用 ASP.NET Core 依赖注入系统来注册 actor 类型和基本服务。此集成通过 `ConfigureServices(...)` 中的 `AddActors(...)` 方法调用提供。使用传递给 `AddActors(...)` 的委托来注册 actor 类型并配置 actor 运行时设置。你可以在 `ConfigureServices(...)` 内部注册其他类型以进行依赖注入。这些类型将可用于注入到 Actor 类型的构造函数中。

Actors 通过与 Dapr 运行时的 HTTP 调用来实现。此功能是应用程序 HTTP 处理管道的一部分，并在 `Configure(...)` 内部的 `UseEndpoints(...)` 中注册。

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
                // Register actor types and configure actor settings
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

            // Register actors handlers that interface with the Dapr runtime.
            app.MapActorsHandlers();
        }
    }
}
```

## 步骤 3：添加客户端

创建一个简单的控制台应用程序来调用 actor 服务。Dapr SDK 提供 Actor Proxy 客户端来调用 Actor Interface 中定义的 actor 方法。

### 创建 actor 客户端项目并添加依赖项

```bash
# Create Actor's Client
dotnet new console -o MyActorClient

cd MyActorClient

# Add Dapr.Actors nuget package. Please use the latest package version from nuget.org
dotnet add package Dapr.Actors

# Add Actor Interface reference
dotnet add reference ../MyActor.Interfaces/MyActor.Interfaces.csproj

cd ..
```

### 使用强类型客户端调用 actor 方法

你可以使用 `ActorProxy.Create<IMyActor>(..)` 创建强类型客户端并调用 actor 上的方法。

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

            // Registered Actor Type in Actor Service
            var actorType = "MyActor";

            // An ActorId uniquely identifies an actor instance
            // If the actor matching this id does not exist, it will be created
            var actorId = new ActorId("1");

            // Create the local proxy by using the same interface that the service implements.
            //
            // You need to provide the type and id so the actor can be located. 
            var proxy = ActorProxy.Create<IMyActor>(actorId, actorType);

            // Now you can use the actor interface to call the actor's methods.
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

你现在可以测试你创建的项目。

1. 运行 MyActorService

    由于 `MyActorService` 承载着 actors，它需要使用 Dapr CLI 运行。

    ```bash
    cd MyActorService
    dapr run --app-id myapp --app-port 5000 --dapr-http-port 3500 -- dotnet run
    ```

    你将在此终端中看到来自 `daprd` 和 `MyActorService` 的命令行输出。你应该会看到类似以下内容，这表明应用程序已成功启动。

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

    打开一个新终端并导航到 `MyActorClient` 目录。然后使用以下命令运行项目：

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

> 💡 此示例依赖于一些假设。ASP.NET Core Web 项目的默认监听端口为 5000，该端口作为 `--app-port 5000` 传递给 `dapr run`。Dapr sidecar 的默认 HTTP 端口为 3500。我们告诉 `MyActorService` 的 sidecar 使用 3500，以便 `MyActorClient` 可以依赖默认值。

现在你已成功创建了 actor 服务和客户端。请参阅相关链接部分以了解更多信息。

## 相关链接

- [.NET Dapr Actors 客户端指南]({{% ref dotnet-actors-client.md %}})
- [.NET Dapr Actors 使用指南]({{% ref dotnet-actors-usage.md %}})
