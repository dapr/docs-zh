---
type: docs
title: "Isolation"
linkTitle: "Isolation"
weight: 700
description: Dapr 如何提供命名空间和隔离
---

Dapr 命名空间在众多功能中提供隔离和多租户支持，带来更高的安全性。通常，应用程序和组件会被部署到命名空间中，以在给定环境（例如 Kubernetes）中提供隔离。

Dapr 在应用程序之间的服务调用、访问组件、在消费者组中发送发布订阅消息，以及 Actor 类型部署等场景中支持命名空间。自托管模式和 Kubernetes 模式均支持命名空间隔离。

开始之前，请创建并配置您的命名空间。

{{< tabpane text=true >}}

{{% tab header="Self-Hosted" %}}

在自托管模式下，通过设置 `NAMESPACE` 环境变量为 Dapr 实例指定命名空间。

{{% /tab %}}

{{% tab header="Kubernetes" %}}

在 Kubernetes 上，创建并配置命名空间：

```bash
kubectl create namespace namespaceA
kubectl config set-context --current --namespace=namespaceA
```

然后将您的应用程序部署到此命名空间中。

{{% /tab %}}

{{< /tabpane >}}

了解如何在 Dapr 中使用命名空间：

- [服务调用命名空间]({{% ref service-invocation-namespaces %}})
- [操作指南：设置发布订阅命名空间消费者组]({{% ref howto-namespace %}})
- 组件：
  - [操作指南：配置支持多命名空间的发布订阅组件]({{% ref pubsub-namespaces %}})
  - [将组件限定到一个或多个应用程序]({{% ref component-scopes %}})
