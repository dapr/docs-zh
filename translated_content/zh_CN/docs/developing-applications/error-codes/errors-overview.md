---
type: docs
title: "错误概述"
linkTitle: "概述"
weight: 10
description: "Dapr 错误概述"
---

错误码是一个数字或字母数字代码，用于指示错误的性质，并在可能的情况下说明错误发生的原因。

Dapr 错误码是使用 Dapr API 进行 HTTP 和 gRPC 请求时 80 多种常见错误的标准化字符串。这些代码同时具备以下功能：
- 在请求的 JSON 响应体中返回。
- 启用后，在运行时日志中以 debug 级别记录。
  - 如果在 Kubernetes 中运行，错误码会记录在边车中。
  - 如果在自托管模式下运行，你可以启用并运行 debug 日志。

## 错误格式

Dapr 错误码由前缀、类别和错误简写组成。例如：

| 前缀 | 类别 | 错误简写 |
| ------ | -------- | --------------- |
| ERR_ | PUBSUB_ | NOT_FOUND |

一些最常见的返回错误包括：

- ERR_ACTOR_TIMER_CREATE
- ERR_PURGE_WORKFLOW
- ERR_STATE_STORE_NOT_FOUND
- ERR_HEALTH_NOT_READY

> **注意：** [查看 Dapr 中的完整错误码列表。]({{% ref error-codes-reference.md %}})

状态存储未找到时返回的错误可能如下所示：

```json
{
  "error": "Bad Request",
  "error_msg": "{\"errorCode\":\"ERR_STATE_STORE_NOT_FOUND\",\"message\":\"state store <name> is not found\",\"details\":[{\"@type\":\"type.googleapis.com/google.rpc.ErrorInfo\",\"domain\":\"dapr.io\",\"metadata\":{\"appID\":\"nodeapp\"},\"reason\":\"DAPR_STATE_NOT_FOUND\"}]}",
  "status": 400
}
```

返回的错误包含：
- 错误码：`ERR_STATE_STORE_NOT_FOUND`
- 描述问题的错误消息：`state store <name> is not found`
- 发生错误的应用程序 ID：`nodeapp`
- 错误原因：`DAPR_STATE_NOT_FOUND`

## Dapr 错误码指标

指标帮助你查看运行时内部错误发生的具体时间。错误码指标通过 `error_code_total` 端点收集。该端点默认禁用。你可以通过[在配置文件中使用 `recordErrorCodes` 字段来启用它]({{% ref "metrics-overview.md#configuring-metrics-for-error-codes" %}})。

## 演示

观看在 [Diagrid Dapr v1.15 庆祝活动](https://www.diagrid.io/videos/dapr-1-15-deep-dive)上呈现的演示，了解如何启用错误码指标以及如何处理运行时中返回的错误码。

{{< youtube id=NTnwoDhHIcQ start=2812 >}}

## 下一步

{{< button text="查看所有 Dapr 错误码列表" page="error-codes-reference.md" >}}
