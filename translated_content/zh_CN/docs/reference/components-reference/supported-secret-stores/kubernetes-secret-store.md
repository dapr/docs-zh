---
type: docs
title: "Kubernetes 密钥"
linkTitle: "Kubernetes 密钥"
description: Kubernetes 密钥存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-secret-store/supported-secret-stores/kubernetes-secret-store/"
---

## 默认 Kubernetes 机密存储组件
当 Dapr 部署到 Kubernetes 集群时，会自动创建一个名为 `kubernetes` 的机密存储。这个预置的机密存储允许你使用原生的 Kubernetes 机密存储，无需为机密存储编写、部署或维护组件配置文件，对于希望简单访问 Kubernetes 集群中原生存储的密钥的开发者非常有用。

仍然可以为 Kubernetes 机密存储配置自定义组件定义文件（详见下文）。使用自定义定义，可以将代码中对机密存储的引用与托管平台解耦，因为存储名称不是固定的，可以自定义，从而使代码更加通用和可移植。此外，通过显式定义 Kubernetes 机密存储组件，你可以从本地 Dapr 自托管安装连接到 Kubernetes 机密存储。这需要一个有效的 [`kubeconfig`](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/) 文件。

{{% alert title="限制机密存储访问范围" color="warning" %}}
当使用[机密作用域]({{%ref secrets-scopes.md%}})限制应用程序对密钥的访问时，需要在作用域定义中包含默认的机密存储，才能对其进行限制。
{{% /alert %}}

## 创建自定义 Kubernetes 机密存储组件

要设置 Kubernetes 机密存储，需创建类型为 `secretstores.kubernetes` 的组件。关于如何创建和应用 secretstore 配置，请参阅[此指南]({{% ref "setup-secret-store.md#apply-the-configuration" %}})。另请参阅[引用密钥]({{% ref component-secrets.md %}})指南，了解如何检索并在 Dapr 组件中使用密钥。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mycustomsecretstore
spec:
  type: secretstores.kubernetes
  version: v1
  metadata:[]
```

## 规范元数据字段

| Field              | Required |  Details | Example |
|--------------------|:--------:|------------|-----|---------|
| `defaultNamespace` | N | 默认用于检索密钥的命名空间。如果未设置，则必须在每个请求元数据中指定 `namespace`，或通过环境变量 `NAMESPACE` 指定 | `"default-ns"` |
| `kubeconfigPath` | N | kubeconfig 文件的路径。如果未指定，该存储将使用默认的集群内配置值 | `"/path/to/kubeconfig"`


## 可选的每次请求元数据属性

可以为 Kubernetes 机密存储组件提供以下[可选查询参数]({{% ref "secrets_api#query-parameters" %}})：

Query Parameter | Description
--------- | -----------
`metadata.namespace`| 密钥的命名空间。如果未指定，则使用 Pod 的命名空间。

## 更新组件引用的密钥

在 Kubernetes 中运行时，在组件定义中通过 `secretKeyRef` 引用的、来自此机密存储的密钥，会在底层 Kubernetes 密钥发生变化时自动[热重载]({{% ref "component-updates.md#hot-reloading" %}})：组件会在 60 秒内使用新的密钥值重新初始化，无需重启应用程序 Pod 或 Dapr 边车。这使得内置的 Kubernetes 机密存储成为密钥轮换流程的理想目标，包括将密钥同步到原生 Kubernetes 密钥中的外部密钥管理器。有关详细信息，请阅读[更新已引用的密钥]({{% ref "component-secrets.md#updating-referenced-secrets" %}})。

## 相关链接
- [密钥构建块]({{% ref secrets %}})
- [如何操作：检索密钥]({{% ref "howto-secrets.md" %}})
- [如何操作：在 Dapr 组件中引用密钥]({{% ref component-secrets.md %}})
- [密钥 API 参考]({{% ref secrets_api.md %}})
- [如何操作：使用机密作用域]({{%ref secrets-scopes.md%}})
