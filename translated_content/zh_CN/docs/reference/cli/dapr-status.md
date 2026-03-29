---
type: docs
title: "status CLI 命令参考"
linkTitle: "status"
description: "status CLI 命令的详细信息"
---

### 说明

显示 Dapr 服务的健康状态。

### 支持的平台

- [Kubernetes]({{% ref kubernetes %}})

### 用法

```bash
dapr status -k
```

### 标志

| 名称                 | 环境变量             | 默认值  | 说明                                                    |
| -------------------- | -------------------- | ------- | ------------------------------------------------------- |
| `--help`, `-h`       |                      |         | 打印此帮助消息                                          |
| `--kubernetes`, `-k` |                      | `false` | 显示 Kubernetes 集群上 Dapr 服务的健康状态              |

### 示例

```bash
# 从 Kubernetes 获取 Dapr 服务状态
dapr status -k
```

### 警告消息
此命令可能会发出警告消息。

#### 根证书更新警告
如果部署到 Kubernetes 集群的 mtls 根证书在 30 天内过期，将显示以下警告消息：

```
Dapr root certificate of your Kubernetes cluster expires in <n> days. Expiry date: <date:time> UTC. 
Please see docs.dapr.io for certificate renewal instructions to avoid service interruptions.
```
