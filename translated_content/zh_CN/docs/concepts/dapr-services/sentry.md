---
type: docs
title: "Dapr Sentry control plane 服务概述"
linkTitle: "Sentry"
description: "Dapr Sentry 服务概述"
---

Dapr Sentry 服务管理服务之间的 mTLS，并充当证书颁发机构。它生成 mTLS 证书并将其分发给所有正在运行的 sidecar，使 sidecar 能够使用加密的 mTLS 流量进行通信。更多信息请阅读 [sidecar 到 sidecar 通信概述]({{% ref "security-concept#sidecar-to-sidecar-communication" %}})。

在 Kubernetes 上，Sentry 还会把请求方 Pod 的[容器镜像引用]({{% ref "security-concept#container-image-references-in-workload-certificates" %}})以自定义 X.509 扩展的形式写入其签发的每一份工作负载证书中，使下游系统能够验证各工作负载身份背后软件的供应链溯源信息。

## 自托管模式

Sentry 服务的 Docker 容器不会作为 [`dapr init`]({{% ref self-hosted-with-docker %}}) 的一部分自动启动。但可以按照设置[双向 TLS]({{% ref "mtls#self-hosted" %}})的说明手动运行它。

如果你在 [slim-init 模式]({{% ref self-hosted-no-docker %}})下运行，也可以将它作为进程手动启动。

{{< diagram name="sentry-selfhosted" width="70" >}}

## Kubernetes 模式

Sentry 服务作为 `dapr init -k` 的一部分部署，或通过 Dapr Helm charts 部署。有关在 Kubernetes 上运行 Dapr 的更多信息，请访问 [Kubernetes 托管页面]({{% ref kubernetes %}})。

{{< diagram sentry-kubernetes >}}

## 附加的 sentry 容器参数

使用 Helm 值 `dapr_sentry.extraArgs` 向 sentry 容器传递额外的命令行参数。对于没有专用 Helm 值的 sentry 标志，应使用此值传递。该值是字符串列表，默认为 `[]`。Dapr 会将每个参数追加到内置的 sentry 容器参数之后。

```yaml
dapr_sentry:
  extraArgs:
    - "--jwt-ttl=48h"
    - "--healthz-listen-address=127.0.0.1"
```

`--healthz-listen-address` 用于设置 sentry healthz 服务器的监听地址，`--metrics-listen-address` 用于设置其 metrics 服务器的地址。两者默认都监听所有网络接口。

## 延伸阅读

- [安全概述]({{% ref security-concept %}})
- [自托管模式]({{% ref self-hosted-with-docker %}})
- [Kubernetes 模式]({{% ref kubernetes %}})
