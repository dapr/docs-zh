---
type: docs
title: "操作指南：在 Docker 中以自托管模式运行 Dapr"
linkTitle: "使用 Docker 运行"
weight: 20000
description: "如何使用 Docker 在自托管模式下部署和运行 Dapr"
---

本文提供了在 Windows/Linux/macOS 机器或虚拟机上使用 Docker 运行 Dapr 的指导。

## 前置条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}})
- [Docker](https://docs.docker.com/get-docker/)
- [Docker-Compose](https://docs.docker.com/compose/install/)（可选）

## 初始化 Dapr 环境

要初始化 Dapr 控制平面容器并创建默认配置文件，请运行：

```bash
dapr init
```

## 将应用和边车作为进程运行

[`dapr run` CLI 命令]({{% ref dapr-run.md %}})可用于启动 Dapr 边车以及你的应用程序：

```bash
dapr run --app-id myapp --app-port 5000 -- dotnet run
```

此命令将启动 daprd 边车二进制文件并运行 `dotnet run`，从而启动你的应用程序。

## 将应用作为进程运行，边车作为 Docker 容器运行

或者，如果你在 Docker 容器中运行 Dapr，并将应用程序作为主机上的进程运行，则需要配置 Docker 使用主机网络，以便 Dapr 和应用程序可以共享一个 localhost 网络接口。

{{% alert title="注意" color="warning" %}}
Docker 的主机网络驱动程序仅支持 Linux 主机。
{{% /alert %}}

如果你在 Linux 主机上运行 Docker 守护进程，可以运行以下命令来启动 Dapr：

```shell
docker run --net="host" --mount type=bind,source="$(pwd)"/components,target=/components daprio/daprd:edge ./daprd -app-id <my-app-id> -app-port <my-app-port>
```

然后你可以在主机上运行你的应用程序，它们应该能够通过 localhost 网络接口进行连接。

## 在单个 Docker 容器中运行应用和 Dapr
> 仅用于开发目的

不建议在同一容器内运行 Dapr 运行时和应用程序。但是，对于本地开发场景，可以这样做。

为此，你需要编写一个 Dockerfile，在其中安装 Dapr 运行时、Dapr CLI 和应用程序代码。
然后你可以使用 Dapr CLI 调用 Dapr 运行时和应用程序代码。

以下是一个实现此目的的 Dockerfile 示例：

```docker
FROM python:3.7.1
# 安装 dapr CLI
RUN wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

# 安装 daprd
ARG DAPR_BUILD_DIR
COPY $DAPR_BUILD_DIR /opt/dapr
ENV PATH="/opt/dapr/:${PATH}"
RUN dapr init --slim

# 安装你的应用
WORKDIR /app
COPY python .
RUN pip install requests
ENTRYPOINT ["dapr"]
CMD ["run", "--app-id", "nodeapp", "--app-port", "3000", "node", "app.js"]
```

请记住，如果 Dapr 需要与其他组件（例如 Redis）通信，这些组件也需要对它可访问。

## 在 Docker 网络上运行

如果你有多个在 Docker 容器中运行的 Dapr 实例，并希望它们能够彼此通信*例如用于服务调用*，则需要创建一个共享的 Docker 网络，并确保这些 Dapr 容器连接到该网络。

你可以使用以下命令创建一个简单的 Docker 网络：
```bash
docker network create my-dapr-network
```
运行 Docker 容器时，可以使用以下命令将它们连接到网络：
```bash
docker run --net=my-dapr-network ...
```
每个容器将在该网络上获得一个唯一的 IP，并能够与该网络上的其他容器通信。

## 使用 Docker-Compose 运行

[Docker Compose](https://docs.docker.com/compose/)可用于定义多容器应用程序配置。如果你希望在不使用 Kubernetes 的情况下在本地运行多个带有 Dapr 边车的应用程序，建议使用 Docker Compose 定义（`docker-compose.yml`）。

Docker Compose 的语法和工具超出了本文的范围，但是建议你参考[官方 Docker 文档](https://docs.docker.com/compose/)了解更多详细信息。

要使用 Dapr 和 Docker Compose 运行应用程序，你需要在 `docker-compose.yml` 中定义边车模式。例如：

```yaml
version: '3'
services:
  nodeapp:
    build: ./node
    ports:
      - "50001:50001" # Dapr 实例通过 gRPC 通信，因此我们需要公开 gRPC 端口
    depends_on:
      - redis
      - placement
    networks:
      - hello-dapr
  nodeapp-dapr:
    image: "daprio/daprd:edge"
    command: [
      "./daprd",
     "--app-id", "nodeapp",
     "--app-port", "3000",
     "--placement-host-address", "placement:50006", # 可以通过 docker DNS 条目访问 Dapr 的 placement 服务
     "--scheduler-host-address", "scheduler:50007", # 可以通过 docker DNS 条目访问 Dapr 的 scheduler 服务
     "--resources-path", "./components"
     ]
    volumes:
        - "./components/:/components" # 挂载我们的 components 文件夹供运行时使用。挂载位置必须与 --resources-path 参数匹配。
    depends_on:
      - nodeapp
    network_mode: "service:nodeapp" # 将 nodeapp-dapr 服务附加到 nodeapp 网络命名空间

  ... # 部署其他 daprized 服务和组件（例如 Redis）

  placement:
    image: "daprio/placement"
    command: ["./placement", "--port", "50006"]
    ports:
      - "50006:50006"

  scheduler:
    image: "daprio/scheduler"
    command: ["./scheduler", "--port", "50007", "--etcd-data-dir", "/data"]
    ports:
      - "50007:50007"
    user: root
    volumes:
    - "./dapr-etcd-data/:/data"
  
  networks:
    hello-dapr: null
```

> 对于在 Linux 主机上运行 Docker 守护进程的用户，如果需要，你也可以使用 `network_mode: host` 来利用主机网络。

要进一步了解如何使用 Docker Compose 运行 Dapr，请参阅[Docker-Compose 示例](https://github.com/dapr/samples/tree/master/hello-docker-compose)。

上述示例还包括一个调度器定义，该定义使用非持久化数据存储用于测试和开发目的。

## 在 Kubernetes 上运行

如果你的部署目标是 Kubernetes，请使用 Dapr 的一流集成。请参阅
[Dapr on Kubernetes 文档]({{% ref "kubernetes-overview.md" %}})。

## 名称解析

Dapr 在自托管模式下默认使用 mDNS 作为服务调用的名称解析组件。如果你在虚拟机上运行 Dapr 或 mDNS 不可用，则可以使用 [HashiCorp Consul]({{% ref setup-nr-consul.md %}}) 组件进行名称解析。

## Docker 镜像

Dapr 为不同的组件提供了许多预构建的 Docker 镜像，你应该根据所需的二进制文件、架构和标签/版本选择相关的镜像。

### 镜像
在 [Docker Hub](https://hub.docker.com/u/daprio) 上提供了每个 Dapr 组件的已发布 Docker 镜像。
- [daprio/dapr](https://hub.docker.com/r/daprio/dapr)（包含所有 Dapr 二进制文件）
- [daprio/daprd](https://hub.docker.com/r/daprio/daprd)
- [daprio/placement](https://hub.docker.com/r/daprio/placement)
- [daprio/sentry](https://hub.docker.com/r/daprio/sentry)
- [daprio/dapr-dev](https://hub.docker.com/r/daprio/dapr-dev)

### 标签

#### Linux/amd64
- `latest`：最新发布版本，**仅**用于开发目的。
- `edge`：最新的 edge 构建（master 分支）。
- `major.minor.patch`：发布版本。
- `major.minor.patch-rc.iteration`：发布候选版本。
#### Linux/arm/v7
- `latest-arm`：最新的 ARM 发布版本，**仅**用于开发目的。
- `edge-arm`：最新的 ARM edge 构建（master 分支）。
- `major.minor.patch-arm`：ARM 发布版本。
- `major.minor.patch-rc.iteration-arm`：ARM 发布候选版本。
