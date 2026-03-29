---
type: docs
title: "处理 HTTP 错误代码"
linkTitle: "HTTP"
description: "Dapr HTTP 错误代码的详细参考以及如何处理它们"
weight: 30
---

对于发往 Dapr 运行时的 HTTP 调用，当遇到错误时，会在响应正文中返回一个错误 JSON。该 JSON 包含一个错误代码和一条描述性错误消息。

```
{
    "errorCode": "ERR_STATE_GET",
    "message": "Requested state key does not exist in state store."
}
```

## 相关

- [错误代码参考列表]({{% ref error-codes-reference.md %}})
- [处理 gRPC 错误代码]({{% ref grpc-error-codes.md %}})
