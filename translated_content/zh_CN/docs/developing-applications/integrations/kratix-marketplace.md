---
type: docs
title: "如何：与 Kratix 集成"
linkTitle: "Kratix Marketplace"
weight: 8000
description: "使用 Dapr promise 与 Kratix 集成"
---

作为 [Kratix Marketplace](https://docs.kratix.io/marketplace) 的一部分，Dapr 可用于构建满足您需求的定制平台。

{{% alert title="注意" color="warning" %}}
Dapr Helm chart 会生成静态公私钥对，并发布在仓库中。此 promise 应仅_本地_用于演示目的。如果您希望将此 promise 用于演示以外的用途，建议使用您自己的凭证密钥手动更新 promise 中的所有密钥。
{{% /alert %}}

只需安装 Dapr Promise 即可开始使用，它会在所有匹配的集群上安装 Dapr。

{{< button text="安装 Dapr Promise" link="https://github.com/syntasso/kratix-marketplace/tree/main/dapr" >}}
