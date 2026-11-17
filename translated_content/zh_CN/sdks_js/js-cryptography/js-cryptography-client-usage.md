---
type: docs
title: "加密客户端用法"
linkTitle: "客户端用法"
weight: 54100
description: 配置并使用 JavaScript 加密操作、加密选项和流
---

加密功能可通过 `DaprClient.crypto` 使用。本页描述的是 **`@dapr/dapr` 3.19.0 或更高版本**，该版本同时支持 HTTP 与 gRPC。两种传输方式都使用 alpha 的加密 API。

## 客户端生命周期与配置

请复用长期存活的 `DaprClient`，而不是为每次操作都创建一个。在应用关闭期间调用 `await client.stop()` 之前，请等待所有未完成的操作和流管道结束。

HTTP 是默认协议，默认使用 sidecar 端口 `"3500"`。若使用 gRPC，请显式配置协议及其端口：

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
  daprApiToken: process.env.DAPR_API_TOKEN,
});
```

使用 HTTP 时，请使用 `CommunicationProtocolEnum.HTTP` 并指定 sidecar 的 HTTP 端口。端口选项为字符串。如果省略显式的主机和端口选项，SDK 可以从 `DAPR_HTTP_ENDPOINT` 或 `DAPR_GRPC_ENDPOINT` 解析所选协议对应的端点。未显式提供时，API 令牌默认取自 `DAPR_API_TOKEN`。更多信息请参阅 [JavaScript 客户端配置]({{% ref js-client %}}#environment-variables)。

## 选择重载

参数个数决定操作返回流还是缓冲其输出：

| 方法 | 输入 | 结果 |
|------|------|------|
| `encrypt(data, options)` | `Buffer`、`ArrayBuffer`、`ArrayBufferView` 或字符串 | `Promise<Buffer>`，包含密文 |
| `decrypt(data, options)` | `Buffer`、`ArrayBuffer` 或 `ArrayBufferView` | `Promise<Buffer>`，包含明文 |
| `encrypt(options)` | 将明文写入返回的流 | `Promise<Duplex>`，输出密文 |
| `decrypt(options)` | 将密文写入返回的流 | `Promise<Duplex>`，输出明文 |

`ArrayBufferView` 包括 `Uint8Array` 和 `DataView` 等类型化数组。SDK 使用视图的字节偏移量和字节长度，而不是整个底层缓冲区。

加密时会将字符串转换为 UTF-8。解密需要二进制输入，而不是字符串。若要解密以 base64 形式存储的密文，请先对其解码：

```javascript
const decrypted = await client.crypto.decrypt(Buffer.from(savedBase64, "base64"), {
  componentName: "crypto-local",
});
```

此代码片段假设已存在 `client`，并且 `savedBase64` 字符串是此前由 `ciphertext.toString("base64")` 生成的。除非你有意进行编码，否则应将密文保持为字节；使用 `.toString("utf8")` 转换任意密文会破坏其内容。只有当原始明文是 UTF-8 文本时，才应将解密后的字节转换为 UTF-8。

## 加密选项

无论使用哪种重载，都请传入相同的加密选项：

| 选项 | 是否必填 | 行为 |
|------|----------|------|
| `componentName` | 是 | 已配置的 Dapr 加密 component 的名称，而非其 component 类型。 |
| `keyName` | 是 | component 后端存储中的密钥引用；在提供商支持时，可包含版本号。 |
| `keyWrapAlgorithm` | 是 | 用于包装数据加密密钥的算法。必须与所引用的密钥和 component 兼容。 |
| `dataEncryptionCipher` | 否 | 用于加密负载的算法：`"aes-gcm"`（默认）或 `"chacha20-poly1305"`。 |
| `omitDecryptionKeyName` | 否 | 默认为 `false`。设为 `true` 时，加密文档中将省略密钥引用；此时解密必须提供 `keyName`。 |
| `decryptionKeyName` | 否 | 要嵌入文档中的替代密钥引用。默认为加密密钥引用；当 `omitDecryptionKeyName` 为 `true` 时将被忽略。 |

SDK 的 `keyWrapAlgorithm` 类型接受 `"A256KW"`、`"A128CBC"`、`"A192CBC"`、`"A256CBC"`、`"RSA-OAEP-256"`、`"AES"` 和 `"RSA"`。此列表描述的是 SDK 类型，并不保证每个 component、密钥或运行时都接受每个取值。请选择你的提供商所支持的取值；例如，[设置指南]({{% ref js-cryptography-howto.md %}}) 使用 `A256KW` 搭配 256 位对称密钥。包装算法与负载加密算法是两个独立的设置。

TypeScript 应用可以从包的类型模块中导入请求类型：

```typescript
import type { DecryptRequest, EncryptRequest } from "@dapr/dapr/types/crypto/Requests";

const encryptOptions: EncryptRequest = {
  componentName: "crypto-local",
  keyName: "symmetric256",
  keyWrapAlgorithm: "A256KW",
  dataEncryptionCipher: "chacha20-poly1305",
};

const decryptOptions: DecryptRequest = {
  componentName: "crypto-local",
};
```

在 `3.19.0` 中，这些请求类型并未从包的根入口导出。

## 解密与密钥引用

解密需要必填的 `componentName` 和可选的 `keyName`。运行时会从加密文档中读取密码算法和被包装的密钥信息；不要向 `decrypt` 传入 `keyWrapAlgorithm` 等加密选项。

默认情况下，文档中包含加密密钥引用。显式指定的解密 `keyName` 会覆盖该嵌入的引用。component 必须能够访问对应的解密密钥；覆盖名称并不能让一个无关的密钥变为有效。

若要使密钥引用不出现在文档中：

```javascript
const ciphertext = await client.crypto.encrypt("A message to encrypt", {
  componentName: "crypto-local",
  keyName: "symmetric256",
  keyWrapAlgorithm: "A256KW",
  omitDecryptionKeyName: true,
});

const plaintext = await client.crypto.decrypt(ciphertext, {
  componentName: "crypto-local",
  keyName: "symmetric256",
});
```

请在异步函数或 ES 模块中，结合已有的 `client` 运行此代码片段。若未显式指定解密 `keyName`，则无法解密此文档。

当接收方以不同的引用知道同一密钥时（例如别名，或另一个已配置 component 中的密钥），请改用 `decryptionKeyName`：

```javascript
const ciphertext = await client.crypto.encrypt("A message for a recipient", {
  componentName: "sender-crypto",
  keyName: "sender-key",
  keyWrapAlgorithm: "RSA",
  decryptionKeyName: "recipient-key",
});

const plaintext = await client.crypto.decrypt(ciphertext, {
  componentName: "recipient-crypto",
});
```

此示例需要分别配置的 component 以及一对匹配的 RSA 密钥对：发送方必须能够使用公钥进行包装，接收方必须能够使用对应的私钥进行解包。`decryptionKeyName` 仅会更改嵌入的引用；它不会创建、复制或轮换密钥。

## 流与内存使用

调用 `encrypt(options)` 或 `decrypt(options)` 会解析为一个 `Duplex`，而不是已完成的操作结果。其可写端接收输入，可读端输出结果。应在提供输入的同时消费输出，并在输入结束时结束可写端。建议使用 `node:stream/promises` 中的 `await pipeline(source, cryptoStream, destination)`，以传播错误并关闭所有参与的流。

[文件示例]({{% ref js-cryptography-howto.md %}}#encrypt-and-decrypt-files-with-streams)演示了这一模式。处理密文时请以二进制模式传输数据。不要为密文源设置文本编码，也不要将加密输出当作文本处理。

数据型重载会在内存中累积完整结果，即使 gRPC 在内部使用流也是如此。仅当输入和输出可以充分放入内存时才使用它们。

- **HTTP：** SDK 同时支持两种重载，并发送原始字节，但 Dapr 会在读取完请求之前缓冲加密输出。请勿在输入结束前等待输出。对于大负载和生产环境的流式处理，建议使用 gRPC。
- **gRPC：** 使用双向流，并将写入拆分为 2 KiB 的请求块。加密 API 没有可配置的 `chunkSize`。当前的流实现可能会在内部对输入和输出进行排队；不要假定使用流就能在任意生产者或消费者速度下保证内存有界。
- **空输入：** HTTP 在两种重载下都支持空明文。在 `3.19.0` 的 gRPC 实现中，选项随第一个非空输入块一起发送，因此空输入不会发送初始的选项帧。对于空明文，请使用 HTTP，而不要依赖 gRPC 的空输入行为。

只要 component 能够访问正确的密钥，通过 HTTP 生成的密文可以通过 gRPC 解密，反之亦然。该文档使用的是 Dapr 的加密格式，而不是裸的 AES 或 RSA 密文。

## 取消与错误

`EncryptRequest` 和 `DecryptRequest` 没有 `AbortSignal`、超时或取消令牌选项。不要假定其他 building block 的取消支持同样适用于加密。销毁 HTTP 加密 `Duplex` 会中止其底层请求；gRPC 加密重载并未提供等效的请求取消选项。仅通过让 Promise 竞速实现的超时并不会取消操作。

请等待数据型操作并处理其被拒绝的 Promise。对于流，错误可能会在 Promise 已返回 `Duplex` 之后才发生，因此仅等待 `client.crypto.encrypt(options)` 是不够的。请等待整个管道并处理其拒绝。

component 缺失、密钥缺失或不兼容、算法不受支持、密文格式错误，以及解密时的身份验证失败，都会导致操作失败，而不会返回空的成功结果。HTTP 运行时错误是 `Error` 实例，其消息中包含带有 `status`、`error` 和 `error_msg` 的 JSON；网络错误与流错误的结构可能不同。gRPC 错误来自 Connect 传输层，不应将其解释为 HTTP 状态码。

失败或被取消的文件管道可能会留下不完整的输出文件。请删除该文件或以其他方式处理，并且在整个操作成功之前，不要将解密输出视为完整。

## 并发操作

受 [dapr/kit#170](https://github.com/dapr/kit/issues/170) 影响的运行时，在解密与其他加密操作重叠时可能会失败。在受影响的 sidecar 上，应将解密与所有其他加密工作（包括加密）串行化，覆盖共享该 sidecar 的所有调用方。仅在单个函数或单个客户端内串行化，无法防范其他调用方。

具体而言，应在开始解密之前完成加密，而不是将两者串入同一管道，或使用 `Promise.all` 进行往返操作。在启用重叠操作之前，请先检查该 issue 及你的运行时版本。

## 相关链接

- [加密操作指南]({{% ref js-cryptography-howto.md %}})
- [cryptography building block]({{% ref cryptography-overview %}})
- [加密 component]({{% ref supported-cryptography %}})
- [加密 API 参考]({{% ref cryptography_api.md %}})
