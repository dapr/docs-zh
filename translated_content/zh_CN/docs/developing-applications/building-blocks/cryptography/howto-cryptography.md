---
type: docs
title: "操作指南：使用 Cryptography API"
linkTitle: "操作指南：使用 Cryptography"
weight: 2000
description: "了解如何加密和解密文件"
---

现在您已经阅读了 [Cryptography 作为 Dapr 构建块]({{% ref cryptography-overview %}}) 的相关内容，让我们通过 SDK 来演练如何使用 cryptography API。

{{% alert title="注意" color="primary" %}}
Dapr cryptography 目前处于 Alpha 阶段。

{{% /alert %}}

## 加密

{{< tabpane text=true >}}

{{% tab "Python" %}}

<!--Python-->

在您的项目中使用 Dapr SDK（通过 gRPC API），您可以加密数据流，例如文件或字符串：

```python
# 当传递数据（缓冲区或字符串）时，`encrypt` 返回包含加密消息的 Buffer
def encrypt_decrypt_string(dapr: DaprClient):
    message = 'The secret is "passw0rd"'

    # 加密消息
    resp = dapr.encrypt(
        data=message.encode(),
        options=EncryptOptions(
            # Cryptography 组件的名称（必需）
            component_name=CRYPTO_COMPONENT_NAME,
            # 存储在 cryptography 组件中的密钥（必需）
            key_name=RSA_KEY_NAME,
            # 用于包装密钥的算法，必须由上述命名的密钥支持。
            # 选项包括："RSA"、"AES"
            key_wrap_algorithm='RSA',
        ),
    )

    # 该方法返回一个可读流，我们在内存中完整读取它
    encrypt_bytes = resp.read()
    print(f'Encrypted the message, got {len(encrypt_bytes)} bytes')
```

{{% /tab %}}

{{% tab "JavaScript" %}}

<!--JavaScript-->

在您的项目中使用 Dapr SDK（通过 gRPC API），您可以加密缓冲区或字符串中的数据：

```js
// 当传递数据（缓冲区或字符串）时，`encrypt` 返回包含加密消息的 Buffer
const ciphertext = await client.crypto.encrypt(plaintext, {
    // Dapr 组件的名称（必需）
    componentName: "mycryptocomponent",
    // 存储在组件中的密钥名称（必需）
    keyName: "mykey",
    // 用于包装密钥的算法，必须由上述命名的密钥支持。
    // 选项包括："RSA"、"AES"
    keyWrapAlgorithm: "RSA",
});
```

这些 API 也可以与流一起使用，以便在数据来自流时更高效地加密数据。下面的示例使用流加密文件，并将其写入另一个文件：

```js
// `encrypt` 可以用作 Duplex 流
await pipeline(
    fs.createReadStream("plaintext.txt"),
    await client.crypto.encrypt({
        // Dapr 组件的名称（必需）
        componentName: "mycryptocomponent",
        // 存储在组件中的密钥名称（必需）
        keyName: "mykey",
        // 用于包装密钥的算法，必须由上述命名的密钥支持。
        // 选项包括："RSA"、"AES"
        keyWrapAlgorithm: "RSA",
    }),
    fs.createWriteStream("ciphertext.out"),
);
```

{{% /tab %}}

{{% tab ".NET" %}}

<!-- .NET -->
在您的项目中使用 Dapr SDK（通过 gRPC API），您可以加密字符串或字节数组中的数据：

```csharp
using var client = new DaprClientBuilder().Build();

const string componentName = "azurekeyvault"; // 更改此项以匹配您的 cryptography 组件
const string keyName = "myKey"; // 更改此项以匹配您的加密存储中密钥的名称

const string plainText = "This is the value we're going to encrypt today";

// 将字符串编码为 UTF-8 字节数组并加密
var plainTextBytes = Encoding.UTF8.GetBytes(plainText);
var encryptedBytesResult = await client.EncryptAsync(componentName, plaintextBytes, keyName, new EncryptionOptions(KeyWrapAlgorithm.Rsa));
```

{{% /tab %}}

{{% tab "Go" %}}

<!--go-->

在您的项目中使用 Dapr SDK，您可以加密数据流，例如文件。

```go
out, err := sdkClient.Encrypt(context.Background(), rf, dapr.EncryptOptions{
	// Dapr 组件的名称（必需）
	ComponentName: "mycryptocomponent",
	// 存储在组件中的密钥名称（必需）
	KeyName:       "mykey",
	// 用于包装密钥的算法，必须由上述命名的密钥支持。
	// 选项包括："RSA"、"AES"
	Algorithm:     "RSA",
})
```

下面的示例将 `Encrypt` API 放在上下文中，代码读取文件、加密文件，然后将结果存储在另一个文件中。

```go
// 输入文件，明文
rf, err := os.Open("input")
if err != nil {
	panic(err)
}
defer rf.Close()

// 输出文件，已加密
wf, err := os.Create("output.enc")
if err != nil {
	panic(err)
}
defer wf.Close()

// 使用 Dapr 加密数据
out, err := sdkClient.Encrypt(context.Background(), rf, dapr.EncryptOptions{
	// 这是 3 个必需参数
	ComponentName: "mycryptocomponent",
	KeyName:       "mykey",
	Algorithm:     "RSA",
})
if err != nil {
	panic(err)
}

// 读取流并将其复制到输出文件
n, err := io.Copy(wf, out)
if err != nil {
	panic(err)
}
fmt.Println("Written", n, "bytes")
```

下面的示例使用 `Encrypt` API 来加密字符串。

```go
// 输入字符串
rf := strings.NewReader("Amor, ch'a nullo amato amar perdona, mi prese del costui piacer sì forte, che, come vedi, ancor non m'abbandona")

// 使用 Dapr 加密数据
enc, err := sdkClient.Encrypt(context.Background(), rf, dapr.EncryptOptions{
	ComponentName: "mycryptocomponent",
	KeyName:       "mykey",
	Algorithm:     "RSA",
})
if err != nil {
	panic(err)
}

// 将加密数据读入字节切片
enc, err := io.ReadAll(enc)
if err != nil {
	panic(err)
}
```

{{% /tab %}}

{{< /tabpane >}}


## 解密

{{< tabpane text=true >}}

{{% tab "Python" %}}

<!--python-->

要解密数据流，请使用 `decrypt`。

```python
def encrypt_decrypt_string(dapr: DaprClient):
    message = 'The secret is "passw0rd"'

    # ...

    # 解密加密的数据
    resp = dapr.decrypt(
        data=encrypt_bytes,
        options=DecryptOptions(
            # Cryptography 组件的名称（必需）
            component_name=CRYPTO_COMPONENT_NAME,
            # 存储在 cryptography 组件中的密钥（必需）
            key_name=RSA_KEY_NAME,
        ),
    )

    # 该方法返回一个可读流，我们在内存中完整读取它
    decrypt_bytes = resp.read()
    print(f'Decrypted the message, got {len(decrypt_bytes)} bytes')

    print(decrypt_bytes.decode())
    assert message == decrypt_bytes.decode()
```

{{% /tab %}}

{{% tab "JavaScript" %}}

<!--JavaScript-->

使用 Dapr SDK，您可以解密缓冲区中的数据或使用流。

```js
// 当将数据作为缓冲区传递时，`decrypt` 返回包含解密消息的 Buffer
const plaintext = await client.crypto.decrypt(ciphertext, {
    // 唯一必需的选项是组件名称
    componentName: "mycryptocomponent",
});

// `decrypt` 也可以用作 Duplex 流
await pipeline(
    fs.createReadStream("ciphertext.out"),
    await client.crypto.decrypt({
        // 唯一必需的选项是组件名称
        componentName: "mycryptocomponent",
    }),
    fs.createWriteStream("plaintext.out"),
);
```

{{% /tab %}}

{{% tab ".NET" %}}

<!-- .NET -->
要解密字符串，请在您的项目中使用 'DecryptAsync' gRPC API。

在下面的示例中，我们将获取一个字节数组（例如来自上面的示例）并将其解密为 UTF-8 编码的字符串。

```csharp
public async Task<string> DecryptBytesAsync(byte[] encryptedBytes)
{
  using var client = new DaprClientBuilder().Build();

  const string componentName = "azurekeyvault"; // 更改此项以匹配您的 cryptography 组件
  const string keyName = "myKey"; // 更改此项以匹配您的加密存储中密钥的名称

  var decryptedBytes = await client.DecryptAsync(componentName, encryptedBytes, keyName);
  var decryptedString = Encoding.UTF8.GetString(decryptedBytes.ToArray());
  return decryptedString;
}
```

{{% /tab %}}

{{% tab "Go" %}}

<!--go-->

要解密文件，请在您的项目中使用 `Decrypt` gRPC API。

在下面的示例中，`out` 是一个可以写入文件或在内存中读取的流，如上面的示例所示。

```go
out, err := sdkClient.Decrypt(context.Background(), rf, dapr.EncryptOptions{
	// 唯一必需的选项是组件名称
	ComponentName: "mycryptocomponent",
})
```

{{% /tab %}}

{{< /tabpane >}}

## 后续步骤
[Cryptography 组件规范]({{% ref supported-cryptography %}})
