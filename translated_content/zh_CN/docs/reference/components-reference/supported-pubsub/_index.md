---
type: docs
title: "发布订阅代理组件规范"
linkTitle: "发布订阅代理"
weight: 8000
description: 与 Dapr 接口的受支持的发布订阅代理
aliases:
  - "/operations/components/setup-pubsub/supported-pubsub/"
no_list: true
---

下表列出了 Dapr 发布订阅构建块支持的发布和订阅代理。[了解如何为 Dapr 发布和订阅设置不同的代理。]({{% ref setup-pubsub.md %}})

{{% alert title="发布订阅组件重试与入站弹性" color="warning" %}}
每个发布订阅组件都有自己的内置重试行为，这是消息代理解决方案特有的，与 Dapr 无关。在显式应用 [Dapr 弹性策略]({{% ref "resiliency-overview.md" %}}) 之前，请确保您了解所使用的发布订阅组件的隐式重试策略。Dapr 弹性不会覆盖这些内置重试，而是对其进行增强，这可能会导致消息的重复聚类。
{{% /alert %}}


{{< partial "components/description.html" >}}

{{< partial "components/pubsub.html" >}}
