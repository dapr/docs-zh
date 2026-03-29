---
type: docs
title: "操作指南：处理大型 HTTP 头大小"
linkTitle: "HTTP 头大小"
weight: 6000
description: "配置更大的 HTTP 读取缓冲区大小"
---

Dapr 对 HTTP 头读取缓冲区大小有 4KB 的默认限制。如果您发送的 HTTP 头超过默认的 4KB，可能会遇到 `Too big request header` 服务调用错误。

您可以通过以下方式增加 HTTP 头大小：
- `dapr.io/http-read-buffer-size` 注解，或
- 使用 CLI 时的 `--dapr-http-read-buffer-size` 标志。

{{< tabpane text=true >}}

<!--Self-hosted-->
{{% tab "自托管" %}}

在自托管模式下运行时，使用 `--dapr-http-read-buffer-size` 标志配置 Dapr 使用非默认的 http 头大小：

```bash
dapr run --dapr-http-read-buffer-size 16 node app.js
```
这告诉 Dapr 将最大读取缓冲区大小设置为 `16` KB。

{{% /tab %}}

<!--Kubernetes-->
{{% tab "Kubernetes" %}}

在 Kubernetes 上，在部署 YAML 中设置以下注解：

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
        dapr.io/http-read-buffer-size: "16"
#...
```

{{% /tab %}}

{{< /tabpane >}}

## 相关链接
[Dapr Kubernetes Pod 注解规范]({{% ref arguments-annotations-overview.md %}})

## 后续步骤

{{< button text="处理大型 HTTP body 请求" page="increase-request-size.md" >}}
