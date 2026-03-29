---
type: docs
title: "logs CLI 命令参考"
linkTitle: "logs"
description: "logs CLI 命令的详细信息"
---

### 描述

获取应用程序的 Dapr 边车日志。

### 支持的平台

- [Kubernetes]({{% ref kubernetes %}})

### 用法

```bash
dapr logs [flags]
```

### 标志

 | 名称                 | 环境变量           | 默认值    | 描述                                                                                     |
 | -------------------- | ------------------ | --------- | ---------------------------------------------------------------------------------------- |
 | `--app-id`, `-a`     | `APP_ID`           |           | 需要获取日志的应用程序 id                                                                |
 | `--help`, `-h`       |                    |           | 打印此帮助消息                                                                           |
 | `--kubernetes`, `-k` |                    | `true`    | 从 Kubernetes 集群获取日志                                                               |
 | `--namespace`, `-n`  |                    | `default` | 部署应用程序的 Kubernetes 命名空间                                                       |
 | `--pod-name`, `-p`   |                    |           | Kubernetes 中 Pod 的名称，如果你的应用程序有多个 Pod 则需要指定（可选）                   |

### 示例

```bash
# 从自定义命名空间的目标 Pod 获取示例应用的日志
dapr logs -k --app-id sample --pod-name target --namespace custom
```

### 警告消息
此命令可能会发出警告消息。

#### 根证书续期警告
如果部署到 Kubernetes 集群的 mTLS 根证书将在 30 天内过期，则会显示以下警告消息：

```
Dapr root certificate of your Kubernetes cluster expires in <n> days. Expiry date: <date:time> UTC. 
Please see docs.dapr.io for certificate renewal instructions to avoid service interruptions.
```
