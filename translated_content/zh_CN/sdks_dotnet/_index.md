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

Dapr 提供多种包来帮助开发 .NET 应用程序。使用这些包，你可以使用 Dapr 创建 .NET 客户端、服务器和虚拟 Actor。

## 先决条件

- [Dapr CLI]({{< ref install-dapr-cli.md >}}) 已安装
- 已初始化 [Dapr 环境]({{< ref install-dapr-selfhost.md >}})
- 已安装 [.NET 8](https://dotnet.microsoft.com/download)、[.NET 9](https://dotnet.microsoft.com/download) 或 [.NET 10](https://dotnet.microsoft.com/download)

{{% alert title="注意" color="primary" %}}
Dapr .NET SDK 支持 .NET 8、.NET 9 和 .NET 10。在 .NET 8 和 .NET 9 于 2026 年 11 月停止支持后的第一个 Dapr 版本发布前，它们仍会得到支持。此后，我们预计将转而支持 .NET 10 和 .NET 11。
{{% /alert %}}
## 安装

要开始使用 Client .NET SDK，请安装 Dapr .NET SDK 包：

```sh
dotnet add package Dapr.Client
```

## 体验一下

将 Dapr .NET SDK 付诸实践。浏览 .NET 快速入门和教程，了解 Dapr 的实际运行：

| SDK 示例 | 描述 |
| ----------- | ----------- |
| [快速入门]({{% ref quickstarts %}}) | 使用 .NET SDK 在几分钟内体验 Dapr 的 API 构建块。 |
| [SDK 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples) | 克隆 SDK 仓库，尝试一些示例并开始使用。 |
| [发布订阅教程](https://github.com/dapr/quickstarts/tree/master/tutorials/pub-sub) | 了解 Dapr .NET SDK 如何与其他 Dapr SDK 配合实现发布订阅应用程序。 |

## 可用包

| 包名称                                                                                              | 文档链接                                                    | 描述                                                                                                                                         |
|-----------------------------------------------------------------------------------------------------------|-------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| [Dapr.Client](https://www.nuget.org/packages/Dapr.Client)                                                 | [文档]({{% ref dotnet-client %}})                    | 创建与 Dapr 边车和其他 Dapr 应用程序交互的 .NET 客户端。                                                                  |
| [Dapr.AI](https://www.nuget.org/packages/Dapr.AI)                                                         | [文档]({{% ref dotnet-ai %}})                        | 在 .NET 中创建和管理 AI 操作。                                                                                                            |
| [Dapr.AI.A2a](https://www.nuget.org/packages/Dapr.AI.A2a)                                                 |                                                               | 使用 [A2A](https://github.com/a2aproject/a2a-dotnet) 框架实现 Agent 到 Agent 操作的 Dapr SDK。                            |
| [Dapr.AI.Microsoft.Extensions](https://www.nuget.org/packages/Dapr.AI.Microsoft.Extensions)               | [文档]({{% ref dotnet-ai-extensions-howto %}})       | 通过 Dapr Conversation 构建块轻松地以会话方式或使用工具与 LLM 交互。                                              |   
| [Dapr.AspNetCore](https://www.nuget.org/packages/Dapr.AspNetCore)                                         | [文档]({{% ref dotnet-client %}})                    | 使用 Dapr SDK 在 .NET 中编写服务器和服务。包括对 ASP.NET Core 的丰富集成支持。               |
| [Dapr.Actors](https://www.nuget.org/packages/Dapr.Actors)                                                 | [文档]({{% ref dotnet-actors %}})                    | 创建具有状态、提醒/计时器和方法的虚拟 Actor。                                                                                    |
| [Dapr.Actors.AspNetCore](https://www.nuget.org/packages/Dapr.Actors)                                      | [文档]({{% ref dotnet-actors %}})                    | 使用与 ASP.NET Core 的丰富集成创建具有状态、提醒/计时器和方法的虚拟 Actor。                                            |
| [Dapr.Actors.Analyzers](https://www.nuget.org/packages/Dapr.Actors.Analyzers)                             | [文档]({{% ref dotnet-guidance-source-generators %}}) | 一组 Roslyn 源生成器和分析器，用于在使用 Dapr Actors in .NET 时启用更好的实践并防止常见错误。   |
| [Dapr.Cryptography](https://www.nuget.org/packages/Dapr.Cryptography)                                     | [文档]({{% ref dotnet-cryptography %}})                  | 使用 Dapr 的加密构建块加密和解密任意大小的流式状态。                                                           |
| [Dapr.Jobs](https://www.nuget.org/packages/Dapr.Jobs)                                                     | [文档]({{% ref dotnet-jobs %}})                      | 创建和管理作业的调度和编排。                                                                                         |
| [Dapr.Jobs.Analyzers](https://www.nuget.org/packages/Dapr.Jobs.Analyzers)                                 | [文档]({{% ref dotnet-guidance-source-generators %}})                      | 一组 Roslyn 源生成器和分析器，用于在使用 Dapr Jobs in .NET 时启用更好的实践并防止常见错误。     |
| [Dapr.DistributedLocks](https://www.nuget.org/packages/Dapr.DistributedLocks)                             | [文档]({{% ref dotnet-distributed-lock %}})          | 创建和管理分布式锁以管理独占资源访问。                                                                         |
| [Dapr.Extensions.Configuration](https://www.nuget.org/packages/Dapr.Extensions.Configuration)             |                                                               | 用于 `Microsoft.Extensions.Configuration` 的 Dapr 密钥存储配置提供程序实现。                                                   |
| [Dapr.PluggableComponents](https://www.nuget.org/packages/Dapr.PluggableComponents)                       |                                                               | 使用 .NET 实现 Dapr 可插拔组件。                                                                                        |
| [Dapr.PluggableComponents.AspNetCore](https://www.nuget.org/packages/Dapr.PluggableComponents.AspNetCore) |                                                               | 使用 .NET 和丰富的 ASP.NET Core 支持实现 Dapr 可插拔组件。                                                                 |
| [Dapr.PluggableComponents.Protos](https://www.nuget.org/packages/Dapr.PluggableComponents.Protos)         |                                                               | **注意：** 开发人员无需直接在应用程序中安装此包。                                                                   |
| [Dapr.Messaging](https://www.nuget.org/packages/Dapr.Messaging)                                           | [文档]({{% ref dotnet-messaging %}})                 | 使用 Dapr Messaging SDK 构建分布式应用程序，利用流式发布订阅等消息组件。                 |
| [Dapr.Testcontainers](https://www.nuget.org/packages/Dapr.Testcontainers)                                 | [文档]({{% ref dotnet-guidance-testcontainers.md %}}) | 使用基于 Testcontainers 的测试工具运行 Dapr 集成测试。                                                                 |
| [Dapr.Workflow](https://www.nuget.org/packages/Dapr.Workflow)                                             | [文档]({{% ref dotnet-workflow %}})                  | 创建和管理与其他 Dapr API 配合使用的工作流。                                                                                         |
| [Dapr.Workflow.Versioning](https://www.nuget.org/packages/Dapr.Workflow.Versioning)                       | [文档]({{% ref dotnet-workflow-versioning.md %}})    | 为演进长期运行的工作流添加工作流版本控制策略。                                                                              |
| [Dapr.Workflow.Analyzers](https://www.nuget.org/packages/Dapr.Workflow.Analyzers)                         | [文档]({{% ref dotnet-guidance-source-generators %}}) | 一组 Roslyn 源生成器和分析器，用于在使用 Dapr Workflows in .NET 时启用更好的实践并防止常见错误。 |

## 更多信息

详细了解本地开发选项、最佳实践，或浏览 NuGet 包以添加到现有 .NET 应用程序。

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
