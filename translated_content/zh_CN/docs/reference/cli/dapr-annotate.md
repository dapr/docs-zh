---
type: docs
title: "annotate CLI 命令参考"
linkTitle: "annotate"
description: "向 Kubernetes 配置添加 Dapr 注解"
---

### 描述

向 Kubernetes 配置添加 Dapr 注解。这使您能够在部署文件上添加/更改 Dapr 注解。有关以下标志列表中每个可用注解的完整说明，请参阅 [Kubernetes 注解]({{% ref arguments-annotations-overview %}})。

### 支持的平台

- [Kubernetes]({{% ref kubernetes %}})

### 用法

```bash
dapr annotate [flags] CONFIG-FILE
```

### 标志

| 名称 | 环境变量 | 默认值 | 描述
| --- | --- | --- | --- |
| `--kubernetes, -k` | | | 向 Kubernetes 资源应用注解。必需 |
| `--api-token-secret` | | | 用于 API 令牌的密钥 |
| `--app-id, -a` | | | 要添加注解的应用 ID |
| `--app-max-concurrency` | | `-1` | 允许的最大并发请求数 |
| `--app-port, -p` | | `-1` | 暴露应用的端口 |
| `--app-protocol` | | | 应用使用的协议：`http`（默认）、`grpc`、`https`、`grpcs`、`h2c` |
| `--app-token-secret` | | | 用于应用令牌的密钥 |
| `--config, -c` | | | 要添加注解的配置文件 |
| `--cpu-limit` | | | 为边车设置的 CPU 限制。请参阅[此处](https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/)的有效值。 |
| `--cpu-request` | | | 为边车设置的 CPU 请求。请参阅[此处](https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/)的有效值。 |
| `--dapr-image` | | | 用于 dapr 边车容器的镜像 |
| `--enable-debug` | | `false` | 启用调试 |
| `--enable-metrics` | | `false` | 启用指标 |
| `--enable-profile` | | `false` | 启用性能分析 |
| `--env` | | | 要设置的环境变量（键值对，逗号分隔） |
| `--graceful-shutdown-seconds` | | `-1` | 等待应用关闭的秒数 |
| `--help, -h` | | | annotate 命令的帮助信息 |
| `--listen-addresses` | | | 边车监听的地址。要监听所有 IPv4 地址，使用 `0.0.0.0`。要监听所有 IPv6 地址，使用 `[::]`。 |
| `--liveness-probe-delay` | | `-1` | 边车用于存活探测的延迟。了解更多[信息](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)。 |
| `--liveness-probe-period` | | `-1` | 边车用于存活探测的周期。了解更多[信息](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)。 |
| `--liveness-probe-threshold` | | `-1` | 边车用于存活探测的阈值。了解更多[信息](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)。 |
| `--liveness-probe-timeout` | | `-1` | 边车用于存活探测的超时时间。了解更多[信息](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)。 |
| `--log-level` | | | 要使用的日志级别 |
| `--max-request-body-size` | | `-1` | 要使用的最大请求体大小 |
| `--http-read-buffer-size` | | `-1` | HTTP 标头读取缓冲区的最大大小（千字节） | 
| `--memory-limit` | | | 为边车设置的内存限制。请参阅[此处](https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/)的有效值 |
| `--memory-request`| | | 为边车设置的内存请求 |
| `--metrics-port` | | `-1` | 暴露指标的端口 |
| `--namespace, -n` | | | 资源目标所在的命名空间（仅在同时设置了 `--resource` 时才能设置） |
| `--readiness-probe-delay` | | `-1` | 边车中就绪探测要使用的延迟。了解更多[信息](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)。|
| `--readiness-probe-period` | | `-1` | 边车中就绪探测要使用的周期。了解更多[信息](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)。 |
| `--readiness-probe-threshold` | | `-1` | 边车中就绪探测要使用的阈值。了解更多[信息](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)。 |
| `--readiness-probe-timeout` | | `-1` | 边车中就绪探测要使用的超时时间。了解更多[信息](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)。 |
| `--resource, -r` | | | 要添加注解的 Kubernetes 资源目标 |
| `--enable-api-logging` | | | 为 Dapr 边车启用 API 日志记录 |
| `--unix-domain-socket-path` | | | 用于与 Dapr 边车通信的 Linux 域套接字路径 | 
| `--volume-mounts` | | | 要以只读模式挂载到边车容器的 Pod 卷列表 | 
| `--volume-mounts-rw` | | | 要以读写模式挂载到边车容器的 Pod 卷列表 | 
| `--disable-builtin-k8s-secret-store` | | | 禁用内置的 Kubernetes 密钥存储 |
| `--placement-host-address` | | | Dapr Actor 放置服务器的地址列表，逗号分隔 |

{{% alert title="警告" color="warning" %}}
如果未使用 `--app-id, -a` 提供应用 ID，将使用格式 `<namespace>-<kind>-<name>` 生成一个 ID。
{{% /alert %}}

### 示例

```bash 
# 对输入中找到的第一个部署添加注解
kubectl get deploy -l app=node -o yaml | dapr annotate -k - | kubectl apply -f -

# 在链中按名称为多个部署添加注解
kubectl get deploy -o yaml | dapr annotate -k -r nodeapp - | dapr annotate -k -r pythonapp - | kubectl apply -f -

# 从文件或目录按名称为特定命名空间中的部署添加注解
dapr annotate -k -r nodeapp -n namespace mydeploy.yaml | kubectl apply -f -

# 从 URL 按名称为部署添加注解
dapr annotate -k -r nodeapp --log-level debug https://raw.githubusercontent.com/dapr/quickstarts/master/tutorials/hello-kubernetes/deploy/node.yaml | kubectl apply -f -
```
