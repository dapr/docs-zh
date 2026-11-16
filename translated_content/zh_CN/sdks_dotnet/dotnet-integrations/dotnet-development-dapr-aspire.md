---
type: docs
title: "使用 .NET Aspire 进行 Dapr .NET SDK 开发"
linkTitle: ".NET Aspire"
weight: 90300
description: 了解使用 .NET Aspire 进行本地开发
---

# .NET Aspire

[.NET Aspire](https://learn.microsoft.com/dotnet/aspire/get-started/aspire-overview) 是一种开发工具，
旨在通过提供一个框架，使第三方服务能够与你自己的软件一起轻松集成、观察和配置，从而更轻松地将外部软件包含到 .NET 应用程序中。

Aspire 通过与流行的 IDE 提供丰富的集成来简化本地开发，包括
[Microsoft Visual Studio](https://visualstudio.microsoft.com/vs/)、
[Visual Studio Code](https://code.visualstudio.com/)、
[JetBrains Rider](https://blog.jetbrains.com/dotnet/2024/02/19/jetbrains-rider-and-the-net-aspire-plugin/) 等，
以便在启动调试器启动应用程序的同时，自动启动和配置对其他集成的访问，包括 Dapr。

虽然 Aspire 也协助将应用程序部署到 Microsoft Azure 和 Amazon AWS 等各种云主机，但部署目前超出了本指南的范围。更多信息可以在 Aspire 的文档[这里](https://learn.microsoft.com/dotnet/aspire/deployment/overview)找到。

可以在[这里](https://github.com/dapr/dotnet-sdk/tree/master/examples/Hosting/Aspire/ServiceInvocationDemo)找到一个端到端演示，该演示包含下列内容，并演示了多个启用 Dapr 的服务之间的服务调用。

## 前提条件
- Dapr .NET SDK 支持 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、
  [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)、
  [.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0) 和
  [.NET 11](https://dotnet.microsoft.com/download/dotnet/11.0)。请使用支持你所选运行时的 .NET Aspire 版本。
- 符合 OCI 标准的容器运行时，例如 [Docker Desktop](https://www.docker.com/products/docker-desktop) 或
[Podman](https://podman.io/)
- 安装并初始化 Dapr v1.16 或更高版本

## 通过 CLI 使用 .NET Aspire

{{% alert title="注意" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年十一月结束支持。Dapr v1.20 将不再支持这两个版本；只有 .NET 10 和 .NET 11 会支持到 2027 年底。
{{% /alert %}}

我们首先创建一个全新的 .NET 应用程序。打开你常用的命令行工具，进入你希望创建新 .NET 解决方案的目录。首先使用以下命令安装模板，该模板将创建一个空的 Aspire 应用程序：

```sh
dotnet new install Aspire.ProjectTemplates
```

安装完成后，在当前目录中继续创建一个空的 .NET Aspire 应用程序。`-n` 参数用于指定输出解决方案的名称。如果省略该参数，.NET CLI 会改用输出目录的名称，例如 `C:\source\aspiredemo` 会生成名为 `aspiredemo` 的解决方案。本教程的其余部分将假定解决方案名为 `aspiredemo`。

```sh
dotnet new aspire -n aspiredemo
```

这将在你的目录中创建两个 Aspire 专用目录和一个文件：
- `aspiredemo.AppHost/` 包含 Aspire 编排项目，用于配置应用程序中使用的每个集成。
- `aspiredemo.ServiceDefaults/` 包含一系列旨在你的解决方案中共享的扩展，以帮助 Aspire 提供的弹性、服务发现和遥测功能（这些与 Dapr 本身提供的功能不同）。
- `aspiredemo.sln` 是维护当前解决方案布局的文件

接下来，我们将创建两个项目，作为 Dapr 应用程序并演示 Dapr 功能。在同一目录中，使用以下命令创建一个名为 `FrontEndApp` 的空 ASP.NET Core 项目，以及另一个名为 'BackEndApp' 的项目。二者将分别创建在当前目录下的 `FrontEndApp\FrontEndApp.csproj` 和 `BackEndApp\BackEndApp.csproj` 中。

```sh
dotnet new web --name FrontEndApp
```

接下来，我们将配置 AppHost 项目，添加支持本地 Dapr 开发所需的包。使用以下命令进入 AppHost 目录，并从 NuGet 将 `CommunityToolkit.Aspire.Hosting.Dapr` 包安装到该项目中。

我们还将添加对 `FrontEndApp` 项目的引用，以便在注册过程中引用它。

{{% alert color="primary" %}}

此包以前称为 `Aspire.Hosting.Dapr`，该包已被[标记为已弃用](https://www.nuget.org/packages/Aspire.Hosting.Dapr)。

{{% /alert %}}

```sh
cd aspiredemo.AppHost
dotnet add package CommunityToolkit.Aspire.Hosting.Dapr
dotnet add reference ../FrontEndApp/
dotnet add reference ../BackEndApp/
```

接下来，我们需要将 Dapr 配置为与你的项目一同加载的资源。在你常用的 IDE 中打开该项目中的 `Program.cs` 文件。它应类似于以下内容：

```csharp
var builder = DistributedApplication.CreateBuilder(args);

builder.Build().Run();
```

如果你熟悉 ASP.NET Core 项目或其他使用 `Microsoft.Extensions.DependencyInjection` 功能的项目中的依赖注入方式，你会发现这种体验很熟悉。

由于我们已经为 `MyApp` 添加了项目引用，因此在此配置中也需要先添加一个引用。请在 `builder.Build().Run()` 行之前添加以下内容：

```csharp
var backEndApp = builder
    .AddProject<Projects.BackEndApp>("be")
    .WithDaprSidecar();

var frontEndApp = builder
    .AddProject<Projects.FrontEndApp>("fe")
    .WithDaprSidecar();
```

由于此解决方案中已添加项目引用，在本教程的语境中，你的项目会以类型的形式出现在 `Projects.` 命名空间下。在本教程中，为项目分配的变量名并不十分重要；但如果你想借助 Aspire 的服务发现功能，在此项目与另一个项目之间建立引用，就会用到该变量名。

添加 `.WithDaprSidecar()` 会将 Dapr 配置为一个 .NET Aspire 资源，使项目运行时边车会与你的应用程序一同部署。该方法接受多种不同的选项，也可以按照以下示例进行可选配置：

```csharp
DaprSidecarOptions sidecarOptions = new()
{
    AppId = "how-dapr-identifies-your-app",
    AppPort = 8080, //请注意，自 Aspire v9.0 起，如果你打算配置发布订阅、Actor 或工作流，则需要此参数
    DaprGrpcPort = 50001,
    DaprHttpPort = 3500,
    MetricsPort = 9090
};

builder
    .AddProject<Projects.BackEndApp>("be")
    .WithReference(myApp)
    .WithDaprSidecar(sidecarOptions);
```

{{% alert color="primary" %}}

如上例所示，自 .NET Aspire 9.0 起，如果你打算使用 Dapr 需要调用你的应用程序的任何功能（例如发布订阅、Actor 或工作流），则需要将 AppPort 指定为已配置的选项，因为 Aspire 不会在运行时自动将其传递给 Dapr。预计此行为会在未来版本中改变，因为相关修复已被合并，可在[这里](https://github.com/dotnet/aspire/pull/6362)跟踪。

{{% /alert %}}

最后，让我们为后端应用添加一个端点，我们可以使用 Dapr 的服务调用来调用该端点，并将其显示在页面上，以演示 Dapr 正在按预期工作。

在 IDE 中打开解决方案时，请确保将 `aspiredemo.AppHost` 配置为启动项目；但当你以调试配置启动它时，你会注意到集成控制台应显示预期的 Dapr 日志，并且 Dapr 可供你的应用程序使用。
