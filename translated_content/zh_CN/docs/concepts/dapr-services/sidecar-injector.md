---
type: docs
title: "Dapr Sidecar Injector 控制平面服务概述"
linkTitle: "Sidecar injector"
description: "Dapr sidecar 注入器进程概述"
---

当在 [Kubernetes 模式]({{% ref kubernetes %}}) 下运行 Dapr 时，会创建一个运行 Dapr Sidecar Injector 服务的 Pod，该服务会查找使用 [Dapr 注解]({{% ref arguments-annotations-overview %}}) 初始化的 Pod，然后在该 Pod 中为 [daprd 服务]({{% ref sidecar %}}) 创建另一个容器

## 运行 sidecar 注入器

sidecar 注入器服务作为 `dapr init -k` 的一部分部署，或通过 Dapr Helm Chart 部署。有关在 Kubernetes 上运行 Dapr 的更多信息，请访问 [Kubernetes 托管页面]({{% ref kubernetes %}})。
