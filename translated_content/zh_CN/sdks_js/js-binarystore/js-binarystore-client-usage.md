---
type: docs
title: "二进制存储客户端用法"
linkTitle: "客户端用法"
weight: 53100
description: "配置与使用 JavaScript 二进制存储客户端的基本指导"
---

二进制存储在 JavaScript SDK 3.19.0 或更高版本中可通过 `DaprClient.binaryStore` 使用，并且需要 Dapr 运行时 1.19 或更高版本。HTTP 和 gRPC 都使用 Alpha 阶段的二进制存储 API。

## 客户端生命周期与配置

复用长期存活的 `DaprClient`，而不是为每个操作创建一个客户端。在应用关闭期间调用 `await client.stop()` 之前，先等待尚未完成的操作结束。

默认协议为 HTTP。要显式配置 gRPC 连接：

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
  daprApiToken: process.env.DAPR_API_TOKEN,
});
```

使用 HTTP 时，请使用 `CommunicationProtocolEnum.HTTP` 以及边车的 HTTP 端口（默认为 `"3500"`）。端口值必须以字符串形式提供。

当你省略显式的主机和端口选项时，SDK 可以为所选协议使用 `DAPR_HTTP_ENDPOINT` 或 `DAPR_GRPC_ENDPOINT`。否则，它会使用已配置的主机和端口，并回退到 `127.0.0.1` 以及 `DAPR_HTTP_PORT` 或 `DAPR_GRPC_PORT`（默认值分别为 `3500` 和 `50001`）。如果未提供 `daprApiToken`，API 令牌默认取自 `DAPR_API_TOKEN`。二进制存储请求使用与其他客户端操作相同的认证设置。

## 选择操作

所有方法都接受组件名称和相对于存储的文件名。可选的选项对象作为最后一个参数。

| 方法 | 内容或目标 | 结果 |
|------|------------|------|
| `setBinaryFile(storeName, fileName, content, options?)` | `Uint8Array`、`Buffer` 或二进制 Node.js `Readable` | `Promise<void>` |
| `getBinaryFile(storeName, fileName, destination, options?)` | Node.js `Writable` | `Promise<void>` |
| `getBinaryFileBytes(storeName, fileName, options?)` | 无目标；缓冲整个文件 | `Promise<Buffer>` |
| `getBinaryFileChunks(storeName, fileName, options?)` | 无目标；按顺序产出数据块 | `AsyncIterable<Buffer>` |
| `deleteBinaryFile(storeName, fileName, options?)` | 无内容或目标 | `Promise<void>` |

TypeScript 应用可以从 `@dapr/dapr` 以类型形式导入 `IClientBinaryStore`、`BinaryStoreOptions` 和 `BinaryStoreSetOptions`。`BinaryStoreOptions` 包含 `signal?: AbortSignal`。上传接受 `BinaryStoreSetOptions`，它还提供 `overwrite?: boolean` 和 `chunkSize?: number`。

## 流式处理与内存使用

上传大文件时，请使用二进制 `Readable`，例如 `createReadStream`。源流必须输出 `Uint8Array` 或 `Buffer` 数据块，而不能是字符串。不要为源流设置文本编码。初始校验成功后，客户端会从源流的当前位置开始读取，并在上传完成或失败时销毁该源流。如果校验失败，或者在传输开始前 signal 已被中止，则调用方仍需负责关闭源流。每次尝试都要创建新的源流。

上传的数据块大小默认为 32 KiB。自定义的 `chunkSize` 必须是正的安全整数。较小的数据块并不会绕过组件的文件大小或总容量限制。

`getBinaryFile` 使用流管道，并遵循目标端的背压。成功时它会结束目标，失败时会销毁目标。不要将该目标用于另一次下载。失败的下载可能会留下不完整的本地文件，你的应用应删除该文件或以其他方式处理。

`getBinaryFileChunks` 让你在每个 `Buffer` 到达时逐个处理。请使用 `for await...of` 消费它；跳出循环会关闭响应流。下载数据块的大小由运行时和传输层决定，而不是由上传时的 `chunkSize` 决定。

只有当整个文件可以轻松放入内存时，才使用 `getBinaryFileBytes`。它会累积所有数据块并拼接为一个 `Buffer`，因此内存峰值可能超过文件大小。

## 取消

每个二进制存储操作都在其选项对象中接受 `signal`。当调用方断开连接或应用的截止时间到期时，请传入 `AbortSignal` 来取消工作。例如，为一次下载添加 30 秒的截止时间：

```javascript
import { createWriteStream } from "node:fs";

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30_000);

try {
  await client.binaryStore.getBinaryFile(
    "filestore",
    "uploads/report.pdf",
    createWriteStream("downloaded-report.pdf"),
    { signal: controller.signal },
  );
} finally {
  clearTimeout(timeout);
}
```

此代码片段假定已存在 `client`。请将 import 语句放在模块作用域中，并在 async 函数或 ES 模块内运行其余代码。取消会使操作被拒绝，并可能销毁相关的流。不要假设所有协议都使用相同的错误类来报告取消。

对于数据块的遍历，请将 signal 直接传给 `getBinaryFileChunks` 本身。此示例会创建一个全新的 30 秒超时信号：

```javascript
for await (const chunk of client.binaryStore.getBinaryFileChunks(
  "filestore",
  "uploads/report.pdf",
  { signal: AbortSignal.timeout(30_000) },
)) {
  console.log("Received bytes:", chunk.length);
}
```

## 错误

请对每个操作使用 await，并在应用的错误边界处理失败。对于 `getBinaryFileChunks`，错误会在迭代过程中抛出，因此错误处理必须包围 `for await...of` 循环。

运行时失败会直接拒绝（reject），而不会返回看似成功的默认值。例如：向已存在的文件上传且未设置 `overwrite: true`、下载或删除不存在的文件、组件缺失，以及超出组件容量。

- **HTTP：** 运行时错误是 JavaScript `Error` 实例，其 `message` 为一个 JSON 字符串，包含 `status`（HTTP 状态码）、`error`（状态文本）和 `error_msg`（运行时响应体）。传输和流错误的结构可能不同；不要假设每条错误消息都是 JSON。
- **gRPC：** 运行时错误保留 `@connectrpc/connect` 中的 `ConnectError` 错误码。不要将它们当作 HTTP 状态码处理。
- **无效参数：** 空的存储名或文件名、无效的文件路径段或字符、不支持的内容类型，或不是 `Writable` 的目标，都会导致 `TypeError`。无效的上传数据块大小会导致 `RangeError`。非二进制的源数据块会在传输过程中被拒绝；传输层可能会包装底层的 `TypeError`。

有关运行时错误语义，请参阅[二进制存储 API 参考]({{% ref binary_store_api.md %}})；有关文件名限制和完整设置，请参阅[操作指南]({{% ref js-binarystore-howto.md %}})。
