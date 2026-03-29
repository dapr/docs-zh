---
type: docs
title: "发布订阅代理"
linkTitle: "发布订阅代理"
description: "为 Dapr 发布订阅配置不同消息代理的指南"
weight: 700
aliases:
  - "/operations/components/setup-pubsub/setup-pubsub-overview/"
---

Dapr 与发布订阅消息总线集成，为应用程序提供创建事件驱动、松耦合架构的能力，在这种架构中，生产者通过主题向消费者发送事件。

Dapr 支持为每个应用配置多个命名的发布订阅组件。每个发布订阅组件都有一个名称，在发布消息主题时会使用该名称。有关如何发布和订阅主题的详细信息，请参阅 [API 参考]({{% ref pubsub_api.md %}})。

发布订阅组件是可扩展的。支持的发布订阅组件列表可以在[这里]({{% ref supported-pubsub %}})找到，实现可以在 [components-contrib 仓库](https://github.com/dapr/components-contrib)中找到。

## 组件文件

发布订阅通过 `Component` 文件进行描述：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.<NAME>
  version: v1
  metadata:
  - name: <KEY>
    value: <VALUE>
  - name: <KEY>
    value: <VALUE>
...
```

发布订阅的类型由 `type` 字段决定，连接字符串等属性和其他元数据放置在 `.metadata` 部分。
尽管元数据值可以明文形式包含密钥，但建议您使用 `secretKeyRef` 来引用[密钥存储]({{% ref component-secrets.md %}})。

{{% alert title="主题创建" color="primary" %}}
根据您使用的发布订阅消息总线及其配置方式，主题可能会自动创建。即使消息总线支持自动主题创建，在生产环境中禁用它也是常见的治理实践。您可能仍需要使用 CLI、管理控制台或申请表单来手动创建应用程序所需的主题。
{{% /alert %}}

虽然所有发布订阅组件都支持 `consumerID` 元数据，但如果您不提供，运行时会创建一个消费者 ID。所有组件元数据字段值都可以携带[模板化元数据值]({{% ref "component-schema.md#templated-metadata-values" %}})，这些值在 Dapr 边车启动时解析。
例如，您可以选择使用 `{namespace}` 作为 `consumerGroup`，以便在不同命名空间中使用相同的 `appId` 和相同的主题，如[本文]({{% ref "howto-namespace.md#with-namespace-consumer-groups"%}})所述。

访问[本指南]({{% ref "howto-publish-subscribe.md#step-3-publish-a-topic" %}})以获取配置和使用发布订阅组件的说明。

## 相关链接

- Dapr [发布订阅构建块]({{% ref pubsub-overview.md %}})概述
- 尝试[发布订阅快速入门示例](https://github.com/dapr/quickstarts/tree/master/tutorials/pub-sub)
- 阅读[发布和订阅指南]({{% ref howto-publish-subscribe.md %}})
- 了解[主题作用域]({{% ref pubsub-scopes.md %}})
- 了解[消息生存时间]({{% ref pubsub-message-ttl.md %}})
- 学习[如何为发布订阅组件配置多个命名空间]({{% ref pubsub-namespaces.md %}})
- [发布订阅组件]({{% ref supported-pubsub %}})列表
- 阅读 [API 参考]({{% ref pubsub_api.md %}})
