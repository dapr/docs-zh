---
type: docs
title: "操作指南：在 component 中引用 secrets"
linkTitle: "在 component 中引用 secrets"
weight: 500
description: "如何安全地从 component 定义中引用 secrets"
---

## 概述

component 可以为 `spec.metadata` 部分引用 secrets，该部分位于 component 定义之中。

要引用 secret，你需要设置 `auth.secretStore` 字段，以指定保存这些 secrets 的 secret store 的名称。

在 Kubernetes 中运行时，如果 `auth.secretStore` 为空，则假定使用 Kubernetes secret store。

### 支持的 secret stores

访问[此链接]({{% ref "howto-secrets.md" %}})，可以查看 Dapr 支持的所有 secret stores，以及有关如何配置和使用它们的信息。

## 引用 secrets

虽然你可以选择使用纯文本 secrets（如 MyPassword），如下面 yaml 中 `redisPassword` 的 `value` 所示，但不建议在生产环境中这样做：

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

相反，你应在 secret store 中创建 secret，并在 component 定义中引用它。下面展示了两种情况：“Secret contains an embedded key” 和 “Secret is a string”。

“Secret contains an embedded key” 适用于 secret 中嵌入了键的情况，即 secret **不是**完整的连接字符串。以下 component 定义 yaml 展示了这种情况。

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

`SECRET_STORE_NAME` 是已配置的 [secret store component]({{% ref supported-secret-stores %}}) 的名称。在 Kubernetes 中运行并使用 Kubernetes secret store 时，字段 `auth.SecretStore` 默认为 `kubernetes`，可以留空。

上面的 component 定义告诉 Dapr 从已定义的 `secretStore` 中提取名为 `redis-secret` 的 secret，并将 secret 中嵌入的 `redis-password` 键所关联的值赋给 component 中的 `redisPassword` 字段。这种情况的一个用途是：当你的代码正在构造连接字符串时，例如把 URL、secret 以及其他必要信息组合成一个字符串。

另一方面，下面的 “Secret is a string” 适用于 secret 中没有嵌入键的情况。相反，secret 只是一个字符串。因此，在 `secretKeyRef` 部分中，secret 的 `name` 和 `key` 将是相同的。这种情况适用于 secret 本身就是完整连接字符串、其中没有需要提取的嵌入键的情况。通常，连接字符串由连接信息、某种允许连接的 secret，以及可能的其他信息组成，不需要单独的“secret”。以下 component 定义 yaml 展示了这种情况。

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

上面 “Secret is a string” 情况的 yaml 告诉 Dapr 从已定义的 `secretStore` 中提取名为 `asbNsConnstring` 的连接字符串，并将其值赋给 component 中的 `connectionString` 字段。由于 `secretStore` 中的 secret 是纯字符串，其中没有嵌入键，因此这要求 secret 的 `name` 与 `key` 相同。

## 示例

### 引用 Kubernetes secret

以下示例展示了如何创建 Kubernetes secret，以保存 Event Hubs binding 的连接字符串。

1. 首先，创建 Kubernetes secret：
    ```bash
    kubectl create secret generic eventhubs-secret --from-literal=connectionString=*********
    ```

2. 接下来，在你的 binding 中引用该 secret：
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

3. 最后，将 component 应用到 Kubernetes 集群：
    ```bash
    kubectl apply -f ./eventhubs.yaml
    ```

## 更新被引用的 secrets

每次协调（每 60 秒）时，Dapr 都会重新解析 component 通过 `secretKeyRef` 引用的 secrets，并将其与正在运行的 component 进行比较。当被引用的 secret 的值发生变化时，[热重载]({{% ref "component-updates.md#hot-reloading" %}})会关闭该 component，并使用新值重新初始化它。无需重启应用的 Pod 或 Dapr sidecar，component manifest 也无需修改。

这一行为适用于所有 secret store。对于内置的 `kubernetes` secret store，由 Dapr operator 解析引用。对于其他 store，例如通过 `auth.secretStore` 配置的 HashiCorp Vault 或 Azure Key Vault，则由 sidecar 直接解析。两种情况下的行为和时机相同。

{{% alert title="注意" color="primary" %}}
依赖这一行为时，请注意以下几点：
- secret 值的变更由周期性协调器处理，因此新值最长可能需要 60 秒才能生效。
- component 在被关闭并重新初始化期间会短暂不可用。
- 这需要启用[热重载]({{% ref "component-updates.md#hot-reloading" %}})，该特性默认启用。如果禁用了 `HotReload` 特性，则只有在 Dapr sidecar 重启后才会感知 secret 的变更。
- Workflow 后端被[排除在热重载之外]({{% ref "component-updates.md#components-and-subscriptions" %}})，不会感知 secret 的变更，需要重启 Dapr sidecar。在 Dapr 1.18.2 及更早版本中，actor state store 同样被排除在外；自 Dapr 1.18.3 起，actor state store 与其他 component 一样会被重新加载，secret rotation 会替换 store 实例，且不会中断 Actor 托管。

{{% /alert %}}

## 限制对 secrets 的访问

Dapr 可以通过其配置限制对 secret store 中 secrets 的访问。有关更多信息，请阅读[操作指南：使用 secret scoping]({{% ref "secrets-scopes.md" %}})和[操作指南：限制可以从 secret stores 读取的 secrets]({{% ref "secret-scope.md" %}})。这是使用 Dapr 限制 secrets 访问的推荐方法。

## Kubernetes 权限

### 默认 namespace

在 Kubernetes 中运行时，Dapr 在安装期间会为 `default` namespace 中 Kubernetes secret store 的 secret 访问定义默认的 Role 和 RoleBinding。对于从 `default` namespace 获取 secrets 的、启用了 Dapr 的应用，可以像上面的示例那样定义 secret，并在 component 中引用它。

### 非默认 namespace

如果启用了 Dapr 的应用所使用的 component 需要从非默认 namespace 获取 secrets，请将以下资源应用到该 namespace：

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

这些资源授予 Dapr 从 Role 和 RoleBinding 中定义的 namespace 内的 Kubernetes secret store 获取 secrets 的权限。

{{% alert title="注意" color="warning" %}}
在生产环境中，如果要将 Dapr 的访问仅限制在某些 secret 资源上，可以使用 `resourceNames` 字段。进一步的说明请参阅此[链接](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#referring-to-resources)。
{{% /alert %}}

## 相关链接

- [使用 secret scoping]({{% ref "secrets-scopes.md" %}})
- [限制可以从 secret stores 读取的 secrets]({{% ref "secret-scope.md" %}})
