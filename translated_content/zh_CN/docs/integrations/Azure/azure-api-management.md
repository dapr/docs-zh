---
type: docs
title: "Azure API Management 的 Dapr 集成策略"
linkTitle: "Azure API Management"
description: "通过 Azure API Management 策略发布 Dapr 服务与组件的 API"
weight: 2000
aliases:
  - /zh-hans/developing-applications/integrations/azure/azure-api-management/
---

[Azure API Management](https://learn.microsoft.com/azure/api-management/api-management-key-concepts) 是一种为后端服务（包括使用 Dapr 构建的服务）创建一致且现代的 API gateway 的方式。你可以在自托管的 API Management gateway 中启用 Dapr 支持，使其能够：
- 将请求转发到 Dapr 服务
- 向 Dapr pub/sub 主题发送消息
- 触发 Dapr output binding

试用 [Dapr & Azure API Management Integration 示例](https://github.com/dapr/samples/tree/master/dapr-apim-integration)。

{{< button text="了解有关 Dapr 集成策略的更多信息" link="https://docs.microsoft.com/azure/api-management/api-management-dapr-policies" >}}
