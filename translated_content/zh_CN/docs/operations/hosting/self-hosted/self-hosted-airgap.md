---
type: docs
title: "How-To: Run Dapr in an offline or airgap environment"
linkTitle: "在离线或隔离环境中运行"
weight: 30000
description: "如何在隔离环境中以自托管模式部署和运行 Dapr"
---

## 概述

默认情况下，Dapr 初始化会从网络下载二进制文件并拉取镜像，以设置开发环境。不过，Dapr 也支持使用预先下载的产物进行离线或隔离安装，可以在 Docker 或精简（slim）环境中使用。每个 Dapr 版本的产物都被构建进一个可下载的 [Dapr Installer Bundle](https://github.com/dapr/installer-bundle)。通过在 Dapr CLI `init` 命令中使用该 Dapr Installer Bundle，你可以在没有任何网络访问的环境中安装 Dapr。

## 设置

在进行隔离初始化之前，需要预先下载一个 Dapr Installer Bundle，其中将 CLI 与运行时打包在一起。这样在本地初始化 Dapr 时，就无需再下载二进制文件和 Docker 镜像。

1. 下载与所需发布版本对应的 [Dapr Installer Bundle](https://github.com/dapr/installer-bundle/releases)。例如，daprbundle_linux_amd64.tar.gz、daprbundle_windows_amd64.zip。
2. 解压该程序包。
3. 要安装 Dapr CLI，请将 `daprbundle/dapr (dapr.exe for Windows)` 二进制文件复制到所需位置：
   * 对于 Linux/MacOS - `/usr/local/bin`
   * 对于 Windows，创建一个目录并将其添加到系统 PATH 中。例如，创建一个名为 `c:\dapr` 的目录，然后通过编辑系统环境变量，将该目录添加到你的路径中。

   > 注意：如果没有将 Dapr CLI 移动到所需位置，你可以直接使用安装程序包中的本地 `dapr` CLI 二进制文件。上面的步骤是将其移动到常用位置并添加到 PATH 中。

## 初始化 Dapr environment

Dapr 可以在隔离环境中使用或不使用 Docker 容器进行初始化。

### 使用 Docker 初始化 Dapr

（[先决条件](#Prerequisites)：环境中可用 Docker）

进入安装程序包目录并运行以下命令：
``` bash
dapr init --from-dir .
```

> 对于 Linux 用户，如果你使用 sudo 运行 Docker 命令，则需要使用 "**sudo dapr init**"

> 如果你不是在安装程序包目录中运行上述命令，请将安装程序包目录的完整路径作为参数提供。例如，假设安装程序包目录路径为 $HOME/daprbundle，运行 `dapr init --from-dir $HOME/daprbundle` 可获得相同的效果。

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

> 注意：要使用 `dapr init` 模拟*在线* Dapr 初始化，你还可以按如下方式运行 Redis 和 Zipkin 容器：
```
1. docker run --name "dapr_zipkin" --restart always -d -p 9411:9411 openzipkin/zipkin
2. docker run --name "dapr_redis" --restart always -d -p 6379:6379 redislabs/rejson
```

### 不使用 Docker 初始化 Dapr

此外，如果希望 CLI 不安装任何默认配置文件，也不运行任何 Docker 容器，请在 `init` 命令中使用 `--slim` 标志。这种方式只会安装 Dapr 二进制文件。

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
