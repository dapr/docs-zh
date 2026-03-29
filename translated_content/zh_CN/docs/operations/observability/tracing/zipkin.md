---
type: docs
title: "操作指南：设置 Zipkin 进行分布式追踪"
linkTitle: "Zipkin"
weight: 4000
description: "设置 Zipkin 进行分布式追踪"
---

## 配置自托管模式

对于自托管模式，在运行 `dapr init` 时：

1. 默认情况下，会在 `$HOME/.dapr/config.yaml`（Linux/Mac 上）或 `%USERPROFILE%\.dapr\config.yaml`（Windows 上）创建以下 YAML 文件，并且在 `dapr run` 调用时会默认引用该文件，除非被覆盖：

* config.yaml

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprConfig
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://localhost:9411/api/v2/spans"
```

2. 在运行 `dapr init` 时，会启动 [openzipkin/zipkin](https://hub.docker.com/r/openzipkin/zipkin/) docker 容器，或者可以使用以下代码启动它。

使用 Docker 启动 Zipkin：

```bash
docker run -d -p 9411:9411 openzipkin/zipkin
```

3. 使用 `dapr run` 启动的应用程序默认引用 `$HOME/.dapr/config.yaml` 或 `%USERPROFILE%\.dapr\config.yaml` 中的配置文件，并可以通过使用 `--config` 参数的 Dapr CLI 覆盖它：

```bash
dapr run --app-id mynode --app-port 3000 node app.js
```

### 查看追踪
要查看追踪，请在浏览器中打开 http://localhost:9411，您将看到 Zipkin UI。

## 配置 Kubernetes

以下步骤向您展示如何配置 Dapr 将分布式追踪数据发送到在 Kubernetes 集群中作为容器运行的 Zipkin，以及如何查看它们。

### 设置

首先，部署 Zipkin：

```bash
kubectl create deployment zipkin --image openzipkin/zipkin
```

为 Zipkin pod 创建 Kubernetes 服务：

```bash
kubectl expose deployment zipkin --type ClusterIP --port 9411
```

接下来，在本地创建以下 YAML 文件：

* tracing.yaml 配置

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin.default.svc.cluster.local:9411/api/v2/spans"
```

现在，部署 Dapr 配置文件：

```bash
kubectl apply -f tracing.yaml
```

为了为您的 Dapr 边车启用此配置，请将以下注解添加到您的 pod 规范模板中：

```yml
annotations:
  dapr.io/config: "tracing"
```

就是这样！您的边车现在已配置为向 Zipkin 发送追踪数据。

### 查看追踪数据

要查看追踪数据，请连接到 Zipkin 服务并打开 UI：

```bash
kubectl port-forward svc/zipkin 9411:9411
```

在浏览器中，打开 `http://localhost:9411`，您将看到 Zipkin UI。

![zipkin](/images/zipkin_ui.png)

## 参考
- [Zipkin 用于分布式追踪](https://zipkin.io/)
