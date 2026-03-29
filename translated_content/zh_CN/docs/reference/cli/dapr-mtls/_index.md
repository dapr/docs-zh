---
type: docs
title: "mtls CLI 命令参考"
linkTitle: "mtls"
description: "mtls CLI 命令的详细信息"
---

### 描述

检查 mTLS 是否已启用。

### 支持的平台

- [Kubernetes]({{% ref kubernetes %}})

### 用法

```bash
dapr mtls [flags]
dapr mtls [command]
```

### 标志

| 名称                 | 环境变量             | 默认值  | 描述                                      |
| -------------------- | -------------------- | ------- | ------------------------------------------------ |
| `--help`, `-h`       |                      |         | 打印此帮助消息                          |
| `--kubernetes`, `-k` |                      | `false` | 检查 Kubernetes 集群中是否启用了 mTLS |

### 可用命令

```txt
expiry              检查根证书颁发机构（CA）证书的过期时间
export              将根证书颁发机构（CA）、颁发者证书和颁发者密钥导出到本地文件
renew-certificate   轮换现有的根证书颁发机构（CA）、颁发者证书和颁发者密钥
```

### 命令参考

你可以通过以下链接了解每个子命令的更多信息。

- [`dapr mtls expiry`]({{% ref dapr-mtls-expiry.md %}})
- [`dapr mtls export`]({{% ref dapr-mtls-export.md %}})
- [`dapr mtls renew-certificate`]({{% ref dapr-mtls-renew-certificate.md %}})

### 示例

```bash
# 检查 Kubernetes 集群上的 mTLS 是否已启用
dapr mtls -k
```

### 警告消息
此命令可能会发出警告消息。

#### 根证书续期警告
如果部署到 Kubernetes 集群的 mtls 根证书将在 30 天内过期，将显示以下警告消息：

```
Dapr root certificate of your Kubernetes cluster expires in <n> days. Expiry date: <date:time> UTC. 
Please see docs.dapr.io for certificate renewal instructions to avoid service interruptions.
```
