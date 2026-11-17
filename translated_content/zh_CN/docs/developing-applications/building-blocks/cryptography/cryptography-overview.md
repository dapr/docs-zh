---
type: docs
title: Cryptography 概述
linkTitle: 概述
weight: 1000
description: "Dapr Cryptography 概述"
---

借助 cryptography building block，你可以以安全且一致的方式利用加密技术。Dapr 提供了一些 API，让你可以在密钥保管库或 Dapr sidecar 内执行加密和解密消息等操作，而无需将加密密钥暴露给你的应用程序。

## 为什么需要 Cryptography？

应用程序广泛使用加密技术。如果实现正确，即使数据遭到泄露，加密也能让解决方案更加安全。在某些情况下，你可能需要使用加密技术以满足行业法规（例如金融领域）或法律要求（包括 GDPR 等隐私法规）。  

然而，正确使用加密技术可能很困难。你需要：

- 选择正确的算法和选项
- 学习正确管理和保护密钥的方法
- 在希望限制对加密密钥材料的访问时，应对运维上的复杂性

安全性的一个重要要求是限制对加密密钥的访问，这通常被称为"原始密钥材料"（raw key material）。Dapr 可以与密钥保管库（如 Azure Key Vault，未来还会支持更多 component）集成。这些保管库将密钥存储在安全飞地中，并在保管库内执行加密操作，从而不会将密钥暴露给你的应用程序或 Dapr。

或者，你也可以配置 Dapr 为你管理加密密钥，在 sidecar 内执行操作，同样不会将原始密钥材料暴露给你的应用程序。

## Dapr 中的 Cryptography

使用 Dapr，你可以执行加密操作，而无需将加密密钥暴露给应用程序。

{{< diagram name="cryptography-overview" width="70" >}}


通过使用 cryptography building block，你可以：

- 更轻松地以安全的方式执行加密操作。Dapr 提供了防护措施，防止使用不安全的算法或不安全的选项。
- 将密钥保存在应用程序之外。应用程序永远不会看到"原始密钥材料"，但可以请求保管库使用密钥执行操作。使用 Dapr 的加密引擎时，操作会在 Dapr sidecar 内安全地执行。
- 实现更好的关注点分离。通过使用外部保管库或加密 component，只有获得授权的团队才能访问私钥材料。
- 更轻松地管理和轮换密钥。密钥在应用程序之外的保管库中管理，轮换时无需开发者参与（甚至无需重启应用程序）。
- 支持更好的审计日志，以便监控何时使用保管库中的密钥执行了操作。

{{% alert title="Note" color="primary" %}}
虽然 alpha 版本同时支持 HTTP 和 gRPC，但对于 cryptography，推荐的做法是通过受支持的 Dapr SDK 使用 gRPC API。
{{% /alert %}}

## 功能特性

### Cryptography component

Dapr cryptography building block 包含两类 component：

- **允许与管理服务或保管库（"密钥保管库"）交互的 component。**   
   与 Dapr 在各种 secret store 或 state store 之上提供"抽象层"类似，这些 component 允许与各种密钥保管库（如 Azure Key Vault，未来的 Dapr 版本将支持更多）交互。使用这些 component 时，私钥的加密操作都在保管库内执行，Dapr 永远不会看到你的私钥。

- **基于 Dapr 自身加密引擎的 component。**  
   当密钥保管库不可用时，你可以利用基于 Dapr 自身加密引擎的 component。这些名称中包含 `.dapr.` 的 component 在 Dapr sidecar 内执行加密操作，密钥则存储在文件、Kubernetes secrets 或其他来源中。虽然 Dapr 知道私钥，但你的应用程序仍然无法访问这些私钥。

两类 component（无论是利用密钥保管库，还是使用 Dapr 中的加密引擎）都提供相同的抽象层。这使你的解决方案能够根据需要在各种保管库和/或加密 component 之间切换。例如，你可以在开发期间使用本地存储的密钥，而在生产环境中使用云端保管库。

### Cryptography API

Cryptography API 允许使用 [Dapr Crypto Scheme v1](https://github.com/dapr/kit/blob/main/schemes/enc/v1/README.md) 加密和解密数据。这是一种有明确设计取向的加密方案，旨在采用现代、安全的加密标准，并能以流的方式高效处理数据（包括大文件）。

## 体验 Cryptography

### Quickstart 和教程

想测试 Dapr Cryptography API？请参阅以下 Quickstart 和教程，了解 cryptography 的实际应用：

| Quickstart/教程 | 描述 |
| ------------------- | ----------- |
| [Cryptography Quickstart]({{% ref cryptography-quickstart %}}) | 使用 RSA 和 AES 密钥，通过 cryptography API 加密和解密消息及大文件。 |

### 直接在你的应用程序中开始使用 Cryptography

不想走 Quickstart？没问题。你可以直接在应用程序中试用 cryptography building block，对应用程序中的数据进行加密和解密。在[安装 Dapr]({{% ref "getting-started/_index.md" %}})之后，你可以从[cryptography 操作指南]({{% ref howto-cryptography %}})开始使用 cryptography API。

## 演示

观看 [Dapr Community Call #83 中 Cryptography API 的演示视频](https://youtu.be/PRWYX4lb2Sg?t=1148)：

{{< youtube id=PRWYX4lb2Sg start=1148 >}}

## 后续步骤

{{< button text="使用 Cryptography API >>" page="howto-cryptography.md" >}}

## 相关链接
- [Cryptography 概述]({{% ref cryptography-overview %}})
- [Cryptography component 规格]({{% ref supported-cryptography %}})
- [Cryptography API 参考文档]({{% ref cryptography_api %}})
