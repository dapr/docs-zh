---
type: docs
title: "mtls renew certificate CLI 命令参考"
linkTitle: "mtls renew certificate"
description: "mtls renew certificate CLI 命令的详细信息"
weight: 3000
---

### 描述
此命令可用于续订即将过期的 Dapr 证书。例如，Dapr Sentry 服务可以生成应用程序使用的默认根证书和颁发者证书。有关更多信息，请参阅[安全的 Dapr 与 Dapr 通信]({{% ref "#secure-dapr-to-dapr-communication" %}})

### 支持的平台

- [Kubernetes]({{% ref kubernetes %}})

### 用法

```bash
dapr mtls renew-certificate [flags]
```

### 标志

| 名称           | 环境变量 | 默认值           | 描述                                 |
| -------------- | -------------------- | ----------------- | ------------------------------------------- |
| `--help`, `-h` |                      |                   | 显示 renew-certificate 的帮助信息
| `--kubernetes`, `-k` |                      | `false` | 支持的平台|                             |
| `--valid-until`  |                      | 365 天 |  新创建证书的有效期 |
| `--restart`  |                      | false |  重启 Dapr 控制平面服务（Sentry 服务、Operator 服务和 Placement 服务器） |
| `--timeout`  |                      | 300 秒 |  证书续订过程的超时时间 |
| `--ca-root-certificate`  |                      |  |  用户提供的 PEM 根证书的文件路径|
| `--issuer-public-certificate`  |                      |  |  用户提供的 PEM 颁发者证书的文件路径|
| `--issuer-private-key`  |                      |  |  用户提供的 PEM 颁发者私钥的文件路径|
| `--private-key`  |                      |  |  用户提供的 root.key 文件，用于生成根证书|

### 示例

#### 通过生成全新的证书来续订证书
为 Kubernetes 集群生成新的根证书和颁发者证书，默认有效期为 365 天。证书不会应用到 Dapr 控制平面。
```bash
dapr mtls renew-certificate -k
```
为 Kubernetes 集群生成新的根证书和颁发者证书，默认有效期为 365 天，并重启 Dapr 控制平面服务。
```bash
dapr mtls renew-certificate -k --restart
```
为 Kubernetes 集群生成新的根证书和颁发者证书，具有给定的有效期。
```bash
dapr mtls renew-certificate -k --valid-until <天数>
```
为 Kubernetes 集群生成新的根证书和颁发者证书，具有给定的有效期并重启 Dapr 控制平面服务。
```bash
dapr mtls renew-certificate -k --valid-until <天数> --restart
```
#### 使用用户提供的证书来续订证书
使用提供的 ca.pem、issuer.pem 和 issuer.key 文件路径为 Kubernetes 集群轮换证书并重启 Dapr 控制平面服务
```bash
dapr mtls renew-certificate -k --ca-root-certificate <ca.pem> --issuer-private-key <issuer.key> --issuer-public-certificate <issuer.pem> --restart
```
使用提供的 ca.pem、issuer.pem 和 issuer.key 文件路径为 Kubernetes 集群轮换证书。
```bash
dapr mtls renew-certificate -k --ca-root-certificate <ca.pem> --issuer-private-key <issuer.key> --issuer-public-certificate <issuer.pem>
```
#### 使用提供的根私钥通过生成全新的证书来续订证书
使用现有的 root.key 私钥为 Kubernetes 集群生成新的根证书和颁发者证书，创建的证书具有给定的有效期。
```bash
dapr mtls renew-certificate -k --private-key myprivatekey.key --valid-until <天数>
```
使用现有的 root.key 私钥为 Kubernetes 集群生成新的根证书和颁发者证书。
```bash
dapr mtls renew-certificate -k --private-key myprivatekey.key
```
