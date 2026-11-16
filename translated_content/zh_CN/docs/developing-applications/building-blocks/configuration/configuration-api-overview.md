---
type: docs
title: "配置概述"
linkTitle: "概述"
weight: 1000
description: "配置 API 构建块概述"
---

在编写应用程序时，消费应用程序配置是一项常见任务。配置存储通常用于管理这些配置数据。配置项通常是动态的，并且与消费它的应用程序的需求紧密耦合。

例如，应用程序配置可以包括：
- 密钥名称
- 不同的标识符
- 分区或消费者 ID
- 要连接的数据库名称等

通常，配置项以键/值对的形式存储在 state store 或数据库中。开发人员或运维人员可以在运行时更改配置存储中的应用程序配置。更改完成后，会通知服务加载新配置。

从应用程序 API 的角度来看，配置数据是只读的，配置存储的更新通过运维工具完成。借助 Dapr 的配置 API，你可以：
- 消费以只读键/值对形式返回的配置项
- 订阅配置项的变更

{{< diagram configuration-api-overview >}}

{{% alert title="Note" color="primary" %}}
配置 API 不应与 [Dapr 边车和控制平面配置]({{% ref "configuration-overview" %}}) 混淆，后者用于在 Dapr 边车实例或已安装的 Dapr 控制平面上设置策略和配置。
{{% /alert %}}

## 试用配置 API

### 快速入门

想测试一下 Dapr 配置 API 吗？请按照以下快速入门，了解配置 API 的实际应用：

| 快速入门 | 描述 |
| ---------- | ----------- |
| [Configuration 快速入门]({{% ref configuration-quickstart %}}) | 使用配置 API 获取配置项或订阅配置更改。 |

### 在应用程序中直接开始使用配置 API

不想先看快速入门？没问题。你可以直接在应用程序中试用配置构建块，读取和管理配置数据。在安装 [Dapr]({{% ref "getting-started/_index.md" %}}) 之后，你可以从[配置操作指南]({{% ref howto-manage-configuration %}})开始使用配置 API。

## 观看演示

观看[这段使用 Dapr 配置构建块的演示](https://youtu.be/tNq-n1XQuLA?t=496)

{{< youtube id=tNq-n1XQuLA start=496 >}}

## 后续步骤
按照以下指南操作：
- [操作指南：从配置存储读取应用程序配置]({{% ref howto-manage-configuration %}})
