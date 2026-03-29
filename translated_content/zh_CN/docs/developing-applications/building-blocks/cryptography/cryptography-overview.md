---
type: docs
title: Cryptography 概述
linkTitle: 概述
weight: 1000
description: "Dapr Cryptography 概述"
---

通过 cryptography 构建块，您可以以安全且一致的方式使用加密功能。Dapr 公开的 API 允许您在密钥保管库或 Dapr 边车中执行加密和解密等操作，而不会将加密密钥暴露给您的应用程序。

## 为什么需要 Cryptography？

应用程序广泛使用加密技术，如果实施正确，即使数据泄露，也能使解决方案更加安全。在某些情况下，您可能需要使用加密来满足行业法规（例如金融领域）或法律要求（包括 GDPR 等隐私法规）。

然而，正确使用加密技术可能很困难。您需要：

- 选择正确的算法和选项
- 学习正确管理和保护密钥的方法
- 在希望限制对加密密钥材料的访问时处理操作复杂性

安全的一个重要要求是限制对加密密钥的访问，这通常被称为"原始密钥材料"。Dapr 可以与密钥保管库（如 Azure Key Vault，未来的版本将支持更多组件）集成，这些保管库在安全飞地中存储密钥并在保管库内执行加密操作，而不会将密钥暴露给您的应用程序或 Dapr。

或者，您可以配置 Dapr 为您管理加密密钥，在边车内执行操作，同样不会将原始密钥材料暴露给您的应用程序。

## Dapr 中的 Cryptography

使用 Dapr，您可以执行加密操作而不会将加密密钥暴露给您的应用程序。

<img src="/images/cryptography-overview.png" width=1000 style="padding-bottom:15px;" alt="显示 Dapr 加密如何与您的应用程序配合工作的图表">

通过使用 cryptography 构建块，您可以：

- 以更安全的方式更轻松地执行加密操作。Dapr 提供了防止使用不安全算法或使用不安全选项的防护措施。
- 将密钥保存在应用程序之外。应用程序永远不会看到"原始密钥材料"，但可以请求保管库使用密钥执行操作。当使用 Dapr 的加密引擎时，操作在 Dapr 边车内安全执行。
- 实现更好的关注点分离。通过使用外部保管库或加密组件，只有授权团队可以访问私钥材料。
- 更轻松地管理和轮换密钥。密钥在保管库中管理，不在应用程序中，轮换时无需开发人员参与（甚至无需重启应用程序）。
- 支持更好的审计日志，以监控何时使用保管库中的密钥执行了操作。

{{% alert title="Note" color="primary" %}}
虽然 HTTP 和 gRPC 在 alpha 版本中都受支持，但使用 gRPC API 与支持的 Dapr SDK 是使用 cryptography 的推荐方法。
{{% /alert %}}

## 功能特性

### Cryptography 组件

Dapr cryptography 构建块包含两类组件：

- **允许与管理服务或保管库（"密钥保管库"）交互的组件。**   
   类似于 Dapr 如何在各种密钥存储或状态存储之上提供"抽象层"，这些组件允许与各种密钥保管库（如 Azure Key Vault，未来 Dapr 版本将支持更多）交互。使用这些组件时，对私钥的加密操作在保管库内执行，Dapr 永远不会看到您的私钥。

- **基于 Dapr 自身加密引擎的组件。**  
   当密钥保管库不可用时，您可以利用基于 Dapr 自身加密引擎的组件。这些名称中包含 `.dapr.` 的组件在 Dapr 边车内执行加密操作，密钥存储在文件、Kubernetes Secret 或其他来源中。虽然 Dapr 知道私钥，但您的应用程序仍然无法访问它们。

两类组件（无论是利用密钥保管库还是使用 Dapr 中的加密引擎）都提供相同的抽象层。这允许您的解决方案根据需要在各种保管库和/或加密组件之间切换。例如，您可以在开发期间使用本地存储的密钥，在生产环境中使用云保管库。

### Cryptography API

Cryptography API 允许使用 [Dapr Crypto Scheme v1](https://github.com/dapr/kit/blob/main/schemes/enc/v1/README.md) 加密和解密数据。这是一种固执己见的加密方案，旨在使用现代、安全的加密标准，并将数据（包括大文件）作为流高效处理。

## 体验 Cryptography

### 快速入门和教程

想测试 Dapr Cryptography API？请参阅以下快速入门和教程，了解 cryptography 的实际应用：

| 快速入门/教程 | 描述 |
| ------------------- | ----------- |
| [Cryptography 快速入门]({{% ref cryptography-quickstart %}}) | 使用 RSA 和 AES 密钥通过 cryptography API 加密和解密消息和大文件。 |

### 直接在您的应用程序中开始使用 Cryptography

想跳过快速入门？没问题。您可以直接在应用程序中试用 cryptography 构建块来加密和解密您的应用程序。安装 [Dapr]({{% ref "getting-started/_index.md" %}}) 后，您可以开始使用 cryptography API，从 [cryptography 操作指南]({{% ref howto-cryptography %}}) 开始。

## 演示

观看 [Dapr Community Call #83 中 Cryptography API 的演示视频](https://youtu.be/PRWYX4lb2Sg?t=1148)：

{{< youtube id=PRWYX4lb2Sg start=1148 >}}

## 下一步

{{< button text="使用 Cryptography API >>" page="howto-cryptography.md" >}}

## 相关链接
- [Cryptography 概述]({{% ref cryptography-overview %}})
- [Cryptography 组件规格]({{% ref supported-cryptography %}})
- [Cryptography API 参考文档]({{% ref cryptography_api %}})
