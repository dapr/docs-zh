---
type: docs
title: "操作指南：在 Dapr 边车上选择性地启用 Dapr API"
linkTitle: "Dapr API 允许列表"
weight: 4500
description: "选择哪些 Dapr 边车 API 可用于应用"
---

在零信任网络等场景中，或通过前端将 Dapr 边车暴露给外部流量时，建议只启用应用使用的 Dapr 边车 API。这样做可以减少攻击面，并有助于将 Dapr API 限制在应用程序的实际需求范围内。

Dapr 允许您通过使用 [Dapr Configuration]({{% ref "configuration-schema.md" %}}) 设置 API 允许列表或拒绝列表来控制哪些 API 可供应用程序访问。

### 默认行为

如果未指定 API 允许列表或拒绝列表，默认行为是允许访问所有 Dapr API。

- 如果您仅定义了拒绝列表，则除拒绝列表中定义的 API 外，所有 Dapr API 均被允许
- 如果您仅定义了允许列表，则仅允许允许列表中列出的 Dapr API
- 如果您同时定义了允许列表和拒绝列表，则对于两者中都定义的 API，拒绝列表会覆盖允许列表
- 如果两者都未定义，则允许所有 API

例如，以下配置为 HTTP 和 gRPC 启用了所有 API：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: myappconfig
  namespace: default
spec:
  tracing:
    samplingRate: "1"
```

### 使用允许列表

#### 启用特定 HTTP API

以下示例启用了状态 `v1.0` HTTP API 并阻止所有其他 HTTP API：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: myappconfig
  namespace: default
spec:
  api:
    allowed:
      - name: state
        version: v1.0
        protocol: http
```

#### 启用特定 gRPC API

以下示例启用了状态 `v1` gRPC API 并阻止所有其他 gRPC API：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: myappconfig
  namespace: default
spec:
  api:
    allowed:
      - name: state
        version: v1
        protocol: grpc
```

### 使用拒绝列表

#### 禁用特定 HTTP API

以下示例禁用了状态 `v1.0` HTTP API，允许所有其他 HTTP API：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: myappconfig
  namespace: default
spec:
  api:
    denied:
      - name: state
        version: v1.0
        protocol: http
```

#### 禁用特定 gRPC API

以下示例禁用了状态 `v1` gRPC API，允许所有其他 gRPC API：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: myappconfig
  namespace: default
spec:
  api:
    denied:
      - name: state
        version: v1
        protocol: grpc
```

### Dapr API 列表

`name` 字段接受您要启用的 Dapr API 的名称。

请参阅对应不同 Dapr API 的值列表：

| API 组 | HTTP API | [gRPC API](https://github.com/dapr/dapr/tree/master/pkg/api/grpc) |
| ----- | ----- | ----- |
| [服务调用]({{% ref service_invocation_api.md %}}) | `invoke` (`v1.0`) | `invoke` (`v1`) |
| [状态]({{% ref state_api.md%}})| `state` (`v1.0` 和 `v1.0-alpha1`) | `state` (`v1` 和 `v1alpha1`) |
| [发布订阅]({{% ref pubsub.md %}}) | `publish` (`v1.0` 和 `v1.0-alpha1`) | `publish` (`v1` 和 `v1alpha1`) |
| [输出绑定]({{% ref bindings_api.md %}})  | `bindings` (`v1.0`) |`bindings` (`v1`) |
| 订阅 | n/a | `subscribe` (`v1alpha1`) |
| [密钥]({{% ref secrets_api.md %}})| `secrets` (`v1.0`) | `secrets` (`v1`) |
| [Actor]({{% ref actors_api.md %}}) | `actors`  (`v1.0`) |`actors` (`v1`) |
| [元数据]({{% ref metadata_api.md %}}) | `metadata` (`v1.0`) |`metadata` (`v1`) |
| [配置]({{% ref configuration_api.md %}}) | `configuration` (`v1.0` 和 `v1.0-alpha1`) | `configuration` (`v1` 和 `v1alpha1`) |
| [分布式锁]({{% ref distributed_lock_api.md %}}) | `lock` (`v1.0-alpha1`)<br/>`unlock` (`v1.0-alpha1`) | `lock` (`v1alpha1`)<br/>`unlock` (`v1alpha1`) |
| [加密]({{% ref cryptography_api.md %}}) | `crypto` (`v1.0-alpha1`) | `crypto` (`v1alpha1`) |
| [工作流]({{% ref workflow_api.md %}}) | `workflows` (`v1.0`) |`workflows` (`v1`) |
| [对话]({{% ref conversation_api.md %}}) | `conversation` (`v1.0-alpha1`) | `conversation` (`v1alpha1`) |
| [健康检查]({{% ref health_api.md %}}) | `healthz`  (`v1.0`) | n/a |
| 关闭 | `shutdown` (`v1.0`) | `shutdown` (`v1`) |

## 后续步骤

{{< button text="配置 Dapr 使用 gRPC" page="grpc.md" >}}
