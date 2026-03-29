---
type: docs
title: "操作指南：配置 Dapr 使用 gRPC"
linkTitle: "使用 gRPC 接口"
weight: 5000
description: "配置 Dapr 使用 gRPC 以应对低延迟、高性能场景"
---

Dapr 为本地调用同时实现了 HTTP 和 gRPC API。gRPC 适用于低延迟、高性能场景，并通过 proto 客户端提供语言集成支持。[你可以查看自动生成客户端（Dapr SDK）的完整列表]({{% ref sdks %}})。

Dapr 运行时实现了一个 [proto 服务](https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/dapr.proto)，应用程序可以通过 gRPC 与之通信。

不仅可以使用 gRPC 调用 Dapr，Dapr 也可以通过 gRPC 与应用程序通信。为此，应用程序需要托管一个 gRPC 服务器并实现 [Dapr `appcallback` 服务](https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/appcallback.proto)。

## 配置 Dapr 通过 gRPC 与应用程序通信

{{< tabpane text=true >}}

 <!-- Self hosted -->
{{% tab "自托管模式" %}}

在自托管模式下运行时，使用 `--app-protocol` 标志告知 Dapr 使用 gRPC 与应用程序通信：

```bash
dapr run --app-protocol grpc --app-port 5005 node app.js
```

这会指示 Dapr 通过 gRPC 在端口 `5005` 上与你的应用程序通信。

{{% /tab %}}

 <!-- Kubernetes -->
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
        dapr.io/app-protocol: "grpc"
        dapr.io/app-port: "5005"
#...
```

{{% /tab %}}

{{< /tabpane >}}

## 后续步骤

{{< button text="处理大型 HTTP 头部大小" page="increase-read-buffer-size.md" >}}
