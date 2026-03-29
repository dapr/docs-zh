---
type: docs
title: "Kubernetes 密钥"
linkTitle: "Kubernetes 密钥"
description: Kubernetes 密钥存储组件的详细信息
aliases:
  - "/operations/components/setup-secret-store/supported-secret-stores/kubernetes-secret-store/"
---

## 默认 Kubernetes 密钥存储组件
当 Dapr 部署到 Kubernetes 集群时，会自动创建一个名为 `kubernetes` 的密钥存储。这个预置的密钥存储允许您使用原生的 Kubernetes 密钥存储，无需为密钥存储编写、部署或维护组件配置文件，对于希望简单访问 Kubernetes 集群中原生存储的密钥的开发者非常有用。

仍然可以配置 Kubernetes 密钥存储的自定义组件定义文件（详情见下文）。使用自定义定义可以将代码中引用的密钥存储与托管平台解耦，因为存储名称不是固定的，可以自定义，使代码更加通用和可移植。此外，通过显式定义 Kubernetes 密钥存储组件，您可以从本地 Dapr 自托管安装连接到 Kubernetes 密钥存储。这需要有效的 [`kubeconfig`](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/) 文件。

{{% alert title="限制密钥存储访问范围" color="warning" %}}
当使用[密钥范围]({{%ref secrets-scopes.md%}})限制应用程序对密钥的访问时，需要在范围定义中包含默认密钥存储以对其进行限制。
{{% /alert %}}

## 创建自定义 Kubernetes 密钥存储组件

要设置 Kubernetes 密钥存储，需创建类型为 `secretstores.kubernetes` 的组件。有关如何创建和应用密钥存储配置，请参阅[此指南]({{% ref "setup-secret-store.md#apply-the-configuration" %}})。有关使用 Dapr 组件检索和使用密钥，请参阅此指南[引用密钥]({{% ref component-secrets.md %}})。

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
| `kubeconfigPath` | N | kubeconfig 文件的路径。如果未指定，存储使用默认的集群内配置值 | `"/path/to/kubeconfig"`


## 可选的每次请求元数据属性

可以向 Kubernetes 密钥存储组件提供以下[可选查询参数]({{% ref "secrets_api#query-parameters" %}})：

Query Parameter | Description
--------- | -----------
`metadata.namespace`| 密钥的命名空间。如果未指定，则使用 pod 的命名空间。

## 相关链接
- [密钥构建块]({{% ref secrets %}})
- [如何操作：检索密钥]({{% ref "howto-secrets.md" %}})
- [如何操作：在 Dapr 组件中引用密钥]({{% ref component-secrets.md %}})
- [密钥 API 参考]({{% ref secrets_api.md %}})
- [如何操作：使用密钥范围限制]({{%ref secrets-scopes.md%}})
