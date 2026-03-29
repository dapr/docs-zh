---
type: docs
title: "使用 Dapr CLI 进行 Dapr .NET SDK 开发"
linkTitle: "Dapr CLI"
weight: 90100
description: 了解如何使用 Dapr CLI 进行本地开发
---

## Dapr CLI

*可以将本文视为 [Docker 自托管 Dapr 指南]({{% ref self-hosted-with-docker.md %}}) 的 .NET 伴侣指南。*

Dapr CLI 为您提供了一个良好的开发基础，它会初始化本地 Redis 容器、Zipkin 容器、placement 服务以及 Redis 的组件清单。这使您可以在全新安装且无需额外设置的情况下，使用以下构建块：

- [服务调用]({{% ref service-invocation %}})
- [状态存储]({{% ref state-management %}})
- [发布订阅]({{% ref pubsub %}})
- [Actor]({{% ref actors %}})

您可以使用 `dapr run` 来运行 .NET 服务，作为本地开发的策略。计划为每个服务运行以下命令之一以启动您的应用程序。

- **优点：** 由于这是默认 Dapr 安装的一部分，因此设置起来很容易
- **缺点：** 这会在您的机器上使用长时间运行的 Docker 容器，这可能并不理想
- **缺点：** 这种方法的可扩展性较差，因为它需要为每个服务单独运行命令

### 使用 Dapr CLI

对于每个服务，您需要选择：

- 用于寻址的唯一 app-id（`app-id`）
- 用于 HTTP 的唯一监听端口（`port`）

您还应该决定在哪里存储组件（`components-path`）。

以下命令可以在多个终端中运行以启动每个服务，并将相应的值替换进去。

```sh
dapr run --app-id <app-id> --app-port <port> --components-path <components-path> -- dotnet run -p <project> --urls http://localhost:<port>
```

**说明：** 此命令将使用 `dapr run` 来启动每个服务及其边车。命令的前半部分（在 `--` 之前）将所需的配置传递给 Dapr CLI。命令的后半部分（在 `--` 之后）将所需的配置传递给 `dotnet run` 命令。

{{% alert title="💡 端口" color="primary" %}}
由于您需要为每个服务配置唯一的端口，您可以使用此命令将该端口值传递给 **Dapr 和服务两者**。`--urls http://localhost:<port>` 将配置 ASP.NET Core 在提供的端口上监听流量。在命令行中使用配置比在其他地方硬编码监听端口更灵活。
{{% /alert %}}

如果您的任何服务不接受 HTTP 流量，则通过删除 `--app-port` 和 `--urls` 参数来修改上述命令。

### 后续步骤

如果您需要调试，请使用调试器的附加功能附加到正在运行的进程之一。

如果您想扩展这种方法，请考虑构建一个脚本，为整个应用程序自动执行此过程。
