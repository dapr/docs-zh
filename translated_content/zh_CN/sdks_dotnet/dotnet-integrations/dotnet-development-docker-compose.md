---
type: docs
title: "使用 Docker Compose 进行 Dapr .NET SDK 开发"
linkTitle: "Docker Compose"
weight: 90200
description: 了解如何使用 Docker Compose 进行本地开发
---

## Docker Compose

*可将本文视为 [使用 Docker 自托管 Dapr 指南]({{% ref self-hosted-with-docker.md %}}) 的 .NET 伴侣指南。*

`docker-compose` 是随 Docker Desktop 附带的 CLI 工具，可用于同时运行多个容器。它是一种将多个容器的生命周期进行自动化的方式，并为面向 Kubernetes 的应用提供类似生产环境的开发体验。

- **优点：** 由于 `docker-compose` 会为你管理容器，你可以将依赖项作为应用定义的一部分，并停止机器上长期运行的容器。
- **缺点：** 投入成本最高，服务需要容器化才能开始使用。
- **缺点：** 如果你不熟悉 Docker，可能会难以调试和排查故障。

### 使用 docker-compose

从 .NET 的角度来看，对于 Dapr 的 `docker-compose` 不需要专门的指导。`docker-compose` 运行容器，一旦你的服务进入容器中，其配置与任何其他编程技术类似。

{{% alert title="💡 应用端口" color="primary" %}}
在容器中，ASP.NET Core 应用默认监听端口 80。稍后配置 `--app-port` 时请记住这一点。
{{% /alert %}}

总结方法如下：

- 为每个服务创建一个 `Dockerfile`
- 创建一个 `docker-compose.yaml` 并将其签入源代码仓库

要了解如何编写 `docker-compose.yaml`，你应该从 [Hello, docker-compose 示例](https://github.com/dapr/samples/tree/master/hello-docker-compose) 开始。

与使用 `dapr run` 在本地运行的每个服务类似，你需要选择一个唯一的 app-id。选择容器名称作为 app-id 会更容易记忆。

compose 文件至少包含：

- 容器用于通信的网络
- 每个服务的容器
- 指定了服务端口和 app-id 的 `<service>-daprd` 边车容器
- 在容器中运行的其他依赖项（例如 redis）
- 可选：Dapr placement 容器（用于 Actor）

你还可以从 [eShopOnContainers](https://github.com/dotnet-architecture/eShopOnDapr/blob/master/docker-compose.yml) 示例应用中查看更大的示例。
