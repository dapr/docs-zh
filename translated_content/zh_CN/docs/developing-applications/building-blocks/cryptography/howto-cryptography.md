---
type: docs
title: "操作指南：使用 Cryptography API"
linkTitle: "操作指南：使用 Cryptography"
weight: 2000
description: "了解如何加密和解密文件"
---

现在你已经阅读了 [Cryptography 作为 Dapr building block]({{% ref cryptography-overview %}})，让我们通过 SDK 来演练如何使用 cryptography API。

{{% alert title="注意" color="primary" %}}
Dapr cryptography 目前处于 Alpha 阶段。

{{% /alert %}}

## 加密

{{< tabpane text=true >}}

{{% tab "Python" %}}

<!--Python-->

在项目中使用 Dapr SDK（通过 gRPC API），你可以加密数据流，例如文件或字符串：

```python
# 传递数据（缓冲区或字符串）时，`encrypt` 返回包含加密消息的 Buffer
def encrypt_decrypt_string(dapr: DaprClient):
    message = 'The secret is "passw0rd"'

    # 加密消息
    resp = dapr.encrypt(
        data=message.encode(),
        options=EncryptOptions(
            # cryptography component 的名称（必需）
            component_name=CRYPTO_COMPONENT_NAME,
            # 存储在 cryptography component 中的密钥（必需）
            key_name=RSA_KEY_NAME,
            # 用于包装密钥的算法，必须由上面命名的密钥支持。
            # 可选项包括："RSA"、"AES"
            key_wrap_algorithm='RSA',
        ),
    )

    # 该方法返回一个可读流，我们将其完整读入内存
    encrypt_bytes = resp.read()
    print(f'Encrypted the message, got {len(encrypt_bytes)} bytes')
```

{{% /tab %}}

{{% tab "JavaScript" %}}

<!--JavaScript-->

使用 **`@dapr/dapr` 3.19.0 或更高版本**时，`client.crypto` 同时支持 HTTP 和 gRPC。你可以加密缓冲区或 UTF-8 字符串中的数据。对于大载荷和生产环境中的流式处理，建议优先使用 gRPC，因为 Dapr 会在读取完请求之前缓冲 HTTP 的 cryptography 输出。

安装、component 和密钥设置、客户端配置以及可运行的示例，请参阅 [JavaScript Cryptography 操作指南]({{% ref js-cryptography-howto.md %}})。

```js
// 传递数据（缓冲区或字符串）时，`encrypt` 返回包含加密消息的 Buffer
const ciphertext = await client.crypto.encrypt(plaintext, {
    // Dapr component 的名称（必需）
    componentName: "mycryptocomponent",
    // 存储在 component 中的密钥名称（必需）
    keyName: "mykey",
    // 用于包装密钥的算法，必须由上面命名的密钥支持。
    // 可选项包括："RSA"、"AES"
    keyWrapAlgorithm: "RSA",
});
```

这些 API 也可以与流一起使用，以便在数据来自流时更高效地加密。下面的示例使用流加密一个文件，并将结果写入另一个文件：

```js
// `encrypt` 可以用作 Duplex 流
await pipeline(
    fs.createReadStream("plaintext.txt"),
    await client.crypto.encrypt({
        // Dapr component 的名称（必需）
        componentName: "mycryptocomponent",
        // 存储在 component 中的密钥名称（必需）
        keyName: "mykey",
        // 用于包装密钥的算法，必须由上面命名的密钥支持。
        // 可选项包括："RSA"、"AES"
        keyWrapAlgorithm: "RSA",
    }),
    fs.createWriteStream("ciphertext.out"),
);
```

{{% /tab %}}

{{% tab ".NET" %}}

<!-- .NET -->
在项目中使用 Dapr SDK（通过 gRPC API），你可以加密字符串或字节数组中的数据：

```csharp
using var client = new DaprClientBuilder().Build();

const string componentName = "azurekeyvault"; // 更改此项以匹配你的 cryptography component
const string keyName = "myKey"; // 更改此项以匹配你的加密存储中的密钥名称

const string plainText = "This is the value we're going to encrypt today";

// 将字符串编码为 UTF-8 字节数组并加密
var plainTextBytes = Encoding.UTF8.GetBytes(plainText);
var encryptedBytesResult = await client.EncryptAsync(componentName, plaintextBytes, keyName, new EncryptionOptions(KeyWrapAlgorithm.Rsa));
```

{{% /tab %}}

{{% tab "Go" %}}

<!--go-->

在项目中使用 Dapr SDK，你可以加密数据流，例如文件。

```go
out, err := sdkClient.Encrypt(context.Background(), rf, dapr.EncryptOptions{
	// Dapr component 的名称（必需）
	ComponentName: "mycryptocomponent",
	// 存储在 component 中的密钥名称（必需）
	KeyName:       "mykey",
	// 用于包装密钥的算法，必须由上面命名的密钥支持。
	// 可选项包括："RSA"、"AES"
	Algorithm:     "RSA",
})
```

下面的示例将 `Encrypt` API 放在上下文中：代码读取文件、加密文件，然后将结果存储到另一个文件中。

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

下面的示例使用 `Encrypt` API 加密一个字符串。

```go
// 输入字符串
rf := strings.NewReader("Amor, ch’a nullo amato amar perdona, mi prese del costui piacer sì forte, che, come vedi, ancor non m’abbandona")

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
            # cryptography component 的名称（必需）
            component_name=CRYPTO_COMPONENT_NAME,
            # 存储在 cryptography component 中的密钥（必需）
            key_name=RSA_KEY_NAME,
        ),
    )

    # 该方法返回一个可读流，我们将其完整读入内存
    decrypt_bytes = resp.read()
    print(f'Decrypted the message, got {len(decrypt_bytes)} bytes')

    print(decrypt_bytes.decode())
    assert message == decrypt_bytes.decode()
```

{{% /tab %}}

{{% tab "JavaScript" %}}

<!--JavaScript-->

通过 HTTP 或 gRPC 使用 Dapr SDK，你可以解密缓冲区中的二进制数据，也可以使用流进行解密。默认情况下，运行时使用加密文档中嵌入的密钥引用。当文档省略该引用或你需要覆盖它时，请显式传递 `keyName`。

```js
// 将数据作为缓冲区传递时，`decrypt` 返回包含解密消息的 Buffer
const plaintext = await client.crypto.decrypt(ciphertext, {
    // 当加密文档包含密钥引用时，keyName 为可选项
    componentName: "mycryptocomponent",
});

// `decrypt` 也可以用作 Duplex 流
await pipeline(
    fs.createReadStream("ciphertext.out"),
    await client.crypto.decrypt({
        // 当加密文档包含密钥引用时，keyName 为可选项
        componentName: "mycryptocomponent",
    }),
    fs.createWriteStream("plaintext.out"),
);
```

请先完成加密，再开始解密。受 [dapr/kit#170](https://github.com/dapr/kit/issues/170) 影响的运行时，在解密与其他 cryptography 操作重叠时可能会失败。有关所有加密选项、流的行为和限制，请参阅 [JavaScript 客户端使用指南]({{% ref js-cryptography-client-usage.md %}})。

{{% /tab %}}

{{% tab ".NET" %}}

<!-- .NET -->
要解密字符串，请在项目中使用 'DecryptAsync' gRPC API。

在下面的示例中，我们将获取一个字节数组（例如上面示例中的字节数组），并将其解密为 UTF-8 编码的字符串。

```csharp
public async Task<string> DecryptBytesAsync(byte[] encryptedBytes)
{
  using var client = new DaprClientBuilder().Build();

  const string componentName = "azurekeyvault"; // 更改此项以匹配你的 cryptography component
  const string keyName = "myKey"; // 更改此项以匹配你的加密存储中的密钥名称

  var decryptedBytes = await client.DecryptAsync(componentName, encryptedBytes, keyName);
  var decryptedString = Encoding.UTF8.GetString(decryptedBytes.ToArray());
  return decryptedString;
}
```

{{% /tab %}}

{{% tab "Go" %}}

<!--go-->

要解密文件，请在项目中使用 `Decrypt` gRPC API。

在下面的示例中，`out` 是一个流，可以像上面的示例那样写入文件或在内存中读取。

```go
out, err := sdkClient.Decrypt(context.Background(), rf, dapr.EncryptOptions{
	// 唯一必需的选项是 component 名称
	ComponentName: "mycryptocomponent",
})
```

{{% /tab %}}

{{< /tabpane >}}

## 后续步骤
[Cryptography component 规范]({{% ref supported-cryptography %}})
