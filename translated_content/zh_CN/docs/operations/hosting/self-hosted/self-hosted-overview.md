---
type: docs
title: "Dapr 自托管模式概述"
linkTitle: "概述"
weight: 10000
description: "如何在 Windows/Linux/MacOS 机器上运行 Dapr 的概述"
---

## 概述

Dapr 可以配置为在本地开发机器或生产虚拟机上的自托管模式下运行。每个运行的服务都有一个 Dapr 运行时进程（或边车），配置为使用状态存储、发布订阅、绑定组件和其他构建块。

## 初始化

Dapr 可以使用 [Docker]({{% ref self-hosted-with-docker.md %}})（默认）或 [slim-init 模式]({{% ref self-hosted-no-docker.md %}}) 进行初始化。它也可以在[离线或隔离网络环境]({{% ref self-hosted-airgap.md %}})中初始化和运行。

{{% alert title="注意" color="warning" %}}
您也可以使用 [Podman](https://podman.io/) 代替 Docker 作为容器运行时。有关更多详细信息，请参阅[使用 Podman 进行 dapr init]({{% ref self-hosted-with-podman.md %}})。这在由于各种网络约束而无法安装 Docker 的场景中很有用。
{{% /alert %}}

默认的 Docker 设置提供开箱即用的功能，包括以下容器和配置：
- 配置为充当状态管理和发布/订阅的默认组件的 Redis 容器。
- 用于诊断和链路追踪的 Zipkin 容器。
- 安装在 `$HOME/.dapr/`（Mac/Linux）或 `%USERPROFILE%\.dapr\`（Windows）中的默认 Dapr 配置和组件。

`dapr-placement` 服务负责管理 Actor 分布方案和键范围设置。此服务不会作为容器启动，仅在使用 Dapr Actor 时才需要。有关 Actor `Placement` 服务的更多信息，请阅读 [Actor 概述]({{% ref "actors-overview.md" %}})。

<img src="/images/overview-standalone-docker.png" width=1000 alt="Dapr 在自托管 Docker 模式下的示意图" />

## 使用 Dapr 启动应用程序

您可以使用 [`dapr run` CLI 命令]({{% ref dapr-run.md %}}) 与您的应用程序一起启动一个 Dapr 边车进程。可以在[此处]({{% ref arguments-annotations-overview.md %}})找到其他参数和标志。

## 名称解析

Dapr 使用[名称解析组件]({{% ref supported-name-resolution %}})在[服务调用]({{% ref service-invocation %}})构建块中进行服务发现。默认情况下，Dapr 在自托管模式下使用 mDNS。

如果您在虚拟机上运行 Dapr 或 mDNS 不可用，则可以使用 [HashiCorp Consul]({{% ref setup-nr-consul.md %}}) 组件进行名称解析。
