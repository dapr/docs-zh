---
type: docs
title: "如何与 Kratix 集成"
linkTitle: "Kratix Marketplace"
weight: 8000
description: "使用 Dapr Promise 与 Kratix 集成"
aliases:
  - /zh-hans/developing-applications/integrations/kratix-marketplace/
---

作为 [Kratix Marketplace](https://docs.kratix.io/marketplace) 的一部分，Dapr 可用于构建根据你的需求量身定制的平台。

{{% alert title="注意" color="warning" %}}
Dapr Helm chart 会生成静态的公钥与私钥对，并发布在仓库中。该 promise 只应 _在本地_ 用于演示目的。如果你希望将该 promise 用于演示以外的场景，建议使用你自己的凭据手动更新 promise 中的所有机密。
{{% /alert %}}

只需安装 Dapr Promise 即可开始使用，它会在所有匹配的集群上安装 Dapr。

{{< button text="安装 Dapr Promise" link="https://github.com/syntasso/kratix-marketplace/tree/main/dapr" >}}
