---
type: docs
title: "Kubernetes Secrets"
linkTitle: "Kubernetes Secrets"
description: 有关 Kubernetes 密钥加密组件的详细信息
---

## 组件格式

此组件的目的是加载以密钥名称命名的 Kubernetes 密钥。

{{% alert title="注意" color="primary" %}}
此组件使用 Dapr 中的加密引擎执行操作。虽然密钥永远不会暴露给您的应用程序，但 Dapr 可以访问原始密钥材料。

{{% /alert %}}

Dapr `crypto.yaml` 组件文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: crypto.dapr.kubernetes.secrets
  version: v1
  metadata:[]
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议使用密钥存储来存储密钥，如[此处]({{% ref component-secrets.md %}})所述。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必需 |  详细信息 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `defaultNamespace` | N | 用于检索密钥的默认命名空间。如果未设置，则必须为每个密钥指定命名空间，格式为 `namespace/secretName/key` | `"default-ns"` |
| `kubeconfigPath` | N | kubeconfig 文件的路径。如果未指定，组件将使用群集内默认配置值 | `"/path/to/kubeconfig"`


## 相关链接
[加密构建块]({{% ref cryptography %}})
