---
type: docs
title: "Kubernetes Events 绑定规范"
linkTitle: "Kubernetes Events"
description: "Kubernetes Events 绑定组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/kubernetes-binding/"
---

## 组件格式

要设置 Kubernetes Events 绑定，需创建类型为 `bindings.kubernetes` 的组件。有关如何创建和应用绑定配置，请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.kubernetes
  version: v1
  metadata:
  - name: namespace
    value: "<NAMESPACE>"
  - name: resyncPeriodInSec
    value: "<seconds>"
  - name: direction
    value: "input"
```

## 规范元数据字段

| 字段              | 是否必填 | 绑定支持 | 详细信息 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `namespace` | Y | Input  | 从指定 Kubernetes 命名空间读取事件 | `"default"` |
| `resyncPeriodInSec` | N | Input | 从 Kubernetes API 服务器刷新事件列表的时间间隔。默认值为 `"10"` | `"15"`
| `direction` | N | Input | 绑定的数据流向方向 | `"input"`
| `kubeconfigPath` | N | Input | kubeconfig 文件的路径。如未指定，绑定将使用默认的集群内配置 | `"/path/to/kubeconfig"`

## 绑定支持

此组件支持 **输入** 绑定接口。

## 输出格式

绑定接收到的输出格式为 `bindings.ReadResponse`，其中 `Data` 字段包含如下结构：

```json
 {
   "event": "",
   "oldVal": {
     "metadata": {
       "name": "hello-node.162c2661c524d095",
       "namespace": "kube-events",
       "selfLink": "/api/v1/namespaces/kube-events/events/hello-node.162c2661c524d095",
       ...
     },
     "involvedObject": {
       "kind": "Deployment",
       "namespace": "kube-events",
       ...
     },
     "reason": "ScalingReplicaSet",
     "message": "Scaled up replica set hello-node-7bf657c596 to 1",
     ...
   },
   "newVal": {
     "metadata": { "creationTimestamp": "null" },
     "involvedObject": {},
     "source": {},
     "firstTimestamp": "null",
     "lastTimestamp": "null",
     "eventTime": "null",
     ...
   }
 }
```

提供三种事件类型：
- 添加：仅填充 `newVal` 字段，`oldVal` 字段为空的 `v1.Event`，`event` 值为 `add`
- 删除：仅填充 `oldVal` 字段，`newVal` 字段为空的 `v1.Event`，`event` 值为 `delete`
- 更新：同时填充 `oldVal` 和 `newVal` 字段，`event` 值为 `update`

## 必需权限

要从 Kubernetes 使用 `events`，需通过 Kubernetes 的 [RBAC Auth] 机制为用户/组/服务账户分配权限。

### 角色

需要包含以下规则之一，以授予 `get`、`watch` 和 `list` `events` 的权限。API 组可根据需要设置为尽可能受限。

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: <ROLENAME>
rules:
- apiGroups: [""]
  resources: ["events"]
  verbs: ["get", "watch", "list"]
```

### RoleBinding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: <NAME>
subjects:
- kind: ServiceAccount
  name: default # 可根据需要修改
roleRef:
  kind: Role
  name: <ROLENAME> # 与上述名称一致
  apiGroup: ""
```

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [Bindings 构建块]({{% ref bindings %}})
- [操作指南：通过输入绑定触发应用]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
