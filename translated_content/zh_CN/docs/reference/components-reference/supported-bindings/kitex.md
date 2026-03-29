---
type: docs
title: "Kitex"
linkTitle: "Kitex"
description: "Kitex binding 组件的详细文档"
aliases:
- "/operations/components/setup-bindings/supported-bindings/kitex/"
---

## 概述

Kitex 的 binding 主要利用 Kitex 中的 generic-call 功能。更多详情请参考 [Kitex generic-call](https://www.cloudwego.io/docs/kitex/tutorials/advanced-feature/generic-call/) 的官方文档。
目前，Kitex 仅支持 Thrift generic calls。集成到 [components-contrib](https://github.com/dapr/components-contrib/tree/master/bindings/kitex) 的实现采用 binary generic calls。


## 组件格式

要设置 Kitex binding，请创建一个类型为 `bindings.kitex` 的组件。请参阅[如何：使用输出 binding 与外部资源交互]({{% ref "howto-bindings.md#1-create-a-binding" %}})指南，了解如何创建和应用 binding 配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: bindings.kitex
spec:
  type: bindings.kitex
  version: v1
  metadata: 
  - name: hostPorts
    value: "127.0.0.1:8888"
  - name: destService
    value: "echo"
  - name: methodName
    value: "echo"
  - name: version
    value: "0.5.0"
```

## 规范元数据字段

`bindings.kitex` 的 `InvokeRequest.Metadata` 要求客户端在进行调用时填写四个必需项： 

- `hostPorts`
- `destService`
- `methodName`
- `version` 

| 字段       | 必填 | Binding 支持 | 详情                                                                                                 | 示例            |
|-------------|:--------:|--------|---------------------------------------------------------------------------------------------------------|--------------------|
| `hostPorts`   |    Y     | 输出 | Kitex 服务器（Thrift）的 IP 地址和端口信息                                        | `"127.0.0.1:8888"` |
| `destService` |    Y     | 输出 | Kitex 服务器（Thrift）的服务名称            | `"echo"`           |
| `methodName`  |    Y     | 输出 | Kitex 服务器（Thrift）特定服务名称下的方法名称 | `"echo"`           |
| `version`     |    Y     | 输出 | Kitex 版本                                                                                           | `"0.5.0"`          |

## Binding 支持

此组件支持**输出 binding**，支持以下操作：

- `get`

## 示例 

使用 Kitex binding 时：
- 客户端需要传入正确的 Thrift 编码的二进制数据
- 服务器需要是 Thrift Server。 

[kitex_output_test](https://github.com/dapr/components-contrib/blob/master/bindings/kitex/kitex_output_test.go) 可作为参考。
例如，变量 `reqData` 需要在发送前由 Thrift 协议_编码_，返回的数据需要由 Thrift 协议解码。

**请求**

```json
{
  "operation": "get",
  "metadata": {
    "hostPorts": "127.0.0.1:8888",
    "destService": "echo",
    "methodName": "echo",
    "version":"0.5.0"
  },
  "data": reqdata
}
```

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [Bindings 构建块]({{% ref bindings %}})
- [如何：使用输入 binding 触发应用程序]({{% ref howto-triggers.md %}})
- [如何：使用 bindings 与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
