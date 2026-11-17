---
type: docs
title: "Kubernetes secrets"
linkTitle: "Kubernetes secrets"
description: Kubernetes secret store component 的详细信息
aliases:
  - "/zh-hans/operations/components/setup-secret-store/supported-secret-stores/kubernetes-secret-store/"
---

## 默认 Kubernetes secret store component
当 Dapr 部署到 Kubernetes 集群时，会自动创建一个名为 `kubernetes` 的 secret store。这个预置的 secret store 允许你使用原生的 Kubernetes secret store，无需为 secret store 编写、部署或维护 component 配置文件，对于希望简单访问 Kubernetes 集群中原生 secrets 的开发者非常有用。

仍然可以为 Kubernetes secret store 配置自定义 component 定义文件（详见下文）。使用自定义定义，可以将代码中对 secret store 的引用与 hosting platform 解耦，因为存储名称不是固定的，可以自定义，从而使代码更加通用和可移植。此外，通过显式定义 Kubernetes secret store component，你可以从本地 Dapr 自托管安装连接到 Kubernetes secret store。这需要一个有效的 [`kubeconfig`](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/) 文件。

{{% alert title="限制 secret store 访问范围" color="warning" %}}
当使用 [secret scopes]({{%ref secrets-scopes.md%}}) 限制应用程序对 secrets 的访问时，需要在作用域定义中包含默认的 secret store，才能对其进行限制。
{{% /alert %}}

## 创建自定义 Kubernetes secret store component

要设置 Kubernetes secret store，需创建类型为 `secretstores.kubernetes` 的 component。关于如何创建和应用 secretstore 配置，请参阅[此指南]({{% ref "setup-secret-store.md#apply-the-configuration" %}})。另请参阅关于[引用 secrets]({{% ref component-secrets.md %}})的指南，了解如何检索 secrets 并在 Dapr component 中使用它们。

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

## 规范 metadata 字段

| Field              | Required |  Details | Example |
|--------------------|:--------:|------------|-----|---------|
| `defaultNamespace` | N | 默认用于检索 secrets 的 namespace。如果未设置，则必须在每个请求 metadata 中指定 `namespace`，或通过环境变量 `NAMESPACE` 指定 | `"default-ns"` |
| `kubeconfigPath` | N | kubeconfig 文件的路径。如果未指定，该存储将使用默认的集群内配置值 | `"/path/to/kubeconfig"`


## 可选的每次请求 metadata 属性

可以为 Kubernetes secret store component 提供以下[可选查询参数]({{% ref "secrets_api#query-parameters" %}})：

Query Parameter | Description
--------- | -----------
`metadata.namespace`| secret 的 namespace。如果未指定，则使用 Pod 的 namespace。

## 更新 component 引用的 secrets

在 Kubernetes 中运行时，在 component 定义中通过 `secretKeyRef` 引用的、来自此 secret store 的 secrets，会在底层的 Kubernetes secret 发生变化时自动[热重载]({{% ref "component-updates.md#hot-reloading" %}})：component 会在 60 秒内使用新的 secret 值重新初始化，无需重启应用程序 Pod 或 Dapr sidecar。这使得内置的 Kubernetes secret store 成为 secret rotation 流程的理想目标，包括将 secrets 同步到原生 Kubernetes secret 中的外部 secret 管理器。有关详细信息，请阅读[更新已引用的 secrets]({{% ref "component-secrets.md#updating-referenced-secrets" %}})。

## 相关链接
- [Secrets building block]({{% ref secrets %}})
- [如何操作：检索 secret]({{% ref "howto-secrets.md" %}})
- [如何操作：在 Dapr component 中引用 secrets]({{% ref component-secrets.md %}})
- [secrets API 参考]({{% ref secrets_api.md %}})
- [如何操作：使用 secret scoping]({{%ref secrets-scopes.md%}})
