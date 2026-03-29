---
type: docs
title: "Apple Push Notification Service 绑定规范"
linkTitle: "Apple Push Notification Service"
description: "Apple Push Notification Service 绑定组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/apns/"
---

## 组件格式

要设置 Apple Push Notifications 绑定，请创建类型为 `bindings.apns` 的组件。有关如何创建和应用绑定配置，请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.apns
  version: v1
  metadata:
    - name: development
      value: "<bool>"
    - name: key-id
      value: "<APPLE_KEY_ID>"
    - name: team-id
      value: "<APPLE_TEAM_ID>"
    - name: private-key
      secretKeyRef:
        name: <SECRET>
        key: "<SECRET-KEY-NAME>"
```
## 规格元数据字段

| 字段              | 必填 | 绑定支持 | 详情 | 示例 |
|--------------------|:--------:| ----------------|---------|---------|
| `development` | Y | Output | 告诉绑定使用哪个 APNs 服务。设置为 `"true"` 以使用开发服务，或设置为 `"false"` 以使用生产服务。默认值：`"true"` | `"true"` |
| `key-id` | Y | Output | 来自 Apple Developer Portal 的私钥标识符 | `"private-key-id`" |
| `team-id` | Y | Output | 来自 Apple Developer Portal 的组织或作者标识符 | `"team-id"` |
| `private-key` | Y | Output| 是一个 PKCS #8 格式的私钥。私钥应存储在 secret store 中，而不是直接暴露在配置中。有关更多详细信息，请参阅[此处](#private-key) | `"pem file"` |

### 私钥

APNS 绑定需要一个加密私钥来为 APNS 服务生成认证令牌。
私钥可以从 Apple Developer Portal 生成，以 PKCS #8 文件的形式提供，私钥以 PEM 格式存储。
私钥应存储在 Dapr secret store 中，而不是直接存储在绑定配置文件中。

下面显示了 APNS 绑定的示例配置文件：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: apns
spec:
  type: bindings.apns
  metadata:
  - name: development
    value: false
  - name: key-id
    value: PUT-KEY-ID-HERE
  - name: team-id
    value: PUT-APPLE-TEAM-ID-HERE
  - name: private-key
    secretKeyRef:
      name: apns-secrets
      key: private-key
```

如果使用 Kubernetes，示例 secret 配置可能如下所示：

```yaml
apiVersion: v1
kind: Secret
metadata:
    name: apns-secrets
stringData:
    private-key: |
        -----BEGIN PRIVATE KEY-----
        KEY-DATA-GOES-HERE
        -----END PRIVATE KEY-----
```

## 绑定支持

此组件支持 **输出绑定**，具有以下操作：

- `create`

## 推送通知格式

APNS 绑定是对 Apple Push Notification Service 的透传包装器。APNS 绑定将直接向 APNS 服务发送请求，而不进行任何转换。
因此，了解 APNS 服务期望的推送通知负载格式非常重要。
负载格式记录在[此处](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/generating_a_remote_notification)。

### 请求格式

```json
{
    "data": {
        "aps": {
            "alert": {
                "title": "New Updates!",
                "body": "There are new updates for your review"
            }
        }
    },
    "metadata": {
        "device-token": "PUT-DEVICE-TOKEN-HERE",
        "apns-push-type": "alert",
        "apns-priority": "10",
        "apns-topic": "com.example.helloworld"
    },
    "operation": "create"
}
```
<!-- IGNORE_LINKS -->
`data` 对象包含完整的推送通知规范，如 [Apple 文档](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/generating_a_remote_notification)中所述。`data` 对象将直接发送到 APNs 服务。

除了 `device-token` 值之外，[Apple 文档](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/sending_notification_requests_to_apns)中指定的 HTTP 标头可以作为元数据字段发送，并将包含在对 APNs 服务的 HTTP 请求中。
<!-- END_IGNORE -->

### 响应格式

```json
{
    "messageID": "UNIQUE-ID-FOR-NOTIFICATION"
}
```

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [操作指南：使用输入绑定触发应用程序]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
