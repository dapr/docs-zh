---
type: docs
title: "Dapr 可插拔组件 .NET SDK 入门"
linkTitle: ".NET"
weight: 1000
description: 如何开始使用 Dapr 可插拔组件 .NET SDK
no_list: true
is_preview: true
cascade:
  github_repo: https://github.com/dapr-sandbox/components-dotnet-sdk
  github_subdir: daprdocs/content/en/dotnet-sdk-docs
  path_base_for_github_subdir: content/en/developing-applications/develop-components/pluggable-components/pluggable-components-sdks/pluggable-components-dotnet/
  github_branch: main
---

Dapr 提供 NuGet 包来帮助开发 .NET 可插拔组件。

## 前提条件

- [.NET 6 SDK](https://dotnet.microsoft.com/download/dotnet) 或更高版本
- [Dapr 1.9 CLI]({{% ref install-dapr-cli.md %}}) 或更高版本
- 已初始化的 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- Linux、Mac 或 Windows（需使用 WSL）

{{% alert title="注意" color="primary" %}}
在 Windows 上开发 Dapr 可插拔组件需要使用 WSL，因为某些开发平台在"原生" Windows 上不完全支持 Unix Domain Sockets。
{{% /alert %}}

## 项目创建

创建可插拔组件首先需要一个空的 ASP.NET 项目。

```bash
dotnet new web --name <项目名称>
```

## 添加 NuGet 包

添加 Dapr .NET 可插拔组件 NuGet 包。

```bash
dotnet add package Dapr.PluggableComponents.AspNetCore
```

## 创建应用和服务

创建 Dapr 可插拔组件应用类似于创建 ASP.NET 应用。在 `Program.cs` 中，将 `WebApplication` 相关代码替换为 Dapr 的 `DaprPluggableComponentsApplication` 等效代码。

```csharp
using Dapr.PluggableComponents;

var app = DaprPluggableComponentsApplication.Create();

app.RegisterService(
    "<套接字名称>",
    serviceBuilder =>
    {
        // 使用此服务注册一个或多个组件。
    });

app.Run();
```

这将创建一个包含单个服务的应用。每个服务：

- 对应一个 Unix Domain Socket
- 可以承载一种或多种组件类型

{{% alert title="注意" color="primary" %}}
单个服务只能注册每种类型的一个组件。但是，[相同类型的多个组件可以分散到多个服务中]({{% ref dotnet-multiple-services %}})。
{{% /alert %}}

## 实现和注册组件

 - [实现输入/输出绑定组件]({{% ref dotnet-bindings %}})
 - [实现发布订阅组件]({{% ref dotnet-pub-sub %}})
 - [实现状态存储组件]({{% ref dotnet-state-store %}})

## 本地测试组件

可以通过在命令行启动应用并配置 Dapr 边车来使用它，从而测试可插拔组件。

要启动组件，在应用目录中：

```bash
dotnet run
```

要配置 Dapr 使用该组件，在资源路径目录中：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <组件名称>
spec:
  type: state.<套接字名称>
  version: v1
  metadata:
  - name: key1
    value: value1
  - name: key2
    value: value2
```

当组件实例化时，任何 `metadata` 属性将通过组件的 `IPluggableComponent.InitAsync()` 方法传递给组件。

要启动 Dapr（以及可选的、使用该服务的服务）：

```bash
dapr run --app-id <应用 ID> --resources-path <资源路径> ...
```

此时，Dapr 边车将启动并通过 Unix Domain Socket 连接到组件。然后你可以通过以下方式与组件交互：
- 通过使用该组件的服务（如果已启动），或
- 直接使用 Dapr HTTP 或 gRPC API

## 创建容器

有几种方法可以为你的组件创建容器以进行最终部署。

### 使用 .NET SDK

[.NET 7 及更高版本的 SDK](https://dotnet.microsoft.com/download/dotnet) 使你能够为你的应用创建基于 .NET 的容器，而*无需* `Dockerfile`，即使对于那些针对早期版本的 .NET SDK 的应用也是如此。这可能是当今为你的组件生成容器的最简单方法。

{{% alert title="注意" color="primary" %}}
目前，.NET 7 SDK 需要在本地机器上安装 Docker Desktop、一个特殊的 NuGet 包以及在本地机器上安装 Docker Desktop 来构建容器。.NET SDK 的未来版本计划消除这些要求。

可以在本地机器上同时安装多个版本的 .NET SDK。
{{% /alert %}}

将 `Microsoft.NET.Build.Containers` NuGet 包添加到组件项目。

```bash
dotnet add package Microsoft.NET.Build.Containers
```

将应用发布为容器：

```bash
dotnet publish --os linux --arch x64 /t:PublishContainer -c Release
```

{{% alert title="注意" color="primary" %}}
确保架构参数 `--arch x64` 与组件的最终部署目标相匹配。默认情况下，生成的容器的架构与本地机器的架构相匹配。例如，如果本地机器是基于 ARM64 的（例如 M1 或 M2 Mac）并且省略了该参数，将生成 ARM64 容器，这可能与期望 AMD64 容器的部署目标不兼容。
{{% /alert %}}

有关更多配置选项，例如控制容器名称、标签和基础镜像，请参阅 [.NET 发布为容器指南](https://learn.microsoft.com/dotnet/core/docker/publish-as-container)。

### 使用 Dockerfile

虽然有工具可以为 .NET 应用生成 `Dockerfile`，但 .NET SDK 本身不提供。典型的 `Dockerfile` 可能如下所示：

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:<运行时> AS base
WORKDIR /app

# Creates a non-root user with an explicit UID and adds permission to access the /app folder
# For more info, please refer to https://aka.ms/vscode-docker-dotnet-configure-containers
RUN adduser -u 5678 --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

FROM mcr.microsoft.com/dotnet/sdk:<运行时> AS build
WORKDIR /src
COPY ["<应用>.csproj", "<应用文件夹>/"]
RUN dotnet restore "<应用文件夹>/<应用>.csproj"
COPY . .
WORKDIR "/src/<应用文件夹>"
RUN dotnet build "<应用>.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "<应用>.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "<应用>.dll"]
```

构建镜像：

```bash
docker build -f Dockerfile -t <镜像名称>:<标签> .
```

{{% alert title="注意" color="primary" %}}
`Dockerfile` 中 `COPY` 操作的路径相对于构建镜像时传递的 Docker 上下文，而 Docker 上下文本身将根据正在构建的项目的需求而变化（例如，如果它有引用的项目）。在上面的示例中，假设 Docker 上下文是组件项目目录。
{{% /alert %}}

## 演示

观看此视频了解[使用 .NET 构建可插拔组件的演示](https://youtu.be/s1p9MNl4VGo?t=1606)：

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/s1p9MNl4VGo?start=1606" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

## 后续步骤

- [了解可插拔组件 .NET SDK 的高级步骤]({{% ref "dotnet-advanced" %}})
- 了解有关使用可插拔组件 .NET SDK 的更多信息：
  - [绑定]({{% ref "dotnet-bindings" %}})
  - [发布订阅]({{% ref "dotnet-pub-sub" %}})
  - [状态存储]({{% ref "dotnet-state-store" %}})
