---
type: docs
title: "Dapr secrets JavaScript SDK"
linkTitle: "secrets"
weight: 180300
description: 使用 Dapr JavaScript SDK 检索单个 secrets 和批量 secrets
---

在 JavaScript 或 TypeScript 中，使用 `DaprClient.secret` 从已配置的 Dapr secret store 中检索 secrets。该 SDK 提供通过 HTTP 和 gRPC 检索单个 secrets 和批量 secrets 的功能，但不提供创建、更新、删除或监听 secrets 的方法。

这些指南面向 `@dapr/dapr` 3.19.0 或更高版本。secrets 使用稳定的 Dapr secrets API；它并不是随 SDK 3.19 引入的新 building block。

请按照[操作指南]({{% ref js-secrets-howto.md %}})完成本地设置与检索。有关配置、响应结构、metadata、协议限制和错误，请参阅[客户端使用指南]({{% ref js-secrets-client-usage.md %}})。

{{% alert title="HTTP 与 gRPC 的差异" color="warning" %}}
在 SDK 3.19.0 中，gRPC 单个 secrets 的实现会忽略 metadata，并且只返回多值 secrets 中的第一个键值对。如果需要按请求传递 metadata，或需要获取单个 secrets 的全部值，请使用 HTTP。批量检索在两种协议下都会保留嵌套值，但两种协议都不接受通过 SDK 传递的批量 metadata。
{{% /alert %}}

参阅[secrets building block 概述]({{% ref secrets-overview.md %}})和[受支持的 secret store]({{% ref supported-secret-stores %}})，了解运行时功能和特定组件的要求。
