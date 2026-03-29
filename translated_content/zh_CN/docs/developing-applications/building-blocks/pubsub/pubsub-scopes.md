---
type: docs
title: "限制发布订阅主题访问"
linkTitle: "限制主题访问"
weight: 6000
description: "使用范围将发布订阅主题限定到特定应用程序"
---

## 简介

[命名空间或组件范围]({{% ref component-scopes %}}) 可用于将组件访问限制到特定应用程序。添加到组件的这些应用程序范围仅允许具有特定 ID 的应用程序使用该组件。

除了此常规组件范围外，发布订阅组件还可以限制以下内容：
- 可使用哪些主题（发布或订阅）
- 允许哪些应用程序向特定主题发布
- 允许哪些应用程序订阅特定主题

这称为**发布订阅主题范围**。

发布订阅范围是为每个发布订阅组件定义的。您可能有一个名为 `pubsub` 的发布订阅组件，它具有一组范围，而另一个 `pubsub2` 具有不同的范围。

要使用此主题范围，可以为发布订阅组件设置三个元数据属性：
- `spec.metadata.publishingScopes`
  - 以分号分隔的应用程序列表和以逗号分隔的主题列表，允许该应用程序向该主题列表发布
  - 如果在 `publishingScopes` 中未指定任何内容（默认行为），则所有应用程序都可以向所有主题发布
  - 要拒绝应用程序向任何主题发布的能力，请将主题列表留空（`app1=;app2=topic2`）
  - 例如，`app1=topic1;app2=topic2,topic3;app3=` 将允许 app1 向 topic1 发布，而不允许向其他主题发布；app2 仅向 topic2 和 topic3 发布；app3 不向任何主题发布
- `spec.metadata.subscriptionScopes`
  - 以分号分隔的应用程序列表和以逗号分隔的主题列表，允许该应用程序订阅该主题列表
  - 如果在 `subscriptionScopes` 中未指定任何内容（默认行为），则所有应用程序都可以订阅所有主题
  - 例如，`app1=topic1;app2=topic2,topic3` 将允许 app1 仅订阅 topic1，app2 订阅 topic2 和 topic3
- `spec.metadata.allowedTopics`
  - 所有应用程序的允许主题的逗号分隔列表。
  - 如果未设置 `allowedTopics`（默认行为），则所有主题均有效。如果存在 `subscriptionScopes` 和 `publishingScopes`，它们仍然生效。
  - `publishingScopes` 或 `subscriptionScopes` 可与 `allowedTopics` 结合使用以添加精细限制
- `spec.metadata.protectedTopics`
  - 所有应用程序的受保护主题的逗号分隔列表。
  - 如果某个主题被标记为受保护，则应用程序必须通过 `publishingScopes` 或 `subscriptionScopes` 显式授予发布或订阅权限才能发布/订阅该主题。

这些元数据属性可用于所有发布订阅组件。以下示例使用 Redis 作为发布订阅组件。

## 示例 1：限制主题访问

如果您有包含敏感信息的主题，并且只允许您的应用程序的一个子集发布或订阅这些主题，那么限制哪些应用程序可以发布/订阅主题会很有用。

它还可以用于所有主题，以始终拥有哪些应用程序作为发布者/订阅者使用哪些主题的"真实来源"。

以下是三个应用程序和三个主题的示例：
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisPassword
    value: ""
  - name: publishingScopes
    value: "app1=topic1;app2=topic2,topic3;app3="
  - name: subscriptionScopes
    value: "app2=;app3=topic1"
```

下表显示了允许哪些应用程序向主题发布：

|      | topic1 | topic2 | topic3 |
|------|--------|--------|--------|
| app1 | ✅     |        |        |
| app2 |        | ✅     | ✅     |
| app3 |        |        |        |

下表显示了允许哪些应用程序订阅主题：

|      | topic1 | topic2 | topic3 |
|------|--------|--------|--------|
| app1 | ✅     | ✅     | ✅     |
| app2 |        |        |        |
| app3 | ✅     |        |        |

> 注意：如果未列出应用程序（例如 subscriptionScopes 中的 app1），则允许它订阅所有主题。由于未使用 `allowedTopics` 且 app1 没有任何订阅范围，因此它也可以使用上面未列出的其他主题。

## 示例 2：限制允许的主题

如果 Dapr 应用程序向主题发送消息，则会创建该主题。在某些情况下，应该控制此主题创建。例如：
- Dapr 应用程序中生成主题名称的 bug 可能导致创建无限数量的主题
- 精简主题名称和总数，并防止主题无限增长

在这些情况下，可以使用 `allowedTopics`。

以下是三个允许主题的示例：
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisPassword
    value: ""
  - name: allowedTopics
    value: "topic1,topic2,topic3"
```

所有应用程序都可以使用这些主题，但只能使用这些主题，不允许使用其他主题。

## 示例 3：结合 `allowedTopics` 和范围

有时您希望结合这两种范围，从而只有一组固定的允许主题并指定对特定应用程序的范围。

以下是三个应用程序和两个主题的示例：
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisPassword
    value: ""
  - name: allowedTopics
    value: "A,B"
  - name: publishingScopes
    value: "app1=A"
  - name: subscriptionScopes
    value: "app1=;app2=A"
```

> 注意：第三个应用程序未列出，因为如果应用程序未在范围内指定，则允许它使用所有主题。

下表显示了允许哪个应用程序向主题发布：

|      | A | B | C |
|------|---|---|---|
| app1 | ✅ |   |   |
| app2 | ✅ | ✅ |   |
| app3 | ✅ | ✅ |   |

下表显示了允许哪个应用程序订阅主题：

|      | A | B | C |
|------|---|---|---|
| app1 |   |   |   |
| app2 | ✅ |   |   |
| app3 | ✅ | ✅ |   |

## 示例 4：将主题标记为受保护

如果您的主题涉及敏感数据，则必须在 `publishingScopes` 和 `subscriptionScopes` 中显式列出每个新应用程序，以确保它无法从该主题读取或向其写入。或者，您可以将主题指定为"受保护"（使用 `protectedTopics`）并仅授予真正需要它的特定应用程序的访问权限。

以下是三个应用程序和三个主题的示例，其中两个是受保护的：
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisPassword
    value: ""
  - name: protectedTopics
    value: "A,B"
  - name: publishingScopes
    value: "app1=A,B;app2=B"
  - name: subscriptionScopes
    value: "app1=A,B;app2=B"
```

在上面的示例中，主题 A 和 B 被标记为受保护。因此，即使 `app3` 未在 `publishingScopes` 或 `subscriptionScopes` 下列出，它也无法与这些主题交互。

下表显示了允许哪个应用程序向主题发布：

|      | A | B | C |
|------|---|---|---|
| app1 | ✅ | ✅ |   |
| app2 |   | ✅ |   |
| app3 |   |   | ✅ |

下表显示了允许哪个应用程序订阅主题：

|      | A | B | C |
|------|---|---|---|
| app1 | ✅ | ✅ |   |
| app2 |   | ✅ |   |
| app3 |   |   | ✅ |


## 演示

{{< youtube id=7VdWBBGcbHQ start=513 >}}

## 后续步骤

- 了解[如何使用多个命名空间配置发布订阅组件]({{% ref pubsub-namespaces %}})
- 了解[消息存活时间]({{% ref pubsub-message-ttl %}})
- [发布订阅组件]({{% ref supported-pubsub %}}) 列表
- 阅读 [API 参考]({{% ref pubsub_api %}})
