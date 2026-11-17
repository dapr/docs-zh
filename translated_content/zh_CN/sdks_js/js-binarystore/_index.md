---
type: docs
title: "Dapr Binary Store JavaScript SDK"
linkTitle: "Binary Store"
weight: 180100
description: 使用 Dapr JavaScript SDK 存储和检索二进制文件
---

Dapr JavaScript SDK 让 Node.js 应用程序能够在已配置的 Dapr Binary Store component 中存储、检索、流式传输和删除二进制文件。使用 `DaprClient.binaryStore` 并选择 HTTP 或 gRPC 协议，可以流式传输大文件，也可以处理已在内存中的字节数据。

Binary Store 需要 Dapr runtime 1.19 或更高版本，以及 JavaScript SDK 3.19.0 或更高版本。底层的 [Binary Store API]({{% ref binary_store_api.md %}}) 处于 alpha。

要开始使用，请参阅 [Binary Store 操作指南]({{% ref js-binarystore-howto.md %}})。有关配置、内存使用、取消和错误处理，请参阅 [客户端用法指南]({{% ref js-binarystore-client-usage.md %}})。
