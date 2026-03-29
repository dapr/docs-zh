---
type: docs
title: "调试在 Docker Compose 中运行的 Dapr 应用"
linkTitle: "调试 Docker Compose"
weight: 300
description: "在本地调试属于 Docker Compose 部署一部分的 Dapr 应用"
---

本文的目标是演示一种方法，在保持与 docker compose 环境中部署的其他应用程序集成的同时，调试一个或多个 daprized 应用程序（通过你的 IDE，在本地）。

让我们来看一个 docker compose 文件的最小示例，它只包含两个服务：
- `nodeapp` - 你的应用程序
- `nodeapp-dapr` - 你的 `nodeapp` 服务的 dapr 边车进程

#### compose.yml
```yaml
services:
  nodeapp:
    build: ./node
    ports:
      - "50001:50001"
    networks:
      - hello-dapr
  nodeapp-dapr:
    image: "daprio/daprd:edge"
    command: [
      "./daprd",
     "--app-id", "nodeapp",
     "--app-port", "3000",
     "--resources-path", "./components"
     ]
    volumes:
        - "./components/:/components"
    depends_on:
      - nodeapp
    network_mode: "service:nodeapp"
networks:
  hello-dapr
```

当你使用 `docker compose -f compose.yml up` 运行这个 docker 文件时，它将部署到 Docker 并正常运行。

但是，我们如何在保持与运行的 dapr 边车进程集成的同时调试 `nodeapp`，以及通过 Docker compose 文件部署的其他任何内容呢？

让我们首先引入一个名为 `compose.debug.yml` 的*第二个* docker compose 文件。当运行 `up` 命令时，这第二个 compose 文件将与第一个 compose 文件协同工作。

#### compose.debug.yml
```yaml
services:
  nodeapp: # 通过移除端口并将其从网络中隔离来隔离 nodeapp
    ports: !reset []
    networks: !reset
      - ""
  nodeapp-dapr:
    command: ["./daprd",
     "--app-id", "nodeapp",
     "--app-port", "8080", # 这必须与你在 IDE 中调试时应用程序暴露的端口相匹配
     "--resources-path", "./components",
     "--app-channel-address", "host.docker.internal"] # 使边车在主机上查找 App Channel
    network_mode: !reset "" # 重置 network_mode...
    networks: # ...以便边车可以进入正常网络
      - hello-dapr
    ports:
      - "3500:3500" # 将 HTTP 端口暴露给主机
      - "50001:50001" # 将 GRPC 端口暴露给主机（Dapr Workflows 依赖于 GRPC 通道）

```

接下来，确保你的 `nodeapp` 在你选择的 IDE 中运行/调试，并在你在上面的 `compose.debug.yml` 中指定的同一端口上暴露 - 在上面的示例中，这设置为端口 `8080`。

接下来，停止你可能已启动的任何现有 compose 会话，并运行以下命令来将两个 docker compose 文件组合运行：

`docker compose -f compose.yml -f compose.debug.yml up`

现在你应该发现，dapr 边车和你的调试应用程序将具有双向通信，就像它们在 Docker compose 环境中正常运行一样。

**注意**：需要强调的是，docker compose 环境中的 `nodeapp` 服务实际上仍在运行，但它已从 docker 网络中移除，因此实际上已被孤立，没有任何东西可以与之通信。

**演示**：观看此视频，了解如何使用 Docker Compose 调试本地 Dapr 应用

{{< youtube id=nWatANwaAik start=1738 >}}
