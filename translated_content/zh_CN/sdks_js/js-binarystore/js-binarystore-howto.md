---
type: docs
title: "操作指南：使用 Dapr JavaScript SDK 管理二进制文件"
linkTitle: "操作指南：管理二进制文件"
weight: 53050
description: 了解如何使用 Dapr JavaScript SDK 存储、读取、流式传输和删除二进制文件
---

使用 `DaprClient.binaryStore` 通过 Dapr 二进制存储组件存储和读取文件。该客户端支持二进制流，因此你可以在不将整个文件加载到应用内存的情况下传输大文件。本指南涵盖组件配置、上传、下载、覆盖和删除。

## 前提条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化的 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})，且 Dapr 运行时为 1.19 或更高版本
- [Node.js](https://nodejs.org/) 18 或更高版本
- [`@dapr/dapr`](https://www.npmjs.com/package/@dapr/dapr) 包，版本 3.19.0 或更高
- 已配置的[二进制存储组件]({{% ref "developing-applications/building-blocks/binarystore/_index.md" %}})，例如下文的内存组件

在应用目录中，如果还没有 npm 项目，请先初始化一个，然后安装 SDK：

```sh
npm init -y
npm install @dapr/dapr@3.19.0
```

示例使用 JavaScript ES 模块，并以 `.mjs` 文件运行，无需 TypeScript 编译器。相同的 API 也可以在 TypeScript 中使用。

## 配置内存二进制存储

在应用目录中创建 `components` 目录，并将以下内容保存为 `components\filestore.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: filestore
spec:
  type: binarystore.in-memory
  version: v1
  metadata:
    - name: maxSize
      value: "4Mi"
    - name: maxTotalSize
      value: "512Mi"
```

该组件将文件存储在边车的内存中，单个文件上限为 4 MiB，总容量为 512 MiB。边车停止后文件会丢失，且不会在多个边车之间共享。它适用于本地开发和测试，不适用于持久化存储。容量设置请参阅[内存组件参考]({{% ref binarystore-in-memory.md %}})。

组件的 `metadata.name`（即 `filestore`）是每次客户端操作时传入的存储名称。它不是组件的类型，也不是 YAML 文件名。

## 上传和下载文件

在应用的工作目录中放置一个不超过 4 MiB 的 `report.pdf` 文件。将以下内容保存为 `app.mjs`：

```javascript
import { createReadStream, createWriteStream } from "node:fs";
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "3500",
  communicationProtocol: CommunicationProtocolEnum.HTTP,
});

const storeName = "filestore";
const fileName = "uploads/report.pdf";

try {
  await client.binaryStore.setBinaryFile(
    storeName,
    fileName,
    createReadStream("report.pdf"),
  );

  await client.binaryStore.getBinaryFile(
    storeName,
    fileName,
    createWriteStream("downloaded-report.pdf"),
  );

  console.log("Downloaded report.pdf to downloaded-report.pdf");
} finally {
  await client.stop();
}
```

使用加载了 `components` 中组件的 Dapr 边车启动应用：

```sh
dapr run --app-id binary-store-example --dapr-http-port 3500 --dapr-grpc-port 50001 --resources-path .\components -- node app.mjs
```

该示例将 `report.pdf` 以存储相对名称 `uploads/report.pdf` 上传，并下载为 `downloaded-report.pdf`。`getBinaryFile` 会等待目标流写入完成，并在成功时结束该流。

如需改用 gRPC，请将 `communicationProtocol` 改为 `CommunicationProtocolEnum.GRPC`，并将 `daprPort` 改为 `"50001"`。所有二进制存储方法在两种协议下都可以使用。

后续示例会复用 `client`、`storeName` 和 `fileName`。请将它们添加到 `try` 块中，位于下载之后、客户端停止之前。最后运行删除示例。如果你在仍保存该文件的边车上重新运行应用，请先删除该文件，或显式启用覆盖。

## 替换已有文件

上传默认不会覆盖已有文件。要替换文件，请在选项对象中传入 `overwrite: true`：

```javascript
await client.binaryStore.setBinaryFile(
  storeName,
  fileName,
  createReadStream("report.pdf"),
  { overwrite: true, chunkSize: 64 * 1024 },
);
```

上传默认的最大分块大小为 32 KiB。将 `chunkSize` 设为另一个正安全整数（单位为字节），即可调整上传分块。这不会改变组件的单文件或总容量限制。

文件名可以包含嵌套路径，例如 `uploads/report.pdf`。请勿使用开头或结尾的斜杠、空路径段、`.` 或 `..` 段，也不要使用字符 `\`、`*`、`?`、`[`、`]` 和 `#`。请以纯文本形式传递名称，而不是 URL 或预先编码的值；HTTP 客户端会对其进行 URL 编码。

## 处理内存中的内容

对于已经位于内存中的小文件，可以上传 `Uint8Array` 或 Node.js `Buffer`。使用 `getBinaryFileBytes` 以 `Buffer` 的形式获取完整文件：

```javascript
const content = Buffer.from([0x00, 0x80, 0xff]);
await client.binaryStore.setBinaryFile(storeName, "data.bin", content);

const downloaded = await client.binaryStore.getBinaryFileBytes(
  storeName,
  "data.bin",
);
console.log("Bytes match:", downloaded.equals(content));
```

SDK 直接传输原始字节，不做 JSON 序列化或文本编码。支持空文件；例如，上传 `Buffer.alloc(0)` 即可创建一个空文件。

`getBinaryFileBytes` 会将整个下载内容缓冲到内存中。对于大文件，请优先使用 `getBinaryFile` 或 `getBinaryFileChunks`。

## 分块读取文件

`getBinaryFileChunks` 返回 `AsyncIterable<Buffer>`。使用 `for await...of` 消费它，即可按顺序处理字节，而无需缓冲整个文件：

```javascript
let totalBytes = 0;
for await (const chunk of client.binaryStore.getBinaryFileChunks(
  storeName,
  fileName,
)) {
  totalBytes += chunk.length;
}
console.log("Downloaded bytes:", totalBytes);
```

不同协议之间的分块边界可能不同，并且不一定与上传分块一致。跳出循环会关闭下载流。

## 删除文件

```javascript
await client.binaryStore.deleteBinaryFile(storeName, fileName);
await client.binaryStore.deleteBinaryFile(storeName, "data.bin");
```

如果文件不存在，下载和删除操作都会失败，而不会返回空内容或静默成功。

## 后续步骤

阅读[客户端使用指南]({{% ref js-binarystore-client-usage.md %}})，了解取消操作、流的所有权、客户端配置和错误处理。
