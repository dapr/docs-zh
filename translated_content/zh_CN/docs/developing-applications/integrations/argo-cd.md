---
type: docs
title: "操作指南：与 Argo CD 集成"
linkTitle: "Argo CD"
weight: 9000
description: "将 Dapr 集成到您的 GitOps 流水线中"
---

[Argo CD](https://argo-cd.readthedocs.io/en/stable/) 是一个用于 Kubernetes 的声明式、GitOps 持续交付工具。它使您能够通过跟踪 Git 仓库中所需的应用程序状态并自动将其同步到集群来管理 Kubernetes 部署。

## 与 Dapr 集成

您可以使用 Argo CD 来管理 Dapr 控制平面组件和启用 Dapr 的应用程序的部署。通过采用 GitOps 方法，您可以确保 Dapr 的配置和应用程序在您的各个环境中以一致的方式部署、版本化和审计。Argo CD 可以轻松配置为部署存储在 Git 仓库中的 Helm charts、manifests 和 Dapr 组件。

## 示例代码

一个演示使用 Argo CD 部署 Dapr 的示例项目可在 [https://github.com/dapr/samples/tree/master/dapr-argocd](https://github.com/dapr/samples/tree/master/dapr-argocd) 获取。
