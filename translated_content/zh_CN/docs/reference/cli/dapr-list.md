---
type: docs
title: "list CLI 命令参考"
linkTitle: "list"
description: "关于 list CLI 命令的详细信息"
---

### 描述

列出所有 Dapr 实例。

### 支持的平台

- [自托管]({{% ref self-hosted %}})
- [Kubernetes]({{% ref kubernetes %}})

### 用法

```bash
dapr list [flags]
```

### 参数


| 名称 | 环境变量 | 默认值 | 描述
| --- | --- | --- | --- |
| `--all-namespaces`, `-A` | | `false` | 列出所有命名空间中的所有 Dapr Pod（可选） |
| `--help`, `-h` | | | 打印此帮助消息 |
| `--kubernetes`, `-k` | | `false` | 列出 Kubernetes 集群中的所有 Dapr Pod（可选） |
| `--namespace`, `-n` | | `default` | 列出 Kubernetes 中指定命名空间的 Dapr Pod。仅与 `-k` 参数一起使用（可选） |
| `--output`, `-o` | | `table` | 列表的输出格式。有效值为：`json`、`yaml` 或 `table`

### 示例

```bash
# 列出自托管模式下的 Dapr 实例
dapr list

# 列出 Kubernetes 模式下所有命名空间中的 Dapr 实例
dapr list -k

# 以 JSON 格式列出 Dapr 实例
dapr list -o json

# 列出 Kubernetes 模式下特定命名空间中的 Dapr 实例
dapr list -k --namespace default

# 列出 Kubernetes 模式下所有命名空间中的 Dapr 实例
dapr list -k --all-namespaces
```

### 警告消息 - Kubernetes 模式 
此命令可能会发出警告消息。

#### 根证书续期警告
如果部署到 Kubernetes 集群的 mTLS 根证书将在 30 天内过期，则会显示以下警告消息：

```
Dapr root certificate of your Kubernetes cluster expires in <n> days. Expiry date: <date:time> UTC. 
Please see docs.dapr.io for certificate renewal instructions to avoid service interruptions.
```
