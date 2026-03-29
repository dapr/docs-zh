---
type: docs
title: "操作指南：使用 Podman 在自托管模式下运行 Dapr"
linkTitle: "使用 Podman 运行"
weight: 20000
description: "如何使用 Podman 在自托管模式下部署和运行 Dapr"
---

本文提供在 Windows/Linux/macOS 机器或 VM 上使用 Podman 运行 Dapr 的指导。

## 前置条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}})
- [Podman](https://podman-desktop.io/downloads)

## 初始化 Dapr 环境

要初始化 Dapr 控制平面容器并创建默认配置文件，运行：

```bash
dapr init --container-runtime podman
```

## 以进程方式同时运行应用和边车

[`dapr run` CLI 命令]({{% ref dapr-run.md %}}) 可用于启动 Dapr 边车和你的应用：

```bash
dapr run --app-id myapp --app-port 5000 -- dotnet run
```

此命令会同时启动 daprd 边车和你的应用。

## 以进程方式运行应用并以 Docker 容器方式运行边车

或者，如果你在 Docker 容器中运行 Dapr，并在主机上以进程方式运行应用，则需要配置 Podman 使用主机网络，以便 Dapr 和应用可以共享一个 localhost 网络接口。

如果你在 Linux 主机上运行 Podman，则可以运行以下命令来启动 Dapr：

```shell
podman run --network="host" --mount type=bind,source="$(pwd)"/components,target=/components daprio/daprd:edge ./daprd -app-id <my-app-id> -app-port <my-app-port>
```

然后你可以在主机上运行你的应用，它们应该可以通过 localhost 网络接口进行连接。

## 卸载 Dapr 环境

要完全卸载 Dapr，运行：

```bash
dapr uninstall --container-runtime podman --all
```
