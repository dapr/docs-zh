---
type: docs
title: "Dapr .NET SDK"
linkTitle: ".NET"
weight: 1000
description: 用于开发 Dapr 应用程序的 .NET SDK 包
no_list: true
cascade:
  github_repo: https://github.com/dapr/dotnet-sdk
  github_subdir: daprdocs/content/en/dotnet-sdk-docs
  path_base_for_github_subdir: content/en/developing-applications/sdks/dotnet/
  github_branch: master
---

Dapr 提供了多种包来帮助开发 .NET 应用程序。使用它们，你可以基于 Dapr 创建 .NET 客户端、服务器和虚拟 Actor。

## 前置条件
- 已安装 [Dapr CLI]({{< ref install-dapr-cli.md >}})
- 已初始化 [Dapr 环境]({{< ref install-dapr-selfhost.md >}})
- 已安装 [.NET 8](https://dotnet.microsoft.com/download)、[.NET 9](https://dotnet.microsoft.com/download)、
  [.NET 10](https://dotnet.microsoft.com/download) 或 [.NET 11](https://dotnet.microsoft.com/download)

{{% alert title=".NET 框架支持" color="warning" %}}
Dapr .NET SDK 支持 .NET 8、.NET 9、.NET 10 和 .NET 11。请注意，.NET 8 和 .NET 9 将于 2026 年 11 月结束支持。Dapr v1.20 将不再支持这两个版本；直到 2027 年底，仅 .NET 10 和 .NET 11 会继续获得支持。
{{% /alert %}}

## 安装

关于 SDK `1.19.0` 的包与 API 覆盖范围，请参阅 [.NET 构建块支持]({{< ref dotnet-building-blocks.md >}})。若要使用这些指南中的 1.19 功能，请使用该版本或更高的兼容版本。

要开始使用 Client .NET SDK，请安装 Dapr .NET SDK 包：

```sh
dotnet add package Dapr.Client
```

## 试用

动手试一试 Dapr .NET SDK。通过 .NET 快速入门和教程了解 Dapr 的实际应用：

| SDK 示例 | 描述 |
| ----------- | ----------- |
| [快速入门]({{% ref quickstarts %}}) | 使用 .NET SDK 在几分钟内体验 Dapr 的 API 构建块。 |
| [SDK 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples) | 克隆 SDK 仓库以尝试一些示例并开始使用。 |
| [发布订阅教程](https://github.com/dapr/quickstarts/tree/master/tutorials/pub-sub) | 了解 Dapr .NET SDK 如何与其他 Dapr SDK 协作以实现发布订阅应用程序。 |
| [Dapr.Messaging 教程]({{< ref "dotnet-messaging/tutorial/_index.md" >}}) | 演练现代 .NET 消息示例，包括发布、传递模式、路由和测试。 |

## 可用包

| 包名称 | 文档链接 | 描述 |
|---|---|---|
| [Dapr.Client](https://www.nuget.org/packages/Dapr.Client) | [文档]({{% ref dotnet-client %}}) | 创建与 Dapr 边车和其他 Dapr 应用程序交互的 .NET 客户端。 |
| [Dapr.AI](https://www.nuget.org/packages/Dapr.AI) | [文档]({{% ref dotnet-ai %}}) | 在 .NET 中创建和管理 AI 操作。 |
| [Dapr.AI.A2a](https://www.nuget.org/packages/Dapr.AI.A2a) | | 使用 [A2A](https://github.com/a2aproject/a2a-dotnet) 框架实现 agent-to-agent 操作的 Dapr SDK。 |
| [Dapr.AI.Microsoft.Extensions](https://www.nuget.org/packages/Dapr.AI.Microsoft.Extensions) | [文档]({{% ref dotnet-ai-extensions-howto %}}) | 通过 Dapr 对话构建块，以对话方式并借助工具轻松与大型语言模型 (LLM) 交互。 |
| [Dapr.AspNetCore](https://www.nuget.org/packages/Dapr.AspNetCore) | [文档]({{% ref dotnet-client %}}) | 使用 Dapr SDK 在 .NET 中编写服务器和服务。包括提供与 ASP.NET Core 更深度集成的支持和实用程序。 |
| [Dapr.Actors](https://www.nuget.org/packages/Dapr.Actors) | [文档]({{% ref dotnet-actors %}}) | 创建具有状态、提醒/定时器和方法的虚拟 Actor。 |
| [Dapr.Actors.AspNetCore](https://www.nuget.org/packages/Dapr.Actors.AspNetCore) | [文档]({{% ref dotnet-actors %}}) | 创建具有状态、提醒/定时器和方法的虚拟 Actor，并与 ASP.NET Core 深度集成。 |
| [Dapr.Actors.Analyzers](https://www.nuget.org/packages/Dapr.Actors.Analyzers) | [文档]({{% ref dotnet-guidance-source-generators %}}) | 一组 Roslyn 源生成器和分析器，用于在 .NET 中使用 Dapr Actors 时实现更好的实践并防止常见错误。 |
| [Dapr.Actors.Next](https://www.nuget.org/packages/Dapr.Actors.Next) | [文档]({{% ref dotnet-actors-next %}}) | 创建具有状态、定时器/提醒、状态机、集成发布订阅等功能的虚拟 Actor！ |
| [Dapr.Cryptography](https://www.nuget.org/packages/Dapr.Cryptography) | [文档]({{% ref dotnet-cryptography %}}) | 使用 Dapr 密码学构建块加密和解密任意大小的流式状态。 |
| [Dapr.Jobs](https://www.nuget.org/packages/Dapr.Jobs) | [文档]({{% ref dotnet-jobs %}}) | 创建和管理作业的调度与编排。 |
| [Dapr.Jobs.Analyzers](https://www.nuget.org/packages/Dapr.Jobs.Analyzers) | [文档]({{% ref dotnet-guidance-source-generators %}}) | 一组 Roslyn 源生成器和分析器，用于在 .NET 中使用 Dapr Jobs 时实现更好的实践并防止常见错误。 |
| [Dapr.DistributedLock](https://www.nuget.org/packages/Dapr.DistributedLock) | [文档]({{% ref dotnet-distributed-lock %}}) | 创建和管理分布式锁，以管理对独占资源的访问。 |
| [Dapr.BinaryStore](https://www.nuget.org/packages/Dapr.BinaryStore) | [文档]({{% ref dotnet-binarystore %}}) | 使用 Dapr 存储、检索、流式传输和删除二进制文件。 |
| [Dapr.Search](https://www.nuget.org/packages/Dapr.Search) | [文档]({{% ref dotnet-search %}}) | 管理索引和类型化文档，运行全文查询与原生查询，并生成类型化索引客户端。 |
| [Dapr.Vector](https://www.nuget.org/packages/Dapr.Vector) | [文档]({{% ref dotnet-vector %}}) | 存储嵌入向量和类型化负载，运行相似性查询与批量查询，并生成类型化集合客户端。 |
| [Dapr.Extensions.Configuration](https://www.nuget.org/packages/Dapr.Extensions.Configuration) | | 为 `Microsoft.Extensions.Configuration` 提供的 Dapr 机密存储配置提供程序实现。 |
| [Dapr.PluggableComponents](https://www.nuget.org/packages/Dapr.PluggableComponents) | | 用于使用 .NET 实现 Dapr 可插拔组件。 |
| [Dapr.PluggableComponents.AspNetCore](https://www.nuget.org/packages/Dapr.PluggableComponents.AspNetCore) | | 使用 .NET 实现 Dapr 可插拔组件，并提供丰富的 ASP.NET Core 支持。 |
| [Dapr.PluggableComponents.Protos](https://www.nuget.org/packages/Dapr.PluggableComponents.Protos) | | **注意：** 开发人员无需在其应用程序中直接安装此包。 |
| [Dapr.Messaging](https://www.nuget.org/packages/Dapr.Messaging) | [文档]({{% ref dotnet-messaging %}}) | 面向 .NET 的统一发布订阅消息 SDK：支持事件发布、流式拉取、编程式 gRPC 推送，以及基于无反射源生成器的 HTTP 订阅。 |
| [Dapr.Metadata](https://www.nuget.org/packages/Dapr.Metadata) | [文档]({{% ref dotnet-metadata %}}) | 在 .NET 中通过选项模式检索类型化的 Dapr 运行时元数据。 |
| [Dapr.StateManagement](https://www.nuget.org/packages/Dapr.StateManagement) | [文档]({{% ref dotnet-state-management %}}) | 在 Dapr 应用程序中创建和管理状态。 |
| [Dapr.SecretsManagement](https://www.nuget.org/packages/Dapr.SecretsManagement) | [文档]({{% ref dotnet-secrets %}}) | 在 Dapr 应用程序中检索机密。 |
| [Dapr.Testcontainers](https://www.nuget.org/packages/Dapr.Testcontainers) | [文档]({{% ref dotnet-guidance-testcontainers.md %}}) | 使用基于 Testcontainers 的测试工具运行 Dapr 集成测试。 |
| [Dapr.Workflow](https://www.nuget.org/packages/Dapr.Workflow) | [文档]({{% ref dotnet-workflow %}}) | 创建和管理可与其他 Dapr API 协同工作的工作流。 |

## 更多信息

了解有关本地开发选项、最佳实践的更多信息，或浏览 NuGet 包以添加到你现有的 .NET 应用程序中。

{{% cardpane %}}
{{% card title="**开发**"%}}
  [了解本地开发集成选项]({{% ref dotnet-integrations %}})
{{% /card %}}
{{% card title="**最佳实践**"%}}
  [了解开发 .NET Dapr 应用程序的最佳实践]({{% ref dotnet-guidance %}})
{{% /card %}}
{{% card title="**NuGet 包**"%}}
  [用于将 Dapr 添加到 .NET 应用程序的 NuGet 包](https://www.nuget.org/profiles/dapr.io)
{{% /card %}}
{{% /cardpane %}}
