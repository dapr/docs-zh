---
type: docs
title: "操作指南：在离线或隔离环境中运行 Dapr"
linkTitle: "在离线或隔离环境中运行"
weight: 30000
description: "如何在隔离环境中以自托管模式部署和运行 Dapr"
---

## 概述

默认情况下，Dapr 初始化会从网络下载二进制文件并拉取镜像来设置开发环境。但是，Dapr 也支持使用预先下载的产物进行离线或隔离安装，可以在 Docker 或精简环境中使用。每个 Dapr 版本的产物都被构建到可以下载的 [Dapr 安装程序包](https://github.com/dapr/installer-bundle)中。通过在 Dapr CLI `init` 命令中使用此安装程序包，您可以在没有任何网络访问的环境中安装 Dapr。

## 设置

在隔离初始化之前，需要预先下载包含 CLI、运行时和仪表板打包在一起的 Dapr 安装程序包。这消除了在本地初始化 Dapr 时下载二进制文件和 Docker 镜像的需要。

1. 下载特定发布版本的 [Dapr 安装程序包](https://github.com/dapr/installer-bundle/releases)。例如，daprbundle_linux_amd64.tar.gz、daprbundle_windows_amd64.zip。
2. 解压它。
3. 要安装 Dapr CLI，请将 `daprbundle/dapr`（Windows 为 dapr.exe）二进制文件复制到所需位置：
   * 对于 Linux/MacOS - `/usr/local/bin`
   * 对于 Windows，创建一个目录并将其添加到您的系统 PATH 中。例如，创建一个名为 `c:\dapr` 的目录，然后通过编辑系统环境变量将此目录添加到您的路径中。

   > 注意：如果 Dapr CLI 未移动到所需位置，您可以使用包中的本地 `dapr` CLI 二进制文件。上述步骤是为了将其移动到常用位置并将其添加到路径中。

## 初始化 Dapr 环境

Dapr 可以在隔离环境中使用或不使用 Docker 容器进行初始化。

### 使用 Docker 初始化 Dapr

（[先决条件](#Prerequisites)：环境中可用 Docker）

移动到包目录并运行以下命令：
``` bash
dapr init --from-dir .
```

> 对于 linux 用户，如果您使用 sudo 运行 Docker 命令，则需要使用 "**sudo dapr init**"

> 如果您不是从包目录运行上述命令，请提供包目录的完整路径作为输入。例如，假设包目录路径为 $HOME/daprbundle，运行 `dapr init --from-dir $HOME/daprbundle` 以获得相同的行为。

输出应类似于以下内容：
```bash
  Making the jump to hyperspace...
ℹ️  Installing runtime version latest
↘  Extracting binaries and setting up components... Loaded image: daprio/dapr:$version
✅  Extracting binaries and setting up components...
✅  Extracted binaries and completed components set up.
ℹ️  daprd binary has been installed to $HOME/.dapr/bin.
ℹ️  dapr_placement container is running.
ℹ️  Use `docker ps` to check running containers.
✅  Success! Dapr is up and running. To get started, go here: https://aka.ms/dapr-getting-started
```

> 注意：要使用 `dapr init` 模拟*在线* Dapr 初始化，您还可以按如下方式运行 Redis 和 Zipkin 容器：
```
1. docker run --name "dapr_zipkin" --restart always -d -p 9411:9411 openzipkin/zipkin
2. docker run --name "dapr_redis" --restart always -d -p 6379:6379 redislabs/rejson
```

### 不使用 Docker 初始化 Dapr

或者，让 CLI 不安装任何默认配置文件或不运行任何 Docker 容器，请在 `init` 命令中使用 `--slim` 标志。仅安装 Dapr 二进制文件。

``` bash
dapr init --slim --from-dir .
```

输出应类似于以下内容：
```bash
⌛  Making the jump to hyperspace...
ℹ️  Installing runtime version latest
↙  Extracting binaries and setting up components... 
✅  Extracting binaries and setting up components...
✅  Extracted binaries and completed components set up.
ℹ️  daprd binary has been installed to $HOME.dapr/bin.
ℹ️  placement binary has been installed to $HOME/.dapr/bin.
✅  Success! Dapr is up and running. To get started, go here: https://aka.ms/dapr-getting-started
```
