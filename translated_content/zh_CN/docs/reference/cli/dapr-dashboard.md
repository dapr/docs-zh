---
type: docs
title: "dashboard CLI 命令参考"
linkTitle: "dashboard"
description: "关于 dashboard CLI 命令的详细信息"
---

### 描述

启动 [Dapr dashboard](https://github.com/dapr/dashboard)。

### 支持的平台

- [自托管]({{% ref self-hosted %}})
- [Kubernetes]({{% ref kubernetes %}})

### 用法

```bash
dapr dashboard [flags]
```

### 标志

| 名称                 | 环境变量             | 默认值        | 描述                                                                        |
| -------------------- | -------------------- | ------------- | --------------------------------------------------------------------------- |
| `--address`, `-a`    |                      | `localhost`   | 监听地址。仅接受 IP 地址或 localhost 作为值                                  |
| `--help`, `-h`       |                      |               | 打印此帮助信息                                                              |
| `--kubernetes`, `-k` |                      | `false`       | 通过到 Kubernetes 集群的本地代理在本地浏览器中打开 Dapr dashboard            |
| `--namespace`, `-n`  |                      | `dapr-system` | Dapr dashboard 运行的命名空间                                                |
| `--port`, `-p`       |                      | `8080`        | 用于提供 Dapr dashboard 的本地端口                                          |
| `--version`, `-v`    |                      | `false`       | 打印 Dapr dashboard 的版本                                                  |

### 示例

```bash
# 在本地启动 dashboard
dapr dashboard

# 在本地启动 dashboard 服务并指定端口
dapr dashboard -p 9999

# 端口转发到在 Kubernetes 中运行的 dashboard 服务
dapr dashboard -k

# 端口转发到在 Kubernetes 中运行的 dashboard 服务，监听指定端口上的所有地址
dapr dashboard -k -p 9999 --address 0.0.0.0

# 端口转发到在 Kubernetes 中运行的 dashboard 服务，指定端口
dapr dashboard -k -p 9999
```

### 警告信息 - Kubernetes 模式
此命令可能会发出警告信息。

#### 根证书续订警告
如果部署到 Kubernetes 集群的 mTLS 根证书将在 30 天内过期，将显示以下警告信息：

```
Dapr root certificate of your Kubernetes cluster expires in <n> days. Expiry date: <date:time> UTC. 
Please see docs.dapr.io for certificate renewal instructions to avoid service interruptions.
```
