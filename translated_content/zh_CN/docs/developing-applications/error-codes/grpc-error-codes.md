---
type: docs
title: 处理 gRPC 错误码
linkTitle: "gRPC"
weight: 40
description: "有关 Dapr gRPC 错误及其处理方法的信息"
---

最初，错误遵循[标准 gRPC 错误模型](https://grpc.io/docs/guides/error/#standard-error-model)。然而，为了提供更详细和更有信息量的错误消息，定义了一个增强的错误模型，该模型与 gRPC [更丰富的错误模型](https://grpc.io/docs/guides/error/#richer-error-model)保持一致。

{{% alert title="注意" color="primary" %}}
并非所有 Dapr 错误都已转换为更丰富的 gRPC 错误模型。
{{% /alert %}}

## 标准 gRPC 错误模型

[标准 gRPC 错误模型](https://grpc.io/docs/guides/error/#standard-error-model)是 gRPC 中的一种错误报告方法。每个错误响应包含一个错误码和一个错误消息。错误码是标准化的，反映了常见的错误条件。

**标准 gRPC 错误响应示例：**
```
ERROR:
  Code: InvalidArgument
  Message: input key/keyPrefix 'bad||keyname' can't contain '||'
```

## 更丰富的 gRPC 错误模型

[更丰富的 gRPC 错误模型](https://grpc.io/docs/guides/error/#richer-error-model)通过提供有关错误的额外上下文和详细信息来扩展标准错误模型。该模型包括标准的错误 `code` 和 `message`，以及一个 `details` 部分，其中可以包含各种类型的信息，例如 `ErrorInfo`、`ResourceInfo` 和 `BadRequest` 详细信息。

**更丰富的 gRPC 错误响应示例：**
```
ERROR:
  Code: InvalidArgument
  Message: input key/keyPrefix 'bad||keyname' can't contain '||'
  Details:
  1)	{
    	  "@type": "type.googleapis.com/google.rpc.ErrorInfo",
    	  "domain": "dapr.io",
    	  "reason": "DAPR_STATE_ILLEGAL_KEY"
    	}
  2)	{
    	  "@type": "type.googleapis.com/google.rpc.ResourceInfo",
    	  "resourceName": "statestore",
    	  "resourceType": "state"
    	}
  3)	{
    	  "@type": "type.googleapis.com/google.rpc.BadRequest",
    	  "fieldViolations": [
    	    {
    	      "field": "bad||keyname",
    	      "description": "input key/keyPrefix 'bad||keyname' can't contain '||'"
    	    }
    	  ]
    	}
```

对于 HTTP 客户端，Dapr 将 gRPC 错误模型转换为类似的 JSON 格式结构。响应包括一个 `errorCode`、一个 `message` 和一个 `details` 数组，该数组反映了在更丰富的 gRPC 模型中找到的结构。

**HTTP 错误响应示例：**
```json
{
    "errorCode": "ERR_MALFORMED_REQUEST",
    "message": "api error: code = InvalidArgument desc = input key/keyPrefix 'bad||keyname' can't contain '||'",
    "details": [
        {
            "@type": "type.googleapis.com/google.rpc.ErrorInfo",
            "domain": "dapr.io",
            "metadata": null,
            "reason": "DAPR_STATE_ILLEGAL_KEY"
        },
        {
            "@type": "type.googleapis.com/google.rpc.ResourceInfo",
            "description": "",
            "owner": "",
            "resource_name": "statestore",
            "resource_type": "state"
        },
        {
            "@type": "type.googleapis.com/google.rpc.BadRequest",
            "field_violations": [
                {
                    "field": "bad||keyname",
                    "description": "api error: code = InvalidArgument desc = input key/keyPrefix 'bad||keyname' can't contain '||'"
                }
            ]
        }
    ]
}
```

你可以[在这里](https://github.com/googleapis/googleapis/blob/master/google/rpc/error_details.proto)找到所有可能的状态详情的规范。

## 相关链接

- [编写错误码](https://github.com/dapr/dapr/tree/master/pkg/api/errors)
- [在 Go SDK 中使用错误码](https://docs.dapr.io/developing-applications/sdks/go/go-client/#error-handling)
