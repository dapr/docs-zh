---
type: docs
title: "操作指南：使用 Dapr JavaScript SDK 加密和解密数据"
linkTitle: "加密和解密数据"
weight: 54050
description: 配置加密 component，并使用 Dapr JavaScript SDK 加密和解密消息与文件
---

使用 `DaprClient.crypto` 可以在不向应用传递加密密钥的情况下加密和解密数据。本指南先使用本地密钥进行开发，然后介绍如何处理缓冲区和文件。

## 前提条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化的 [Dapr environment]({{% ref install-dapr-selfhost.md %}})，且其运行时需支持 alpha 的加密 API
- [Node.js](https://nodejs.org/) 18 或更高版本；建议使用受支持的 LTS 发行版
- [`@dapr/dapr`](https://www.npmjs.com/package/@dapr/dapr) 包，**版本 3.19.0 或更高**
- 已配置的[加密 component]({{% ref supported-cryptography %}})，以及与所选密钥包装算法兼容的密钥

在应用目录中，如果尚未初始化 npm 项目，请先初始化，然后安装 SDK：

```sh
npm init -y
npm install @dapr/dapr@3.19.0
```

示例使用 JavaScript ES 模块，并以 `.mjs` 文件运行，无需 TypeScript 编译器。同样的 API 也可以在 TypeScript 中使用。

## 配置本地加密 component

创建 `keys` 目录，并生成一个随机的 256 位对称密钥：

```sh
node -e "const fs = require('node:fs'); fs.mkdirSync('keys', { recursive: true }); fs.writeFileSync(require('node:path').join('keys', 'symmetric256'), require('node:crypto').randomBytes(32));"
```

此命令仅用于初始设置。重新运行它会替换密钥，除非你保留了旧密钥的副本，否则将无法解密使用之前密钥加密的数据。

创建单独的 `components` 目录，并将以下内容保存为 `components\crypto.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: crypto-local
spec:
  type: crypto.dapr.localstorage
  version: v1
  metadata:
    - name: path
      value: '.\keys'
```

路径会从 sidecar 的工作目录开始解析。请在应用目录中运行后面的命令；对于其他部署方式，请将路径设置为 sidecar 可访问的目录。

component 名称 `crypto-local` 即客户端使用的 `componentName`。密钥名称 `symmetric256` 是密钥目录中的文件名。本示例将 256 位对称密钥与 `A256KW` 密钥包装算法配合使用。

{{% alert title="仅限本地开发" color="warning" %}}
local storage component 会让 sidecar 能够访问原始密钥材料。请限制对密钥目录的访问，并切勿把密钥提交到源代码管理中。在生产环境中，请考虑使用受支持的密钥保管库 component，并借助该提供方的工具来配置密钥。有关受支持的密钥格式，请参阅[local storage component 参考]({{% ref "reference/components-reference/supported-cryptography/local-storage.md" %}})。
{{% /alert %}}

## 加密和解密消息

将以下内容保存为 `app.mjs`：

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "3500",
  communicationProtocol: CommunicationProtocolEnum.HTTP,
});

try {
  const plaintext = Buffer.from("A message to encrypt", "utf8");
  const ciphertext = await client.crypto.encrypt(plaintext, {
    componentName: "crypto-local",
    keyName: "symmetric256",
    keyWrapAlgorithm: "A256KW",
  });

  const decrypted = await client.crypto.decrypt(ciphertext, {
    componentName: "crypto-local",
  });

  if (!decrypted.equals(plaintext)) {
    throw new Error("Decrypted bytes do not match the original message");
  }
  console.log("Message round-trip succeeded");
} finally {
  await client.stop();
}
```

使用加载了该 component 的 sidecar 启动应用：

```sh
dapr run --app-id crypto-example --dapr-http-port 3500 --dapr-grpc-port 50001 --resources-path .\components -- node app.mjs
```

传入数据和选项时，加密和解密都会返回 `Promise<Buffer>`。加密同样接受字符串，并按 UTF-8 编码。解密默认使用加密文档中嵌入的密钥引用，因此本示例无需再次提供 `keyName`。

若要通过 gRPC 运行同一示例，请将 `communicationProtocol` 改为 `CommunicationProtocolEnum.GRPC`，并将 `daprPort` 改为 `"50001"`。

## 使用流加密和解密文件

对于文件，只需传入选项对象，即可获得 Node.js 的 `Duplex`。将明文写入加密流，并从中读取密文；解密流接收密文，并输出明文。

创建一个非空的 `plaintext.txt` 文件，放在应用目录中，并将本示例保存为 `files.mjs`。它使用 gRPC，这是处理大负载和生产环境流式处理时推荐的协议：

```javascript
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
});

try {
  await pipeline(
    createReadStream("plaintext.txt"),
    await client.crypto.encrypt({
      componentName: "crypto-local",
      keyName: "symmetric256",
      keyWrapAlgorithm: "A256KW",
    }),
    createWriteStream("ciphertext.out"),
  );

  await pipeline(
    createReadStream("ciphertext.out"),
    await client.crypto.decrypt({ componentName: "crypto-local" }),
    createWriteStream("plaintext.out"),
  );

  console.log("Encrypted ciphertext.out and decrypted plaintext.out");
} finally {
  await client.stop();
}
```

使用相同的 component 和端口运行：

```sh
dapr run --app-id crypto-files-example --dapr-http-port 3500 --dapr-grpc-port 50001 --resources-path .\components -- node files.mjs
```

分别等待每个管道，可以让失败正确传播，并确保加密在解密开始之前完成。每次操作都使用新的流。在存在[并发加密限制]({{% ref js-cryptography-client-usage.md %}}#concurrent-operations)的运行时上，不要把加密和解密合并到同一个管道中。

流式重载同样可以通过 HTTP 使用，但运行时会在整个输入全部到达之前缓冲 HTTP 输出。流式形式的 API 并不能消除运行时的这部分内存开销。

## 后续步骤

请阅读[客户端使用指南]({{% ref js-cryptography-client-usage.md %}})，了解如何选择加密算法、控制嵌入的密钥引用、保留二进制密文以及处理错误。更多示例请参阅[加密 Quickstart]({{% ref cryptography-quickstart %}})。
