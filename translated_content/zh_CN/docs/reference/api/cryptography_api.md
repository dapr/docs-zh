---
type: docs
title: "加密 API 参考"
linkTitle: "加密 API"
description: "加密 API 的详细文档"
weight: 600
---

Dapr 通过加密构建块为加密和解密功能提供跨平台和跨语言支持。除了[特定语言的 SDK]({{%ref sdks%}})，开发者还可以使用以下 HTTP API 端点调用这些功能。

> HTTP API 仅适用于开发和测试场景。在生产场景中，强烈建议使用 SDK，因为它们实现了 gRPC API，相比 HTTP API 提供更高的性能和更强的功能。

## 加密负载

此端点允许您使用指定的密钥和加密组件加密以字节数组形式提供的值。

### HTTP 请求

```
PUT http://localhost:<daprPort>/v1.0-alpha1/crypto/<crypto-store-name>/encrypt
```

#### URL 参数
 | 参数               | 描述                                                 |
|-------------------|-------------------------------------------------------------|
| daprPort          | Dapr 端口                                               |
| crypto-store-name | 用于获取加密密钥的加密存储名称 |

> 注意，所有 URL 参数都区分大小写。

#### 请求头
通过设置具有适当值的请求头来配置额外的加密参数。下表详述了每个加密请求需要设置的必选和可选请求头。

| 请求头键                      | 描述                                                                                                                                                                                         | 允许的值                                                                   | 必填                                                 |
|-------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|----------------------------------------------------------|
| dapr-key-name                 | 用于加密操作的密钥名称                                                                                                                                             |                                                                                   | 是                                                      |
| dapr-key-wrap-algorithm       | 要使用的密钥包装算法                                                                                                                                                                       | `A256KW`、`A128CBC`、`A192CBC`、`RSA-OAEP-256`                                    | 是                                                      |
| dapr-omit-decryption-key-name | 如果为 true，则从输出中省略请求头 `dapr-decryption-key-name` 中的解密密钥名称。如果为 false，则包含请求头 `dapr-decryption-key-name` 中指定的解密密钥名称。 | 以下值将被视为 true：`y`、`yes`、`true`、`t`、`on`、`1` | 否                                                       |
| dapr-decryption-key-name      | 如果 `dapr-omit-decryption-key-name` 为 true，则此字段包含要包含在输出中的预期解密密钥的名称。                                                                         |                                                                                   | 仅当 `dapr-omit-decryption-key-name` 为 true 时必填 |
| dapr-data-encryption-cipher   | 用于加密操作的密码                                                                                                                                                      | `aes-gcm` 或 `chacha20-poly1305`                                                  | 否                                                       |

### HTTP 响应

#### 响应体
加密请求的响应的内容类型请求头将被设置为 `application/octet-stream`，因为它返回包含加密负载的字节数组。

#### 响应代码
| 代码 | 描述                                                             |
|------|-------------------------------------------------------------------------|
| 200  | OK                                                                      |
| 400  | 未找到加密提供程序                                               |
| 500  | 请求格式正确，但在 dapr 代码或底层组件中发生错误 |

### 示例
```shell
curl http://localhost:3500/v1.0-alpha1/crypto/myAzureKeyVault/encrypt \
    -X PUT \
    -H "dapr-key-name: myCryptoKey" \
    -H "dapr-key-wrap-algorithm: aes-gcm" \ 
    -H "Content-Type: application/octet-string" \ 
    --data-binary "\x68\x65\x6c\x6c\x6f\x20\x77\x6f\x72\x6c\x64"
```

> 以上命令发送表示 "hello world" 的 UTF-8 编码字节数组，并将返回类似于以下包含加密负载的 8 位值流：

```bash
gAAAAABhZfZ0Ywz4dQX8y9J0Zl5v7w6Z7xq4jV3cW9o2l4pQ0YD1LdR0Zk7zIYi4n2Ll7t6f0Z4X7r8x9o6a8GyL0X1m9Q0Z0A==
```

## 解密负载

此端点允许您使用指定的密钥和加密组件解密以字节数组形式提供的值。

#### HTTP 请求

```
PUT curl http://localhost:3500/v1.0-alpha1/crypto/<crypto-store-name>/decrypt
```

#### URL 参数

| 参数               | 描述                                                 |
|-------------------|-------------------------------------------------------------|
| daprPort          | Dapr 端口                                               |
| crypto-store-name | 用于获取解密密钥的加密存储名称 |

> 注意，所有参数都区分大小写。

#### 请求头
通过设置具有适当值的请求头来配置额外的解密参数。下表详述了每个解密请求需要设置的必选和可选请求头。

| 请求头键          | 描述                                              | 必填 |
|---------------|----------|----------|
| dapr-key-name | 用于解密操作的密钥名称。 | 是      |

### HTTP 响应

#### 响应体
解密请求的响应的内容类型请求头将被设置为 `application/octet-stream`，因为它返回表示解密负载的字节数组。

#### 响应代码
| 代码 | 描述                                                             |
|------|-------------------------------------------------------------------------|
| 200  | OK                                                                      |
| 400  | 未找到加密提供程序                                               |
| 500  | 请求格式正确，但在 dapr 代码或底层组件中发生错误 |

### 示例
```bash
curl http://localhost:3500/v1.0-alpha1/crypto/myAzureKeyVault/decrypt \
    -X PUT
    -H "dapr-key-name: myCryptoKey"\
    -H "Content-Type: application/octet-stream" \
    --data-binary "gAAAAABhZfZ0Ywz4dQX8y9J0Zl5v7w6Z7xq4jV3cW9o2l4pQ0YD1LdR0Zk7zIYi4n2Ll7t6f0Z4X7r8x9o6a8GyL0X1m9Q0Z0A=="
```

> 以上命令发送加密消息负载的 base-64 编码字符串，并将返回内容类型请求头设置为 `application/octet-stream` 的响应，响应体为 `hello world`。

```bash
hello world
```
