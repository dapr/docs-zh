---
type: docs
title: "使用 Dapr .NET SDK 开发应用程序"
linkTitle: "部署集成"
weight: 300000
description: Dapr .NET SDK 的部署集成
---

## 同时考虑多个服务

使用你喜欢的 IDE 或编辑器启动应用程序时，通常假设你只需要运行一个东西：你正在调试的应用程序。然而，开发微服务时，你需要在本地开发流程中同时考虑*多个服务*。一个微服务应用包含多个可能需要同时运行的服务，以及需要管理的依赖项（如状态存储）。

在开发流程中加入 Dapr，意味着你需要管理以下关注点：

- 你想要运行的每个服务
- 每个服务对应的 Dapr 边车
- Dapr 组件和配置清单
- 额外的依赖项，如状态存储
- 可选：用于 Actor 的 Dapr 放置服务（Placement）

本文档假设你正在构建生产应用，并希望建立可重复且稳健的开发实践。此处的指导是通用的，适用于任何使用 Dapr 的 .NET 服务器应用（包括 Actor）。

## 管理组件

对于使用 Dapr 进行本地开发，你有两种主要方式来存储组件定义：

- 使用默认位置（`~/.dapr/components`）
- 使用你自己的位置

在源代码仓库中创建一个文件夹来存储组件和配置，你就可以对这些定义进行版本控制和共享。此处的指导假设你已在应用源代码旁边创建了一个用于存放这些文件的文件夹。

## 开发选项

选择以下某种方式，了解可用于本地开发场景的工具。建议你逐一熟悉它们，以了解 .NET SDK 提供的各种选项。

- [使用 Dapr CLI 开发]({{< ref dotnet-development-dapr-cli.md >}})：使用 `dapr run` 运行每个服务及其边车，是入门时最轻量的方式。
- [使用 .NET Aspire 开发]({{< ref dotnet-development-dapr-aspire.md >}})：使用 `CommunityToolkit.Aspire.Hosting.Dapr` 包和 `WithDaprSidecar()`，将 Dapr 边车集成到 Aspire AppHost 中。
- [使用 Docker Compose 开发]({{< ref dotnet-development-docker-compose.md >}})：使用 `docker-compose` 将服务、边车和依赖项一起编排。

## 下一步

- [使用 Dapr CLI 开发]({{< ref dotnet-development-dapr-cli.md >}})
- [使用 .NET Aspire 开发]({{< ref dotnet-development-dapr-aspire.md >}})
- [使用 Docker Compose 开发]({{< ref dotnet-development-docker-compose.md >}})
