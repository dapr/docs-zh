---
type: docs
title: "操作指南：在组件中引用密钥"
linkTitle: "在组件中引用密钥"
weight: 500
description: "如何安全地从组件定义中引用密钥"
---

## 概述

组件可以引用组件定义中 `spec.metadata` 部分的密钥。

为了引用密钥，你需要设置 `auth.secretStore` 字段来指定保存密钥的密钥存储的名称。

在 Kubernetes 中运行时，如果 `auth.secretStore` 为空，则假定为 Kubernetes 密钥存储。

### 支持的密钥存储

访问[此链接]({{% ref "howto-secrets.md" %}})查看 Dapr 支持的所有密钥存储，以及有关如何配置和使用它们的信息。

## 引用密钥

虽然你可以选择使用纯文本密钥（如 MyPassword），如下面的 yaml 中 `redisPassword` 的 `value` 所示，但不建议在生产环境中这样做：

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: MyPassword
```

相反，你应在密钥存储中创建密钥并在组件定义中引用它。下面显示了两种情况——"密钥包含嵌入的键"和"密钥是字符串"。

"密钥包含嵌入的键"的情况适用于密钥中嵌入有键的情况，即密钥**不是**完整的连接字符串。这在以下组件定义 yaml 中显示。

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key:  redis-password
auth:
  secretStore: <SECRET_STORE_NAME>
```

`SECRET_STORE_NAME` 是配置的[密钥存储组件]({{% ref supported-secret-stores %}})的名称。在 Kubernetes 中运行并使用 Kubernetes 密钥存储时，字段 `auth.SecretStore` 默认为 `kubernetes`，可以留空。

上面的组件定义告诉 Dapr 从定义的 `secretStore` 中提取名为 `redis-secret` 的密钥，并将嵌入在密钥中的 `redis-password` 键关联的值分配给组件中的 `redisPassword` 字段。这种情况的一个用途是当你的代码正在构造连接字符串时，例如将 URL、密钥以及其他必要的信息组合成一个字符串。

另一方面，下面的"密钥是字符串"的情况适用于密钥中没有嵌入键的情况。相反，密钥只是一个字符串。因此，在 `secretKeyRef` 部分中，密钥 `name` 和密钥 `key` 将是相同的。这种情况适用于密钥本身是一个完整的连接字符串，没有嵌入的需要提取其值的键的情况。通常，连接字符串由连接信息、某种允许连接的密钥，可能还有其他信息组成，不需要单独的"密钥"。这种情况在以下组件定义 yaml 中显示。

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: servicec-inputq-azkvsecret-asbqueue
spec:
  type: bindings.azure.servicebusqueues
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: asbNsConnString
      key: asbNsConnString
  - name: queueName
    value: servicec-inputq
auth:
  secretStore: <SECRET_STORE_NAME>
```
上面的"密钥是字符串"情况 yaml 告诉 Dapr 从定义的 `secretStore` 中提取名为 `asbNsConnstring` 的连接字符串，并将该值分配给组件中的 `connectionString` 字段，因为 `secretStore` 中的"密钥"中没有嵌入键，因为它是一个纯字符串。这要求密钥 `name` 和密钥 `key` 相同。

## 示例

### 引用 Kubernetes 密钥

以下示例向你展示如何创建 Kubernetes 密钥来保存 Event Hubs 绑定的连接字符串。

1. 首先，创建 Kubernetes 密钥：
    ```bash
    kubectl create secret generic eventhubs-secret --from-literal=connectionString=*********
    ```

2. 接下来，在你的绑定中引用密钥：
    ```yaml
    apiVersion: dapr.io/v1alpha1
    kind: Component
    metadata:
      name: eventhubs
    spec:
      type: bindings.azure.eventhubs
      version: v1
      metadata:
      - name: connectionString
        secretKeyRef:
          name: eventhubs-secret
          key: connectionString
    ```

3. 最后，将组件应用到 Kubernetes 集群：
    ```bash
    kubectl apply -f ./eventhubs.yaml
    ```

## 限制对密钥的访问

Dapr 可以使用其配置限制对密钥存储中的密钥的访问。阅读[操作指南：使用密钥范围]({{% ref "secrets-scopes.md" %}})和[操作指南：限制可以从密钥存储读取的密钥]({{% ref "secret-scope.md" %}})以获取更多信息。这是使用 Dapr 限制对密钥的访问的推荐方法。

## Kubernetes 权限

### 默认命名空间

在 Kubernetes 中运行时，Dapr 在安装期间为 `default` 命名空间中的 Kubernetes 密钥存储的密钥访问定义默认的 Role 和 RoleBinding。对于从 `default` 命名空间获取密钥的 Dapr 启用应用程序，可以定义密钥并在组件中引用它，如上面的示例所示。

### 非默认命名空间

如果你的 Dapr 启用应用程序使用的组件从非默认命名空间获取密钥，请将以下资源应用于该命名空间：

```yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: <NAMESPACE>
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]
---

kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: dapr-secret-reader
  namespace: <NAMESPACE>
subjects:
- kind: ServiceAccount
  name: default
roleRef:
  kind: Role
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

这些资源授予 Dapr 从 Role 和 RoleBinding 中定义的命名空间的 Kubernetes 密钥存储获取密钥的权限。

{{% alert title="注意" color="warning" %}}
在生产环境中，要将 Dapr 的访问限制为仅某些密钥资源，你可以使用 `resourceNames` 字段。有关进一步说明，请参阅此[链接](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#referring-to-resources)。
{{% /alert %}}

## 相关链接

- [使用密钥范围]({{% ref "secrets-scopes.md" %}})
- [限制可以从密钥存储读取的密钥]({{% ref "secret-scope.md" %}})
