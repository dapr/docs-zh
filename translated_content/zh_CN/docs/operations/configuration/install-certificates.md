---
type: docs
title: "操作指南：在 Dapr 边车中安装证书"
linkTitle: "安装边车证书"
weight: 6500
description: "配置 Dapr 边车容器以信任证书"
---

Dapr 边车可以配置为信任用于与外部服务通信的证书。这在需要信任自签名证书的场景中很有用，例如：
- 使用 HTTP binding
- 为边车配置出站代理

同时支持证书颁发机构（CA）证书和叶证书。

{{< tabpane text=true >}}

<!--self-hosted-->
{{% tab "自托管" %}}

当边车作为容器运行时，你可以进行以下配置。

1. 使用卷挂载将证书配置为对边车容器可用。
1. 将边车容器中的环境变量 `SSL_CERT_DIR` 指向包含证书的目录。

> **注意：** 对于 Windows 容器，请确保容器以管理员权限运行，以便它可以安装证书。

以下示例使用 Docker Compose 在边车容器中安装证书（在本地 `./certificates` 目录中存在）：

```yaml
version: '3'
services:
  dapr-sidecar:
    image: "daprio/daprd:edge" # dapr 版本必须至少为 v1.8
    command: [
      "./daprd",
     "-app-id", "myapp",
     "-app-port", "3000",
     ]
    volumes:
        - "./components/:/components"
        - "./certificates:/certificates" # （步骤 1）将证书文件夹挂载到边车容器
    environment:
      - "SSL_CERT_DIR=/certificates" # （步骤 2）将环境变量设置为证书文件夹的路径
    # 对于 Windows 容器，取消下面的注释
    # user: ContainerAdministrator
```

> **注意：** 当边车未在容器内运行时，证书必须直接安装在主机操作系统上。

{{% /tab %}}

<!--kubernetes-->
{{% tab "Kubernetes" %}}

在 Kubernetes 上：

1. 使用卷挂载将证书配置为对边车容器可用。
1. 将边车容器中的环境变量 `SSL_CERT_DIR` 指向包含证书的目录。

以下示例 YAML 显示了一个部署，该部署：
- 将 Pod 卷附加到边车
- 设置 `SSL_CERT_DIR` 以安装证书

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
  labels:
    app: myapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "myapp"
        dapr.io/app-port: "8000"
        dapr.io/volume-mounts: "certificates-vol:/tmp/certificates" # （步骤 1）将证书文件夹挂载到边车容器
        dapr.io/env: "SSL_CERT_DIR=/tmp/certificates" # （步骤 2）将环境变量设置为证书文件夹的路径
    spec:
      volumes:
        - name: certificates-vol
          hostPath:
            path: /certificates
#...
```

> **注意**：使用 Windows 容器时，边车容器以管理员权限启动，这是安装证书所必需的。这不适用于 Linux 容器。

{{% /tab %}}

{{< /tabpane >}}

按照这些步骤后，将安装 `SSL_CERT_DIR` 指向的目录中的所有证书。

- **在 Linux 容器上：** 支持 OpenSSL 支持的所有证书扩展。[了解更多。](https://www.openssl.org/docs/man1.1.1/man1/openssl-rehash.html)
- **在 Windows 容器上：** 支持 `certoc.exe` 支持的所有证书扩展。[参见 Windows Server Core 中的 certoc.exe](https://hub.docker.com/_/microsoft-windows-servercore)。

## 演示

观看关于安装 SSL 证书并在社区通话 64 中安全使用 HTTP binding 的演示：

{{< youtube id=M0VM7GlphAU start=800 >}}

## 相关链接
- [HTTP binding 规范]({{% ref http.md %}})
- [(Kubernetes) 操作指南：将 Pod 卷挂载到 Dapr 边车]({{% ref kubernetes-volume-mounts.md %}})
- [Dapr Kubernetes Pod 注解规范]({{% ref arguments-annotations-overview.md %}})

## 下一步

{{< button text="启用预览功能" page="preview-features.md" >}}
