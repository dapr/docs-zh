---
type: docs
title: "Configuration overview"
linkTitle: "概述"
weight: 1000
description: "Configuration API 构建块概述"
---

在编写应用程序时，消费应用程序配置是一项常见任务。配置存储通常用于管理这些配置数据。配置项通常是动态的，并且与消费它的应用程序的需求紧密耦合。

例如，应用程序配置可能包括：
- 密钥名称
- 不同的标识符
- 分区或消费者 ID
- 要连接的数据库名称等

通常，配置项以键/值对的形式存储在状态存储或数据库中。开发人员或运维人员可以在运行时更改配置存储中的应用程序配置。更改完成后，会通知服务加载新配置。

从应用程序 API 的角度来看，配置数据是只读的，配置存储的更新通过运维工具完成。使用 Dapr 的 Configuration API，您可以：
- 消费以只读键/值对形式返回的配置项
- 订阅配置项更改通知

<img src="/images/configuration-api-overview.png" width=900>

{{% alert title="Note" color="primary" %}}
Configuration API 不应与 [Dapr 边车和控制平面配置]({{% ref "configuration-overview" %}}) 混淆，后者用于在 Dapr 边车实例或已安装的 Dapr 控制平面上设置策略和配置。
{{% /alert %}}
## 试用 configuration

### 快速入门

想测试 Dapr configuration API 吗？请参阅以下快速入门，了解配置 API 的实际应用：

| 快速入门 | 描述 |
| ---------- | ----------- |
| [Configuration 快速入门]({{% ref configuration-quickstart %}}) | 使用 configuration API 获取配置项或订阅配置更改。 |

### 在应用程序中直接开始使用 configuration API

想跳过快速入门吗？没问题。您可以在应用程序中直接试用 configuration 构建块来读取和管理配置数据。安装 [Dapr]({{% ref "getting-started/_index.md" %}}) 后，您可以开始使用 configuration API，从 [configuration 操作指南]({{% ref howto-manage-configuration %}}) 开始。

## 观看演示

观看 [Dapr Configuration 构建块使用演示](https://youtu.be/tNq-n1XQuLA?t=496)

{{< youtube id=tNq-n1XQuLA start=496 >}}

## 后续步骤
按照这些指南操作：
- [如何：从配置存储读取应用程序配置]({{% ref howto-manage-configuration %}})
