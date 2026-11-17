---
type: docs
title: "操作指南：控制应用程序的并发和速率限制"
linkTitle: "并发与速率限制"
weight: 2000
description: "了解如何控制可以同时调用您的应用程序的请求数和事件数"
---

在分布式计算中，通常您可能只希望允许给定数量的请求并发执行。使用 Dapr 的 `app-max-concurrency`，您可以控制同时调用您的应用程序的请求数和事件数。

默认的 `app-max-concurrency` 设置为 `-1`，表示不强制执行并发限制。

## 不同的方法

Dapr 提供了多种并发和速率限制的方法。了解它们之间的区别很重要：

| 方法 | 控制内容 | 范围 |
|------|---------|------|
| `app-max-concurrency` | 发送到应用程序的最大并发请求和事件数 | 每个 sidecar |
| `middleware.http.ratelimit` | 按远程 IP 统计的每秒 HTTP 请求数 | 每个 sidecar |
| [workflow 并发限制]({{% ref workflow-concurrency.md %}}) | workflow 和 activity 的执行，可按名称细分 | 每个 sidecar，或全局（跨所有副本） |

本指南重点介绍 `app-max-concurrency`。有关其他方法，请参阅 [rate limit middleware]({{% ref middleware-rate-limit.md %}}) 和 [workflow 并发限制]({{% ref workflow-concurrency.md %}})。

## 演示

观看此[视频](https://youtu.be/yRI5g6o_jp8?t=1710)，了解如何控制并发和速率限制。

{{< youtube id=yRI5g6o_jp8 start=1710 >}}

## 配置 `app-max-concurrency`

如果不使用 Dapr，您需要在应用程序中创建某种信号量，并负责获取和释放它。

使用 Dapr，您无需对应用程序进行任何代码更改。

选择您想要配置 `app-max-concurrency` 的方式。

{{< tabpane text=true >}}

 <!-- CLI -->
{{% tab "CLI" %}}

要在本地开发计算机上使用 Dapr CLI 设置并发限制，请添加 `app-max-concurrency` 标志：

```bash
dapr run --app-max-concurrency 1 --app-port 5000 python ./app.py
```

上述示例实际上将您的应用程序转换为顺序处理服务。

{{% /tab %}}

 <!-- Kubernetes -->
{{% tab "Kubernetes" %}}

要在 Kubernetes 中配置并发限制，请将以下注解添加到您的 pod：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodesubscriber
  namespace: default
  labels:
    app: nodesubscriber
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nodesubscriber
  template:
    metadata:
      labels:
        app: nodesubscriber
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "nodesubscriber"
        dapr.io/app-port: "3000"
        dapr.io/app-max-concurrency: "1"
#...
```

{{% /tab %}}

{{< /tabpane >}}

## 限制

### 控制外部请求的并发性
对于来自 Dapr 的每个事件（包括 pub/sub 事件、来自其他服务的直接调用、binding 事件等），Dapr 都保证执行速率限制。但是，Dapr 无法对从外部发送到您的应用程序的请求强制执行并发策略。

## 相关链接

[参数和注解]({{% ref arguments-annotations-overview.md %}})

## 后续步骤

{{< button text="限制 secret store 访问" page="secret-scope.md" >}}
