---
type: docs
title: "Dapr Cryptography JavaScript SDK"
linkTitle: "加密"
weight: 140000
description: "使用 Dapr JavaScript SDK 加密和解密数据"
---

Dapr JavaScript SDK 让 Node.js 应用能够通过已配置的加密组件加密和解密消息与文件。可以通过 HTTP 或 gRPC 使用 `DaprClient.crypto`，既可以直接传递数据，也可以处理 Node.js 流。

这些指南面向 **`@dapr/dapr` 3.19.0 或更高版本**。底层的加密 API 处于 Alpha 阶段。对于大负载和生产环境中的流式处理，建议优先使用 gRPC：Dapr 会在请求被完全消费之前缓冲 HTTP 加密输出。

开始使用时，请参阅 [加密操作指南]({{% ref js-cryptography-howto.md %}})。有关配置、支持的输入、加密选项、流处理以及限制，请参阅 [客户端使用指南]({{% ref js-cryptography-client-usage.md %}})。

该客户端通过 [Dapr Crypto Scheme v1](https://github.com/dapr/kit/blob/main/schemes/enc/v1/README.md) 实现加密和解密。它不提供通用的签名、验签、哈希或密钥管理方法。密钥应通过组件的后端存储进行预置；应用程序向 `client.crypto` 传递的是密钥引用，而不是密钥材料。
