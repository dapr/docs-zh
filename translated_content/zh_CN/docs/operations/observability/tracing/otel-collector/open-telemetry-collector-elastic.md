---
type: docs
title: "使用 Elastic 发行版 OpenTelemetry Collector 收集追踪数据并发送到 Elastic"
linkTitle: "使用 Elastic OpenTelemetry Collector"
weight: 1100
description: "如何使用 Elastic 发行版 OpenTelemetry Collector 将追踪事件推送到 Elastic"
---

[Elastic 发行版 OpenTelemetry（EDOT）Collector](https://www.elastic.co/docs/reference/opentelemetry/edot-collector) 是以 `otel` 模式运行的 Elastic Agent，它读取标准的 OpenTelemetry Collector 配置。本指南将介绍如何通过它把 Dapr 追踪数据推送到 Elastic。

## 前提条件

- [在 Kubernetes 上安装 Dapr]({{% ref kubernetes %}})
- 一个 [Elastic](https://www.elastic.co/elasticsearch) 端点和 API 密钥，来自 [Elastic Cloud](https://www.elastic.co/cloud) 或自管理部署
- [对集群的 kubectl 访问权限](https://kubernetes.io/docs/tasks/tools/)

## 安装

### 创建凭据 Secret

从 Elastic 实例中复制 Elastic 端点和 API 密钥，并在集群中运行以下命令：

```bash
kubectl create namespace dapr-monitoring

kubectl create secret generic elastic-secret -n dapr-monitoring \
  --from-literal=elastic_endpoint="https://YOUR_DEPLOYMENT.es.YOUR_REGION.cloud.es.io:443" \
  --from-literal=elastic_api_key="YOUR_API_KEY"
```

### 部署 Elastic 发行版 OpenTelemetry Collector

将以下内容保存为 `edot-collector.yaml`：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: edot-config
  namespace: dapr-monitoring
data:
  collector.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
    processors:
      batch: {}
    exporters:
      elasticsearch/otel:
        endpoints:
          - "${env:ELASTIC_ENDPOINT}"
        api_key: "${env:ELASTIC_API_KEY}"
        mapping:
          mode: otel
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [elasticsearch/otel]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edot-collector
  namespace: dapr-monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: edot-collector
  template:
    metadata:
      labels:
        app: edot-collector
    spec:
      containers:
        - name: agent
          image: docker.elastic.co/elastic-agent/elastic-agent:9.5.3
          args: ["--config=/conf/collector.yaml"]
          env:
            - name: ELASTIC_AGENT_OTEL
              value: "true"
            - name: ELASTIC_ENDPOINT
              valueFrom:
                secretKeyRef:
                  name: elastic-secret
                  key: elastic_endpoint
            - name: ELASTIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: elastic-secret
                  key: elastic_api_key
          ports:
            - containerPort: 4317
              name: otlp-grpc
            - containerPort: 4318
              name: otlp-http
          volumeMounts:
            - name: conf
              mountPath: /conf
      volumes:
        - name: conf
          configMap:
            name: edot-config
---
apiVersion: v1
kind: Service
metadata:
  name: edot-collector
  namespace: dapr-monitoring
spec:
  selector:
    app: edot-collector
  ports:
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
    - name: otlp-http
      port: 4318
      targetPort: 4318
```

{{% alert title="注意" color="primary" %}}
`ELASTIC_AGENT_OTEL: "true"` 会将 Elastic Agent 置于 `otel` 模式。若没有此设置，容器将以常规的 Elastic Agent 启动，并且不会打开 OTLP 端口。
{{% /alert %}}

将这些资源应用到你的集群：

```bash
kubectl apply -f edot-collector.yaml
```

### 配置 Dapr 将追踪数据发送到 Collector

创建一个 Configuration 资源，指向你的 Elastic 实例。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "edot-collector.dapr-monitoring.svc:4317"
      protocol: grpc
      isSecure: false   # 与 Collector 的集群内连接；Collector 通过 HTTPS 连接 Elastic
```

将此 Configuration 资源应用到你的集群：

```bash
kubectl apply -f appconfig.yaml
```

在每个应用部署的 Pod 规范中添加注解以引用该配置，然后重启它，以便边车获取更改：

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "myapp"
  dapr.io/config: "appconfig"
```

## 验证安装

打开你的 Elastic 部署，进入 **Observability > APM > Traces**。每个 Dapr 应用都会以其 `dapr.io/app-id` 命名的服务形式出现。

## 相关链接/参考资料

- [使用 Elastic 的 Dapr 指标]({{% ref "elastic-metrics.md" %}})
- [使用 Elastic 的 Dapr 日志]({{% ref "elastic-logs.md" %}})
- [Elastic 发行版 OpenTelemetry Collector](https://www.elastic.co/docs/reference/opentelemetry/edot-collector)
- [`otel` 模式下的 Elastic Agent](https://www.elastic.co/docs/reference/fleet/otel-agent)
