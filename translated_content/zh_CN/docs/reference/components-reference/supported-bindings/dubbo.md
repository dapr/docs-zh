---
type: docs
title: "Apache Dubbo binding 规范"
linkTitle: "Dubbo"
description: "Apache Dubbo binding 组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/dubbo/"
---

## 组件格式

要设置 Apache Dubbo binding，创建一个类型为 `bindings.dubbo` 的组件。
参见[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用绑定配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.dubbo
  version: v1
  metadata:
    - name: interfaceName
      value: "com.example.UserService"
    - name: methodName
      value: "getUser"
    # 可选
    - name: version
      value: "1.0.0"
    - name: group
      value: "mygroup"
    - name: providerHostname
      value: "localhost"
    - name: providerPort
      value: "8080"
````

{{% alert title="注意" color="info" %}}
Dubbo binding 默认不需要认证或 secret 配置。
但是，如果您的 Dubbo 部署需要安全通信，您可以为敏感值集成 Dapr 的 [secret store]({{% ref component-secrets.md %}})。
{{% /alert %}}

## Spec 元数据字段

| 字段               | 必需   | 绑定支持        | 详情                                    | 示例                         |
| ------------------ | :----: | --------------- | --------------------------------------- | ---------------------------- |
| `interfaceName`    |    Y    | Output          | 要调用的 Dubbo 接口名称。                | `"com.example.UserService"`  |
| `methodName`       |    Y    | Output          | 在接口上调用的方法名。                   | `"getUser"`                  |
| `version`          |    N    | Output          | Dubbo 服务的版本。                       | `"1.0.0"`                    |
| `group`            |    N    | Output          | Dubbo 服务的分组名称。                   | `"mygroup"`                  |
| `providerHostname` |    N    | Output          | Dubbo 提供者的主机名。                   | `"localhost"`                |
| `providerPort`     |    N    | Output          | Dubbo 提供者的端口。                     | `"8080"`                     |

---

## 绑定支持

此组件支持**输出 binding**，具有以下操作：

* `create`：调用 Dubbo 服务方法。

---

## 示例：调用 Dubbo 服务

要使用 binding 调用 Dubbo 服务：

```json
{
  "operation": "create",
  "metadata": {
    "interfaceName": "com.example.UserService",
    "methodName": "getUser",
    "version": "1.0.0",
    "providerHostname": "localhost",
    "providerPort": "8080"
  },
  "data": {
    "userId": "12345"
  }
}
```

`data` 字段包含发送到 Dubbo 服务方法的请求负载。

---

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [Bindings 构建块]({{% ref bindings %}})
- [操作指南：使用输入绑定触发应用]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
