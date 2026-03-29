---
type: docs
title: "uninstall CLI 命令参考"
linkTitle: "uninstall"
description: "关于 uninstall CLI 命令的详细信息"
---

### 描述

卸载 Dapr 运行时。

### 支持的平台

- [自托管模式]({{% ref self-hosted %}})
- [Kubernetes]({{% ref kubernetes %}})

### 用法

```bash
dapr uninstall [flags]
```

### 标志

| 名称                 | 环境变量             | 默认值        | 说明                                                                                                                                            |
| -------------------- | -------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `--all`              |                      | `false`       | 除了 Scheduler 服务和 actor Placement 服务容器外，还删除 Redis、Zipkin 容器。删除位于 `$HOME/.dapr` 或 `%USERPROFILE%\.dapr\` 的默认 Dapr 目录。 |
| `--help`, `-h`       |                      |               | 打印此帮助信息                                                                                                                                  |
| `--kubernetes`, `-k` |                      | `false`       | 从 Kubernetes 集群卸载 Dapr                                                                                                                     |
| `--namespace`, `-n`  |                      | `dapr-system` | 卸载 Dapr 的 Kubernetes 命名空间                                                                                                                |
|  `--container-runtime`  |              |    `docker`      | 用于传入除 Docker 以外的容器运行时。支持的容器运行时为：`docker`、`podman`                                                                        |

### 示例

#### 从自托管模式卸载

```bash
dapr uninstall
```

您还可以使用 `--all` 选项来删除 .dapr 目录、Redis、Placement、Scheduler 和 Zipkin 容器

```bash
dapr uninstall --all
```

在设置 Dapr 时，您可以指定不同的容器运行时。如果省略 `--container-runtime` 标志，则默认容器运行时为 Docker。

```bash
dapr uninstall --all --container-runtime podman
```

#### 从 Kubernetes 卸载

```bash
dapr uninstall -k
```
