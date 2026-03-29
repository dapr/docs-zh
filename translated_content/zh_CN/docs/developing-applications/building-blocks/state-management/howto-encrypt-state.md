---
type: docs
title: "操作指南：加密应用状态"
linkTitle: "操作指南：加密状态"
weight: 450
description: "自动加密状态并管理密钥轮换"

---

对应用状态进行静态加密，以在企业工作负载或受监管环境中提供更强的安全性。Dapr 基于 [Galois/Counter Mode (GCM)](https://en.wikipedia.org/wiki/Galois/Counter_Mode) 中的 [AES](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard) 提供自动客户端加密，支持 128、192 和 256 位密钥。

除了自动加密外，Dapr 还支持主加密密钥和辅助加密密钥，使开发人员和运维团队更容易启用密钥轮换策略。所有 Dapr 状态存储都支持此功能。

加密密钥始终从机密中获取，不能在 `metadata` 部分以纯文本值形式提供。

## 启用自动加密

将以下 `metadata` 部分添加到任何 Dapr 支持的状态存储：

```yaml
metadata:
- name: primaryEncryptionKey
  secretKeyRef:
    name: mysecret
    key: mykey # key 是可选的。
```

例如，这是一个 Redis 加密状态存储的完整 YAML：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
  - name: primaryEncryptionKey
    secretKeyRef:
      name: mysecret
      key: mykey
```

现在您已经配置了一个 Dapr 状态存储，可以从名为 `mysecret` 的机密中获取加密密钥，该机密在名为 `mykey` 的键中包含实际的加密密钥。

实际的加密密钥*必须*是有效的十六进制编码的加密密钥。虽然支持 192 位和 256 位密钥，但建议您使用 128 位加密密钥。如果加密密钥无效，Dapr 会报错并退出。

例如，您可以使用以下命令生成随机的十六进制编码的 128 位（16 字节）密钥：

```sh
openssl rand 16 | hexdump -v -e '/1 "%02x"'
# 结果将类似于 "cb321007ad11a9d23f963bff600d58e0"
```

*请注意，机密存储不必支持键。*

## 密钥轮换

为了支持密钥轮换，Dapr 提供了一种指定辅助加密密钥的方法：

```yaml
metadata:
- name: primaryEncryptionKey
    secretKeyRef:
      name: mysecret
      key: mykey
- name: secondaryEncryptionKey
    secretKeyRef:
      name: mysecret2
      key: mykey2
```

当 Dapr 启动时，它会获取包含 `metadata` 部分中列出的加密密钥的机密。Dapr 自动知道哪个状态项已使用哪个密钥加密，因为它将 `secretKeyRef.name` 字段附加到实际状态键的末尾。

要轮换密钥：

1. 将 `primaryEncryptionKey` 更改为指向包含您新密钥的机密。
1. 将旧的主加密密钥移动到 `secondaryEncryptionKey`。

新数据将使用新密钥加密，而任何检索到的旧数据将使用辅助密钥解密。

对使用旧密钥加密的数据项的任何更新都将使用新密钥重新加密。

{{% alert title="注意" color="primary" %}}
当您轮换密钥时，除非您的应用程序再次写入，否则使用旧密钥加密的数据不会自动重新加密。如果您删除轮换的密钥（现在的辅助加密密钥），您将无法访问使用该密钥加密的数据。

{{% /alert %}}

## 相关链接

- [安全概述]({{% ref "security-concept" %}})
- [状态存储查询 API 实现指南](https://github.com/dapr/components-contrib/blob/master/state/README.md#implementing-state-query-api)
- [状态存储组件]({{% ref "supported-state-stores" %}})
