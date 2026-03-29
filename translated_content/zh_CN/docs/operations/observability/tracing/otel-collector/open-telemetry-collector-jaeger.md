---
type: docs
title: "使用 OpenTelemetry 向 Jaeger V2 发送追踪数据"
linkTitle: "使用 OpenTelemetry for Jaeger V2"
weight: 1200
description: "如何使用 OpenTelemetry 协议将追踪事件推送到 Jaeger V2 分布式追踪平台。"

Dapr 支持使用 OpenTelemetry (OTLP) 协议写入追踪数据，Jaeger V2 原生支持 OTLP，允许 Dapr 直接向 Jaeger V2 实例发送追踪数据。建议在生产环境中使用此方法，以充分利用 Jaeger V2 的分布式追踪能力。

{{< tabpane text=true >}}

{{% tab "Self-hosted" %}}
## 在自托管模式下配置 Jaeger V2

### 本地设置

启动 Jaeger 最简单的方式是运行发布到 DockerHub 的预构建 All-in-One Jaeger 镜像并暴露 OTLP 端口：

> **注意：** 端口 9411 通常由 Zipkin 使用。如果你正在运行 Zipkin（运行 `dapr init` 时默认启动），请先停止 `dapr_zipkin` 容器以避免端口冲突：`docker stop dapr_zipkin`

```bash
docker run -d --rm --name jaeger \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 5778:5778 \
  -p 9411:9411 \
  cr.jaegertracing.io/jaegertracing/jaeger:2.11.0
```

你也可以使用以下命令查看 jaeger 容器的日志：

```bash
docker logs jaeger
```

### 配置 Dapr 进行追踪

你有两个选项来配置 Dapr 向 Jaeger V2 发送追踪数据：

#### 选项 1：使用自定义配置文件

创建一个包含以下内容的 `config.yaml` 文件：

> **注意：** 由于你使用 OpenTelemetry 协议与 Jaeger 通信，需要填写追踪配置中的 `otel` 部分，并将 `endpointAddress` 设置为 Jaeger 容器的地址。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    stdout: true
    otel:
      endpointAddress: "localhost:4317"
      isSecure: false
      protocol: grpc 
```

要启动引用新 YAML 配置文件的应用程序，请使用 `--config` 选项。例如：

```bash
dapr run --app-id myapp --app-port 3000 node app.js --config config.yaml
```

#### 选项 2：更新默认 Dapr 配置（开发环境）

或者，在开发环境中，导航到你的[本地 Dapr 组件目录](https://docs.dapr.io/getting-started/install-dapr-selfhost/#step-5-verify-components-directory-has-been-initialized)，并使用上述 OTLP 配置更新默认的 `config.yaml` 文件。这样，所有 Dapr 应用程序将默认使用 Jaeger V2 追踪配置，无需每次都指定 `--config` 标志。

### 查看追踪数据

要在浏览器中查看追踪数据，访问 `http://localhost:16686` 查看 Jaeger UI。
{{% /tab %}}

{{% tab "Kubernetes" %}}
<!-- kubernetes -->
## 在 Kubernetes 上配置 Jaeger V2

以下步骤展示如何配置 Dapr 使用 OpenTelemetry Operator 部署的 Jaeger V2 实例（使用内存存储）直接发送分布式追踪数据。

### 前置条件

- [在 Kubernetes 上安装 Dapr]({{% ref kubernetes %}})

### 使用 OpenTelemetry Operator 设置 Jaeger V2

Jaeger V2 可以使用 OpenTelemetry Operator 部署，以简化管理并提供原生 OTLP 支持。以下示例配置了使用内存存储的 Jaeger V2。

> **关于存储后端的说明：** 本示例使用内存存储（`memstore`）以简化配置，适用于开发或测试环境，因为它在内存中最多存储 100,000 条追踪数据。对于生产环境，建议配置持久化存储后端（如 Cassandra 或 Elasticsearch）以确保追踪数据的持久性。

#### 安装

> **注意：** 为了让 API 服务器与 Operator 的 webhook 组件通信，webhook 需要一个 API 服务器配置为信任的 TLS 证书。有几种不同的方式可以生成/配置所需的 TLS 证书，详情见 [otel operator chart docs](https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-operator#tls-certificate-requirement)

为简化操作，你可以使用 Helm 创建自动生成的自签名证书。

1. **安装 OpenTelemetry Operator**：

   ```bash
   helm install opentelemetry-operator open-telemetry/opentelemetry-operator -n opentelemetry-operator-system --create-namespace \
    --set "manager.collectorImage.repository=ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-k8s" \
    --set admissionWebhooks.certManager.enabled=false \
    --set admissionWebhooks.autoGenerateCert.enabled=true
   ```
   确认 `opentelemetry-operator-system` 命名空间中的所有资源已就绪。

1. **部署使用内存存储的 Jaeger V2 实例**：
   创建一个名为 `jaeger-inmemory.yaml` 的文件，包含以下配置：
   ```yaml
   apiVersion: opentelemetry.io/v1beta1
   kind: OpenTelemetryCollector
   metadata:
     name: jaeger-inmemory-instance
     namespace: observability
   spec:
     image: jaegertracing/jaeger:latest
     ports:
     - name: jaeger
       port: 16686
     config:
       service:
         extensions: [jaeger_storage, jaeger_query]
         pipelines:
           traces:
             receivers: [otlp]
             exporters: [jaeger_storage_exporter]
       extensions:
         jaeger_query:
           storage:
             traces: memstore
         jaeger_storage:
           backends:
             memstore:
               memory:
                 max_traces: 100000
       receivers:
         otlp:
           protocols:
             grpc:
               endpoint: 0.0.0.0:4317
             http:
               endpoint: 0.0.0.0:4318
       exporters:
         jaeger_storage_exporter:
           trace_storage: memstore
   ```
   使用以下命令应用：
   ```bash
   kubectl apply -f jaeger-inmemory.yaml -n observability
   ```


### 设置 Dapr 向 Jaeger V2 发送追踪数据

创建 Dapr 配置文件以启用追踪，并直接将 sidecar 追踪数据导出到 Jaeger V2 实例。

1. 创建配置文件（例如 `tracing.yaml`），包含以下内容，更新 `namespace` 和 `otel.endpointAddress` 以匹配你的 Jaeger V2 实例：
   ```yaml
   apiVersion: dapr.io/v1alpha1
   kind: Configuration
   metadata:
     name: tracing
     namespace: order-system
   spec:
     tracing:
       samplingRate: "1"
       otel:
         endpointAddress: "jaeger-inmemory-instance-collector.observability.svc.cluster.local:4317"
         isSecure: false
         protocol: grpc
   ```

2. 应用配置：
   ```bash
   kubectl apply -f tracing.yaml -n order-system
   ```

### 部署启用追踪的应用

通过在要启用分布式追踪的应用部署中添加 `dapr.io/config` 注解来应用 `tracing` Dapr 配置，如下例所示：

  ```yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    ...
  spec:
    ...
    template:
      metadata:
        ...
        annotations:
          dapr.io/enabled: "true"
          dapr.io/app-id: "MyApp"
          dapr.io/app-port: "8080"
          dapr.io/config: "tracing"
  ```

你可以同时注册多个追踪导出器，追踪日志将被转发到所有已注册的导出器。

就这样！无需包含 OpenTelemetry SDK 或对应用程序代码进行检测。Dapr 会自动为你处理分布式追踪。

### 查看追踪数据

要查看 Dapr sidecar 追踪数据，对 Jaeger V2 服务进行端口转发并打开 UI：

```bash
kubectl port-forward svc/jaeger-inmemory-instance-collector 16686:16686 -n observability
```

在浏览器中，访问 `http://localhost:16686` 查看 Jaeger V2 UI。

![jaeger](/images/jaeger_ui.png)
{{% /tab %}}

{{< /tabpane >}}

## 参考

- [Jaeger V2 入门指南](https://www.jaegertracing.io/docs/2.11/getting-started/)
- [Jaeger V2 Kubernetes Operator](https://www.jaegertracing.io/docs/2.11/deployment/kubernetes/#kubernetes-operator)
