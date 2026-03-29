---
type: docs
title: "在自托管环境中升级 Dapr 的步骤"
linkTitle: "升级 Dapr"
weight: 50000
description: "按照以下步骤在自托管模式下升级 Dapr 并确保顺利升级"
---


1. 卸载当前的 Dapr 部署：

   {{% alert title="注意" color="warning" %}}
   此操作将删除默认的 `$HOME/.dapr` 目录、二进制文件以及所有容器（dapr_redis、dapr_placement 和 dapr_zipkin）。如果 docker 命令需要 sudo，Linux 用户需要运行 `sudo`。
   {{% /alert %}}

   ```bash
   dapr uninstall --all
   ```

1. 通过访问[此指南]({{% ref install-dapr-cli.md %}})下载并安装最新的 CLI。

1. 初始化 Dapr runtime：

   ```bash
   dapr init
   ```

1. 使用以下命令确保您使用的是最新版本的 Dapr (v{{% dapr-latest-version long="true" %}}）：

   ```bash
   $ dapr --version

   CLI version: {{% dapr-latest-version short="true" %}}
   Runtime version: {{% dapr-latest-version short="true" %}}
   ```
