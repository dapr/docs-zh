---
type: docs
title: "Dapr Sentry 控制平面服务概述"
linkTitle: "Sentry"
description: "Dapr Sentry 服务概述"
---

Dapr Sentry 服务管理服务之间的 mTLS 并充当证书颁发机构。它生成 mTLS 证书并将其分发到所有运行的边车。这使边车能够使用加密的 mTLS 流量进行通信。更多信息请阅读[边车到边车通信概述]({{% ref "security-concept#sidecar-to-sidecar-communication" %}})。

## 自托管模式

Sentry 服务 Docker 容器不会作为 [`dapr init`]({{% ref self-hosted-with-docker %}}) 的一部分自动启动。但可以按照设置[双向 TLS]({{% ref "mtls#self-hosted" %}})的说明手动执行它。

如果你运行在 [slim-init 模式]({{% ref self-hosted-no-docker %}})下，它也可以作为进程手动运行。

<img src="/images/security-mTLS-sentry-selfhosted.png" width=1000>

## Kubernetes 模式

Sentry 服务作为 `dapr init -k` 的一部分部署，或通过 Dapr Helm charts 部署。有关在 Kubernetes 上运行 Dapr 的更多信息，请访问 [Kubernetes 托管页面]({{% ref kubernetes %}})。

<img src="/images/security-mTLS-sentry-kubernetes.png" width=1000>

## 延伸阅读

- [安全概述]({{% ref security-concept %}})
- [自托管模式]({{% ref self-hosted-with-docker %}})
- [Kubernetes 模式]({{% ref kubernetes %}})
