---
type: docs
title: "Kubernetes ConfigMap"
linkTitle: "Kubernetes ConfigMap"
description: "Kubernetes ConfigMap 配置存储组件的详细信息"
---

## 组件格式

要设置 Kubernetes ConfigMap 配置存储，请创建一个类型为 `configuration.kubernetes` 的组件。关于如何创建并应用配置存储的配置，请参阅[本指南]({{% ref "howto-manage-configuration.md#configure-a-dapr-configuration-store" %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: configuration.kubernetes
  version: v1
  metadata:
  - name: configMapName
    value: "<CONFIGMAP_NAME>"
  # 可选：kubeconfig 文件的路径（仅在集群外运行时需要）
  #- name: kubeconfigPath
  #  value: "/path/to/kubeconfig"
  # 可选：informer 的重新同步周期
  #- name: resyncPeriod
  #  value: "0"
```

## Spec 元数据字段

| 字段 | 必填 | 说明 | 示例 |
|-------|:--------:|---------|---------|
| `configMapName` | Y | 用作配置来源的 Kubernetes ConfigMap 名称。必须是有效的 [RFC 1123](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#dns-label-names) DNS 标签名。 | `"my-app-config"` |
| `kubeconfigPath` | N | 指向 kubeconfig 文件的路径。在 Kubernetes 集群内运行（通常情况）时无需此项。在集群外运行时，它会依次回退到 `KUBECONFIG` 环境变量，再到 `~/.kube/config`。 | `"/path/to/kubeconfig"` |
| `resyncPeriod` | N | informer 多久从 API 服务器完整重新同步一次 ConfigMap 状态，作为一致性的安全兜底，与 watch 事件无关。设为 `"0"`（默认值）可关闭定期重新同步，仅依赖 watch 事件。 | `"10m"` |

## 将 Kubernetes ConfigMap 设置为配置存储

Kubernetes ConfigMap 配置存储除 Kubernetes 集群本身外，不需要任何外部基础设施。

### 前提条件

- 正在运行的 Kubernetes 集群
- Dapr 边车必须具有 RBAC 权限，可以在目标命名空间中 `get`、`list` 和 `watch` ConfigMap

### 1. 创建 ConfigMap

创建一个用于保存配置数据的 ConfigMap：

```bash
kubectl create configmap my-app-config \
  --from-literal=log.level=info \
  --from-literal=feature.enable-v2=true \
  --from-literal=database.pool-size=10
```

或者使用 YAML 清单：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
  namespace: default
data:
  log.level: "info"
  feature.enable-v2: "true"
  database.pool-size: "10"
```

### 2. 配置 RBAC

Dapr 边车的服务账号需要访问 ConfigMap 的权限。创建 Role 和 RoleBinding：

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dapr-configmap-reader
  namespace: default
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dapr-configmap-reader-binding
  namespace: default
subjects:
- kind: ServiceAccount
  name: default
  namespace: default
roleRef:
  kind: Role
  name: dapr-configmap-reader
  apiGroup: rbac.authorization.k8s.io
```

{{% alert title="注意" color="primary" %}}
如果你使用默认设置通过 Helm chart 安装了 Dapr，Dapr 边车的服务账号可能已经具有足够的权限。请验证你的集群的 RBAC 配置。
{{% /alert %}}

### 3. 应用组件

应用 Dapr 组件配置：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: myconfigstore
spec:
  type: configuration.kubernetes
  version: v1
  metadata:
  - name: configMapName
    value: "my-app-config"
```

## 工作原理

### 数据模型

ConfigMap 的 `data` 字段中的每个键都会成为一个配置项。ConfigMap 的 `resourceVersion`（由 Kubernetes 分配）会被用作所有配置项的版本。

同样支持 `binaryData` 字段中的键。其值以 base64 编码字符串的形式返回，并且配置项的元数据中包含 `"encoding": "base64"`。

### 订阅

当你订阅配置变更时，该组件会使用 [Kubernetes SharedIndexInformer](https://pkg.go.dev/k8s.io/client-go/tools/cache#SharedIndexInformer)，并通过字段选择器将范围限定在特定的 ConfigMap 上。这意味着：

- 只有被监视的 ConfigMap 的变更才会产生 API 流量
- 通过 Kubernetes watch API 可以近实时地检测到变更
- 更新通知中只包含发生变化的键

当某个键从 ConfigMap 中被删除时，通知中该配置项的元数据会包含 `"deleted": "true"`，且值为空。

### 命名空间

该组件监视与 Dapr 边车位于同一命名空间中的 ConfigMap。命名空间取自 `NAMESPACE` 环境变量，该变量由 Dapr 边车注入器通过 Kubernetes downward API 自动设置。如果未设置该变量，组件默认使用 `"default"`。

不支持跨命名空间访问 ConfigMap。这是有意为之，以维护 Kubernetes 命名空间的安全边界。

{{% alert title="注意" color="primary" %}}
在 Kubernetes 中，ConfigMap 默认不会静态加密。不要在 ConfigMap 中存储敏感值（密码、API 密钥、令牌）。请改用 [Kubernetes secrets]({{% ref "kubernetes-secret-store" %}})或专用的 secret store。
{{% /alert %}}

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [配置构建块]({{% ref configuration-api-overview %}})
- 阅读[操作指南：从存储管理配置]({{% ref "howto-manage-configuration" %}})，了解如何使用配置存储。
- [Kubernetes ConfigMap 文档](https://kubernetes.io/docs/concepts/configuration/configmap/)
