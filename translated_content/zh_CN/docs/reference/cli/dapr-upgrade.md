---
type: docs
title: "upgrade CLI 命令参考"
linkTitle: "upgrade"
description: "upgrade CLI 命令的详细信息"
---

### 描述

在支持的托管平台上升级或降级 Dapr。

{{% alert title="Warning" color="warning" %}}
版本升级或降级时，应该逐步进行，包括小版本。

在降级之前，请确认组件向后兼容，并且应用程序代码未使用 Dapr 早期版本不支持的 API。
{{% /alert %}}

### 支持的平台

- [Kubernetes]({{% ref kubernetes %}})

### 用法

```bash
dapr upgrade [flags]
```

### 标志

| 名称                 | 环境变量 | 默认值   | 描述                                                                                                   |
| -------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `--help`, `-h`       |          |          | 打印此帮助信息                                                                                         |
| `--kubernetes`, `-k` |          | `false`  | 在 Kubernetes 集群中升级/降级 Dapr                                                                     |
| `--runtime-version`  |          | `latest` | 要升级/降级到的 Dapr 运行时版本，例如：`1.0.0`                                                          |
| `--set`              |          |          | 在命令行上设置值（可以指定多个或用逗号分隔多个值：key1=val1,key2=val2）                                  |
| `--image-registry`   |          |          | 从给定的镜像仓库拉取 Dapr 所需的容器镜像                                                                |

### 示例

```bash
# 在 Kubernetes 中将 Dapr 升级到最新版本
dapr upgrade -k

# 在 Kubernetes 中升级或降级到指定的 Dapr 运行时版本
dapr upgrade -k --runtime-version 1.2

# 在 Kubernetes 中升级或降级到指定的 Dapr 运行时版本并设置值
dapr upgrade -k --runtime-version 1.2 --set global.logAsJson=true
```
```bash
# 使用私有仓库升级或降级，如果您使用私有仓库托管 dapr 镜像并在执行 `dapr init -k` 时使用了它
# 场景 1：dapr 镜像直接托管在私有仓库的根目录下 - 
dapr init -k --image-registry docker.io/username
# 场景 2：dapr 镜像托管在私有仓库的新/不同目录下 - 
dapr init -k --image-registry docker.io/username/<directory-name>
```

### 警告消息
此命令可能会发出警告消息。

#### 根证书续订警告
如果部署到 Kubernetes 集群的 mtls 根证书将在 30 天内过期，将显示以下警告消息：

```
Dapr root certificate of your Kubernetes cluster expires in <n> days. Expiry date: <date:time> UTC. 
Please see docs.dapr.io for certificate renewal instructions to avoid service interruptions.
```

### 相关链接

- [在 Kubernetes 集群上升级 Dapr]({{% ref kubernetes-upgrade.md %}})
