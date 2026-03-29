---
type: docs
title: "How to: Use the cryptography APIs"
linkTitle: "How to: Use cryptography"
weight: 2000
description: "了解如何加密和解密文件"
---

Now that you've read about [Cryptography as a Dapr building block]({{% ref cryptography-overview %}}), let's walk through using the cryptography APIs with the SDKs.

既然你已经阅读了 [Dapr 构建块中的加密]({{% ref cryptography-overview %}})，让我们来逐步了解如何使用 SDK 调用加密 API。

{{% alert title="Note" color="primary" %}}
Dapr cryptography is currently in alpha.

{{% /alert %}}
{{% alert title="注意" color="primary" %}}
Dapr 加密功能目前处于 alpha 阶段。

{{% /alert %}}


## Encrypt

## 加密

{{< tabpane text=true >}}

{{% tab "Python" %}}### Python

<!--Python-->

Using the Dapr SDK in your project, with the gRPC APIs, you can encrypt a stream of data, such as a file or a string:

使用 Dapr SDK，通过 gRPC API，你可以加密数据流，例如文件或字符串：

```python
# When passing data (a buffer or string), `encrypt` returns a Buffer with the encrypted message
def encrypt_decrypt_string(dapr: DaprClient):
    message = 'The secret is "passw0rd"'

    # Encrypt the message
    resp = dapr.encrypt(
        data=message.encode(),
        options=EncryptOptions(
            # Name of the cryptography component (required)
            component_name=CRYPTO_COMPONENT_NAME,
            # Key stored in the cryptography component (required)
            key_name=RSA_KEY_NAME,
            # Algorithm used for wrapping the key, which must be supported by the key named above.
            # Options include: "RSA", "AES"
            key_wrap_algorithm='RSA',
        ),
    )

    # The method returns a readable stream, which we read in full in memory
    encrypt_bytes = resp.read()
    print(f'Encrypted the message, got {len(encrypt_bytes)} bytes')
```

`encrypt` returns a Buffer with the encrypted message when passing data (a buffer or string)

当传入数据（缓冲区或字符串）时，`encrypt` 返回一个包含加密消息的缓冲区

```python
def encrypt_decrypt_string(dapr: DaprClient):
    message = 'The secret is "passw0rd"'

    # Encrypt the message
    resp = dapr.encrypt(
        data=message.encode(),
        options=EncryptOptions(
            # Name of the cryptography component (required)
            component_name=CRYPTO_COMPONENT_NAME,
            # Key stored in the cryptography component (required)
            key_name=RSA_KEY_NAME,
            # Algorithm used for wrapping the key, which must be supported by the key named above.
            # Options include: "RSA", "AES"
            key_wrap_algorithm='RSA',
        ),
    )

    # The method returns a readable stream, which we read in full in memory
    encrypt_bytes = resp.read()
    print(f'Encrypted the message, got {len(encrypt_bytes)} bytes')
```

`encrypt` 返回一个包含加密消息的缓冲区（当传入缓冲区或字符串时）

```python
def encrypt_decrypt_string(dapr: DaprClient):
    message = 'The secret is "passw0rd"'

    # 加密消息
    resp = dapr.encrypt(
        data=message.encode(),
        options=EncryptOptions(
            # 加密组件名称（必填）
            component_name=CRYPTO_COMPONENT_NAME,
            # 加密组件中存储的密钥（必填）
            key_name=RSA_KEY_NAME,
            # 用于包装密钥的算法，必须被上述密钥支持
            # 选项包括："RSA"、"AES"
            key_wrap_algorithm='RSA',
        ),
    )

    # 该方法返回一个可读流，我们将其完整读入内存
    encrypt_bytes = resp.read()
    print(f'Encrypted the message, got {len(encrypt_bytes)} bytes')
```

该方法返回一个可读流，我们将其完整读入内存

```python
    encrypt_bytes = resp.read()
    print(f'已加密消息，获得 {len(encrypt_bytes)} 字节')
```

{{% /tab %}}


{{% tab "JavaScript" %}}


## 解密

### JavaScript

<!--JavaScript-->

使用 Dapr SDK，你可以解密缓冲区中的数据或使用流。

```js
// 当以缓冲区形式传入数据时，`decrypt` 返回一个包含解密消息的 Buffer
const plaintext = await client.crypto.decrypt(ciphertext, {
    // 唯一必填的选项是组件名称
    componentName: "mycryptocomponent",
});

// `decrypt` 也可以作为 Duplex 流使用
await pipeline(
    fs.createReadStream("ciphertext.out"),
    await client.crypto.decrypt({
        // 唯一必填的选项是组件名称
        componentName: "mycryptocomponent",
    }),
    fs.createWriteStream("plaintext.out"),
);
```

`decrypt` 也可以作为 Duplex 流使用

```js
await pipeline(
    fs.createReadStream("ciphertext.out"),
    await client.crypto.decrypt({
        // 唯一必填的选项是组件名称
        componentName: "mycryptocomponent",
    }),
    fs.createWriteStream("plaintext.out"),
);
```

### .NET

<!-- .NET -->
使用 `DecryptAsync` gRPC API 来解密字符串。

在以下示例中，我们将获取一个字节数组（如上例中的加密结果）并将其解密为 UTF-8 编码的字符串。

```csharp
public async Task<string> DecryptBytesAsync(byte[] encryptedBytes)
{
  using var client = new DaprClientBuilder().Build();

  const string componentName = "azurekeyvault"; //Change this to match your cryptography component
  const string keyName = "myKey"; //Change this to match the name of the key in your cryptographic store

  var decryptedBytes = await client.DecryptAsync(componentName, encryptedBytes, keyName);
  var decryptedString = Encoding.UTF8.GetString(decryptedBytes.ToArray());
  return decryptedString;
}
```

### Go

<!--go-->

使用 `Decrypt` gRPC API 来解密文件。

在以下示例中，`out` 是一个可以写入文件或读入内存的流，如上面的示例所示。

```go
out, err := sdkClient.Decrypt(context.Background(), rf, dapr.EncryptOptions{
	// 唯一必填的选项是组件名称
	ComponentName: "mycryptocomponent",
})
```

## 后续步骤

[Cryptography component specs]({{% ref supported-cryptography %}})
