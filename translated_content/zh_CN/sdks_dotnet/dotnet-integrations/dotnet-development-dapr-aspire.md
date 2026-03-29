---
type: docs
title: "使用 .NET Aspire 进行 Dapr .NET SDK 开发"
linkTitle: ".NET Aspire"
weight: 90300
description: 了解使用 .NET Aspire 进行本地开发
---

# .NET Aspire

[.NET Aspire](https://learn.microsoft.com/dotnet/aspire/get-started/aspire-overview) 是一种开发工具，
旨在通过提供一个框架，使第三方服务能够与您自己的软件一起轻松集成、观察和配置，从而更轻松地将外部软件包含到 .NET 应用程序中。

Aspire 通过与流行的 IDE 提供丰富的集成来简化本地开发，包括
[Microsoft Visual Studio](https://visualstudio.microsoft.com/vs/)、
[Visual Studio Code](https://code.visualstudio.com/)、
[JetBrains Rider](https://blog.jetbrains.com/dotnet/2024/02/19/jetbrains-rider-and-the-net-aspire-plugin/) 等，
以便在启动调试器启动应用程序的同时，自动启动和配置对其他集成的访问，包括 Dapr。

虽然 Aspire 还协助将应用程序部署到各种云主机（如 Microsoft Azure 和 Amazon AWS），但部署目前超出了本指南的范围。更多信息可以在 Aspire 的文档[这里](https://learn.microsoft.com/dotnet/aspire/deployment/overview)找到。

可以在[这里](https://github.com/dapr/dotnet-sdk/tree/master/examples/Hosting/Aspire/ServiceInvocationDemo)找到一个端到端演示，其中包含以下内容并演示了多个启用 Dapr 的服务之间的服务调用。

## 前提条件
- Dapr .NET SDK 支持 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、
  [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0) 和
  [.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0)。使用支持您选择的运行时的 .NET Aspire 版本。
- 符合 OCI 标准的容器运行时，例如 [Docker Desktop](https://www.docker.com/products/docker-desktop) 或 [Podman](https://podman.io/)
- 安装并初始化 Dapr v1.16 或更高版本

## 通过 CLI 使用 .NET Aspire

我们将首先创建一个全新的 .NET 应用程序。打开您喜欢的 CLI 并导航到您希望在其中创建新 .NET 解决方案的目录。首先使用以下命令安装一个模板，该模板将创建一个空的 Aspire 应用程序：

```sh
dotnet new install Aspire.ProjectTemplates
```

安装完成后，继续在当前目录中创建一个空的 .NET Aspire 应用程序。`-n` 参数允许您指定输出解决方案的名称。如果排除该参数，.NET CLI 将改为使用输出目录的名称，例如 `C:\source\aspiredemo` 将导致解决方案被命名为 `aspiredemo`。本教程的其余部分将假设解决方案名为 `aspiredemo`。

```sh
dotnet new aspire -n aspiredemo
```

这将在您的目录中创建两个 Aspire 特定的目录和一个文件：
- `aspiredemo.AppHost/` 包含 Aspire 编排项目，用于配置应用程序中使用的每个集成。
- `aspiredemo.ServiceDefaults/` 包含一系列旨在您的解决方案中共享的扩展，以帮助 Aspire 提供的弹性、服务发现和遥测功能（这些与 Dapr 本身提供的功能不同）。
- `aspiredemo.sln` 是维护当前解决方案布局的文件

接下来，我们将创建两个项目，作为我们的 Dapr 应用程序并演示 Dapr 功能。在同一目录中，使用以下命令创建一个名为 `FrontEndApp` 的空 ASP.NET Core 项目和另一个名为 'BackEndApp' 的项目。任何一个都将在当前目录下的 `FrontEndApp\FrontEndApp.csproj` 和 `BackEndApp\BackEndApp.csproj` 中创建。

```sh
dotnet new web --name FrontEndApp
```

接下来，我们将配置 AppHost 项目以添加必要的包以支持本地 Dapr 开发。使用以下命令导航到 AppHost 目录，并将 `CommunityToolkit.Aspire.Hosting.Dapr` 包从 NuGet 安装到项目中。

我们还将添加对 `FrontEndApp` 项目的引用，以便我们可以在注册过程中引用它。

{{% alert color="primary" %}}

此包以前称为 `Aspire.Hosting.Dapr`，已被[标记为已弃用](https://www.nuget.org/packages/Aspire.Hosting.Dapr)。

{{% /alert %}}

```sh
cd aspiredemo.AppHost
dotnet add package CommunityToolkit.Aspire.Hosting.Dapr
dotnet add reference ../FrontEndApp/
dotnet add reference ../BackEndApp/
```

接下来，我们需要将 Dapr 配置为与您的项目一起加载的资源。在您喜欢的 IDE 中打开该项目中的 `Program.cs` 文件。它应该类似于以下内容：

```csharp
var builder = DistributedApplication.CreateBuilder(args);

builder.Build().Run();
```

如果您熟悉 ASP.NET Core 项目或其他使用 `Microsoft.Extensions.DependencyInjection` 功能的项目中使用的依赖注入方法，您会发现这是一个熟悉的体验。

由于我们已经添加了对 `MyApp` 的项目引用，因此我们需要在此配置中首先添加一个引用。在 `builder.Build().Run()` 行之前添加以下内容：

```csharp
var backEndApp = builder
    .AddProject<Projects.BackEndApp>("be")
    .WithDaprSidecar();

var frontEndApp = builder
    .AddProject<Projects.FrontEndApp>("fe")
    .WithDaprSidecar();
```

由于项目引用已添加到此解决方案，您的项目在此处作为 `Projects.` 命名空间中的类型显示。在此教程中，为项目分配的变量名称并不重要，但如果您想使用 Aspire 的服务发现功能在此项目与另一个项目之间创建引用，则将使用该名称。

添加 `.WithDaprSidecar()` 将 Dapr 配置为 .NET Aspire 资源，以便当项目运行时，边车将与您的应用程序一起部署。这接受许多不同的选项，并且可以按照以下示例进行配置：

```csharp
DaprSidecarOptions sidecarOptions = new()
{
    AppId = "how-dapr-identifies-your-app",
    AppPort = 8080, //请注意，如果您打算从 Aspire v9.0 开始配置发布订阅、actor 或工作流，则需要此参数
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

如上例所示，从 .NET Aspire 9.0 开始，如果您打算使用 Dapr 需要调用您的应用程序的任何功能，例如发布订阅、actor 或工作流，您需要将 AppPort 指定为配置选项，因为 Aspire 不会在运行时自动将其传递给 Dapr。预计这种行为将在未来版本中发生变化，因为修复已合并，可以在[这里](https://github.com/dotnet/aspire/pull/6362)进行跟踪。

{{% /alert %}}

最后，让我们向后端应用添加一个端点，我们可以使用 Dapr 的服务调用调用它以显示到页面以演示 Dapr 正在按预期工作。

当您在 IDE 中打开解决方案时，请确保 `aspiredemo.AppHost` 配置为您的启动项目，但是当您以调试配置启动它时，您会注意到您的集成控制台应该反映您预期的 Dapr 日志，并且它将对您的应用程序可用。
