---
type: docs
title: "操作指南：与 Argo CD 集成"
linkTitle: "Argo CD"
weight: 9000
description: "将 Dapr 集成到你的 GitOps 流水线中"
aliases:
  - /zh-hans/developing-applications/integrations/argo-cd/
---

[Argo CD](https://argo-cd.readthedocs.io/en/stable/) 是一款面向 Kubernetes 的声明式 GitOps 持续交付工具。它通过跟踪 Git 仓库中声明的应用期望状态，并自动将其同步到你的集群，帮助你管理 Kubernetes 部署。  

## 与 Dapr 集成

你可以使用 Argo CD 管理 Dapr control plane component 以及启用了 Dapr 的应用的部署。采用 GitOps 方式，可以确保 Dapr 的配置和应用在各个环境中一致地部署、版本化并可审计。Argo CD 可以轻松配置为部署 Helm Chart、manifest 以及存储在 Git 仓库中的 Dapr component。

## 示例代码

一个演示如何使用 Argo CD 部署 Dapr 的示例项目可在 [https://github.com/dapr/samples/tree/master/dapr-argocd](https://github.com/dapr/samples/tree/master/dapr-argocd) 获取。
