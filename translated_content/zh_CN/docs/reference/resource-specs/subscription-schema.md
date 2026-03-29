---
type: docs
title: "Subscription 规范"
linkTitle: "Subscription"
weight: 2000
description: "Dapr subscription 的基本规范"
---

`Subscription` Dapr 资源允许你使用外部组件 YAML 文件以声明方式订阅 topic。

{{% alert title="注意" color="primary" %}}
任何 subscription 都可以限制到特定的 [namespace]({{% ref isolation-concept.md %}})，并通过 scopes 限制对特定应用程序集的访问。
{{% /alert %}}

本指南演示了两个 subscription API 版本：

- `v2alpha1`（默认规范）
- `v1alpha1`（已弃用）

## `v2alpha1` 格式

以下是 `Subscription` 资源的基本 `v2alpha1` 规范。`v2alpha1` 是 subscription API 的默认规范。

```yml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: <REPLACE-WITH-NAME>
spec:
  topic: <REPLACE-WITH-TOPIC-NAME> # Required
  routes: # Required
    rules:
      - match: <REPLACE-WITH-CEL-FILTER>
        path: <REPLACE-WITH-PATH>
  pubsubname: <REPLACE-WITH-PUBSUB-NAME> # Required
  deadLetterTopic: <REPLACE-WITH-DEADLETTERTOPIC-NAME> # Optional
  bulkSubscribe: # Optional
    enabled: <REPLACE-WITH-BOOLEAN-VALUE>
    maxMessagesCount: <REPLACE-WITH-VALUE>
    maxAwaitDurationMs: <REPLACE-WITH-VALUE>
  metadata: <REPLACE-WITH-METADATA-OBJECT> # Optional
scopes:
- <REPLACE-WITH-SCOPED-APPIDS>
```

### Spec 字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| topic | Y | 组件订阅的 topic 名称。 | `orders` |
| routes | Y | 此 topic 的路由配置，包括指定将消息发送到特定路径的条件。包含以下字段： <br><ul><li>match：用于匹配事件的 CEL 表达式。如果未指定，该路由被视为默认路由。 </li><li>path：匹配此规则的事件的路径。 </li></ul>所有 topic 消息发送到的端点。 | `match: event.type == "widget"` <br>`path: /widgets` |
| pubsubname | N | 你的发布订阅组件的名称。 | `pubsub` |
| deadLetterTopic | N | 转发不可传递消息的死信 topic 名称。 | `poisonMessages` |
| bulkSubscribe | N | 启用批量订阅属性。 | `true`, `false` |
| metadata | N | 设置订阅元数据。 | `{"key": "value"}` |


## `v1alpha1` 格式

以下是 `Subscription` 资源的基本 `v1alpha1` 版本规范。`v1alpha1` 现已弃用。

```yml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: <REPLACE-WITH-RESOURCE-NAME>
spec:
  topic: <REPLACE-WITH-TOPIC-NAME> # Required
  route: <REPLACE-WITH-ROUTE-NAME> # Required
  pubsubname: <REPLACE-WITH-PUBSUB-NAME> # Required
  deadLetterTopic: <REPLACE-WITH-DEAD-LETTER-TOPIC-NAME> # Optional
  metadata: <REPLACE-WITH-METADATA-OBJECT> # Optional
  bulkSubscribe: # Optional
  - enabled: <REPLACE-WITH-BOOLEAN-VALUE>
  - maxMessagesCount: <REPLACE-WITH-VALUE>
  - maxAwaitDurationMs: <REPLACE-WITH-VALUE>
scopes:
- <REPLACE-WITH-SCOPED-APPIDS>
```

### Spec 字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| topic | Y | 组件订阅的 topic 名称。 | `orders` |
| route | Y | 所有 topic 消息发送到的端点。 | `/checkout` |
| pubsubname | N | 你的发布订阅组件的名称。 | `pubsub` |
| deadlettertopic | N | 转发不可传递消息的死信 topic 名称。 | `poisonMessages` |
| metadata | N | 设置订阅元数据。 | `{"key": "value"}` |
| bulksubscribe | N | 启用批量订阅属性。 | `true`, `false` |

## 相关链接
- [了解有关声明式订阅方法的更多信息]({{% ref "subscription-methods.md#declarative-subscriptions" %}})
- [了解有关死 letter topic 的更多信息]({{% ref pubsub-deadletter.md %}})
- [了解有关路由消息的更多信息]({{% ref "howto-route-messages.md#declarative-subscription" %}})
- [了解有关批量订阅的更多信息]({{% ref pubsub-bulk.md %}})
