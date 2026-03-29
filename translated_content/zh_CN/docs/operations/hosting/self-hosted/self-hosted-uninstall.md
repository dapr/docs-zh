---
type: docs
title: "在自托管环境中卸载 Dapr"
linkTitle: "卸载 Dapr"
weight: 60000
description: "从本地机器移除 Dapr 的步骤"
---

以下 CLI 命令移除 Dapr 边车二进制文件和 placement 容器：

```bash
dapr uninstall
```
上述命令默认不会移除在 `dapr init` 期间安装的 Redis 或 Zipkin 容器，以防您将它们用于其他用途。若要移除 Redis、Zipkin、Actor Placement 容器，以及位于 `$HOME/.dapr` 或 `%USERPROFILE%\.dapr\` 的默认 Dapr 目录，请运行：

```bash
dapr uninstall --all
```

{{% alert title="注意" color="primary" %}}
对于 Linux/MacOS 用户，如果您使用 sudo 运行 docker 命令或安装路径为 `/usr/local/bin`（默认安装路径），则需要使用 `sudo dapr uninstall` 来移除 dapr 二进制文件和/或容器。
{{% /alert %}}
