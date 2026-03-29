---
type: docs
title: "Dapr Go SDK"
linkTitle: "Go"
weight: 1000
description: 用于开发 Dapr 应用程序的 Go SDK 软件包
no_list: true
cascade:
  github_repo: https://github.com/dapr/go-sdk
  github_subdir: daprdocs/content/en/go-sdk-docs
  path_base_for_github_subdir: content/en/developing-applications/sdks/go/
  github_branch: main
---

一个用于在 Go 中构建 Dapr 应用程序的客户端库。该客户端支持所有公共 Dapr API，同时注重地道的 Go 体验和开发者生产力。

{{% cardpane %}}
{{% card title="**客户端**"%}}
  使用 Go 客户端 SDK 来调用公共 Dapr API

  [了解更多关于 Go 客户端 SDK 的信息]({{% ref go-client %}})
{{% /card %}}
{{% card title="**服务**"%}}
  使用 Go 语言的 Dapr 服务（回调）SDK 来创建将被 Dapr 调用的服务。

  [了解更多关于 Go 服务（回调）SDK 的信息]({{% ref go-service %}})
{{% /card %}}
{{% /cardpane %}}
