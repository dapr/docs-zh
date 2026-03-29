---
type: docs
title: "状态存储组件规格"
linkTitle: "状态存储"
description: "与 Dapr 对接的受支持状态存储"
weight: 10000
aliases:
  - "/operations/components/setup-state-store/supported-state-stores/"
no_list: true
---

下表列出了 Dapr 状态管理构建块在不同级别上支持的状态存储。[了解如何为 Dapr 状态管理配置不同的状态存储。]({{% ref setup-state-store.md %}})

{{< partial "components/description.html" >}}

{{% alert title="注意" color="primary" %}}
如果状态存储同时支持事务操作和 ETag，则可用于 Actor。
{{% /alert %}}

{{< partial "components/state-stores.html" >}}
