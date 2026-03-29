---
type: docs
title: "操作指南：处理更大的请求体"
linkTitle: "请求体大小"
weight: 6000
description: "配置大于 4 MB 的 HTTP 请求"
---

{{% alert title="注意" color="primary" %}}
现有的标志/注解 `dapr-http-max-request-size` 已被弃用，并更新为 `max-body-size`。
{{% /alert %}}

默认情况下，Dapr 对请求体大小有限制，设置为 4MB。你可以通过定义以下内容来更改 HTTP 和 gRPC 请求的限制：
- `dapr.io/max-body-size` 注解，或
- `--max-body-size` 标志。

{{< tabpane text=true >}}

<!--self hosted-->
{{% tab "自托管" %}}

在自托管模式下运行时，使用 `--max-body-size` 标志配置 Dapr 以使用非默认的请求体大小：

```bash
dapr run --max-body-size 16Mi node app.js
```
{{% /tab %}}

<!--kubernetes-->
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
        dapr.io/max-body-size: "16Mi"
#...
```

{{% /tab %}}

{{< /tabpane >}}

这将告诉 Dapr 为 HTTP 和 gRPC 请求将最大请求体大小设置为 `16` MB。

## 相关链接

[Dapr Kubernetes pod 注解规范]({{% ref arguments-annotations-overview.md %}})

## 下一步

{{< button text="安装边车证书" page="install-certificates.md" >}}
