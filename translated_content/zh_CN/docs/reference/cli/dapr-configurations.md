---
type: docs
title: "configurations CLI 命令参考"
linkTitle: "configurations"
description: "configurations CLI 命令的详细信息"
---

### 描述

列出所有 Dapr 配置。

### 支持的平台

- [Kubernetes]({{% ref kubernetes %}})

### 用法

```bash
dapr configurations [flags]
```

### 标志


| 名称 | 环境变量 | 默认值 | 描述
| --- | --- | --- | --- |
| `--kubernetes`, `-k` | | `false` | 列出 Kubernetes 集群中的所有 Dapr 配置（必需）。
| `--all-namespaces`, `-A` | | `true` | 如果为 true，列出所有命名空间中的所有 Dapr 配置（可选）。
| `--namespace` | | | 列出特定命名空间中的 Dapr 配置。
| `--name`, `-n` | | | 打印特定的 Dapr 配置（可选）。
| `--output`, `-o` | | `list`| 输出格式（选项：json 或 yaml 或 list）。
| `--help`, `-h` | | | 打印此帮助消息。 |

### 示例

```bash
# 在 Kubernetes 模式下列出所有命名空间中的 Dapr 配置
dapr configurations -k

# 在 Kubernetes 模式下列出特定命名空间中的 Dapr 配置
dapr configurations -k --namespace default

# 在 Kubernetes 模式下打印特定的 Dapr 配置
dapr configurations -k -n appconfig

# 在 Kubernetes 模式下列出所有命名空间中的 Dapr 配置
dapr configurations -k --all-namespaces
```

### 警告消息
此命令可能会发出警告消息。

#### 根证书续期警告
如果部署到 Kubernetes 集群的 mTLS 根证书将在 30 天内过期，将显示以下警告消息：

```
Dapr root certificate of your Kubernetes cluster expires in <n> days. Expiry date: <date:time> UTC. 
Please see docs.dapr.io for certificate renewal instructions to avoid service interruptions.
```
