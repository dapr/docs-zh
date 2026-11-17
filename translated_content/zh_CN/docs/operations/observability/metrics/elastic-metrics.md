---
type: docs
title: "How-To: Set up Elastic to collect Dapr metrics"
linkTitle: "Elastic"
weight: 8000
description: "使用 Elastic Distribution of OpenTelemetry Collector 抓取 Dapr 指标并写入 Elastic"
---

[Elastic Distribution of OpenTelemetry (EDOT) Collector](https://www.elastic.co/docs/reference/opentelemetry/edot-collector) 使用其 `prometheus` 接收器抓取 Dapr 的 [Prometheus 指标端点]({{% ref "metrics-overview.md" %}})，并将数据写入 Elastic。EDOT 是以 `otel` 模式运行的 Elastic Agent，它读取标准的 OpenTelemetry Collector 配置。

## 前提条件

- 已在 Kubernetes 上[安装 Dapr]({{% ref "kubernetes-deploy.md" %}})
- 一个 [Elastic](https://www.elastic.co/elasticsearch) 端点和 API 密钥，可来自 [Elastic Cloud](https://www.elastic.co/cloud) 或自行管理的部署
- 能够访问集群的 [kubectl](https://kubernetes.io/docs/tasks/tools/)

## 安装

### 创建凭据 Secret

从你的 Elastic 实例复制 Elastic 端点和 API 密钥，然后在集群中运行以下命令：

```bash
kubectl create namespace dapr-monitoring

kubectl create secret generic elastic-secret -n dapr-monitoring \
  --from-literal=elastic_endpoint="https://YOUR_DEPLOYMENT.es.YOUR_REGION.cloud.es.io:443" \
  --from-literal=elastic_api_key="YOUR_API_KEY"
```

### 为应用添加注解

`dapr-sidecars` 抓取 job 只会保留同时带有以下两个注解的 Pod，因此请在每个 Pod 模板上设置这些注解：

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/enable-metrics: "true"
```

### 部署 Elastic Distribution of OpenTelemetry Collector

将 [操作指南：使用 Prometheus 观察指标]({{% ref "prometheus.md" %}}) 中 `values.yaml` 文件里的 `dapr-sidecars` 和 `dapr` 抓取 job 复制到下面的 `scrape_configs` 块中，并把其中的 `$` 双写为 `$$`，使采集器的环境变量展开不会破坏 relabel 的捕获组。

保存为 `edot-metrics.yaml`：

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: edot-metrics
  namespace: dapr-monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: edot-metrics
rules:
  - apiGroups: [""]
    resources: ["pods", "nodes", "namespaces", "endpoints", "services"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: edot-metrics
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edot-metrics
subjects:
  - kind: ServiceAccount
    name: edot-metrics
    namespace: dapr-monitoring
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: edot-metrics-config
  namespace: dapr-monitoring
data:
  collector.yaml: |
    receivers:
      prometheus/dapr:
        config:
          scrape_configs:
            # 在此粘贴 `dapr-sidecars` 和 `dapr` 抓取 job，来源见
            # https://docs.dapr.io/operations/observability/metrics/prometheus/
            # 将每个 `${1}` 替换为 `$${1}`。
    processors:
      batch: {}
      cumulativetodelta: {}
    exporters:
      elasticsearch/otel:
        endpoints:
          - "${env:ELASTIC_ENDPOINT}"
        api_key: "${env:ELASTIC_API_KEY}"
        mapping:
          mode: otel
    service:
      pipelines:
        metrics:
          receivers: [prometheus/dapr]
          processors: [cumulativetodelta, batch]
          exporters: [elasticsearch/otel]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edot-metrics
  namespace: dapr-monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: edot-metrics
  template:
    metadata:
      labels:
        app: edot-metrics
    spec:
      serviceAccountName: edot-metrics
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
          volumeMounts:
            - name: conf
              mountPath: /conf
      volumes:
        - name: conf
          configMap:
            name: edot-metrics-config
```

{{% alert title="注意" color="warning" %}}
`cumulativetodelta` 是必需的：Dapr 的直方图是累积型的，而 Elastic 导出器只接受增量（delta）时序。
{{% /alert %}}

将这些资源应用到你的集群：

```bash
kubectl apply -f edot-metrics.yaml
```

## 验证安装

检查 Pod 日志中是否有以下内容，以确认抓取 job 已启动：

```bash
kubectl logs -n dapr-monitoring -l app=edot-metrics | grep "Scrape job added"
```

在 Elastic 中查询特定的 Dapr 指标：

```bash
curl -H "Authorization: ApiKey YOUR_API_KEY" \
  "https://YOUR_DEPLOYMENT.es.YOUR_REGION.cloud.es.io/.ds-metrics-*/_count" \
  -H 'Content-Type: application/json' \
  -d '{"query":{"exists":{"field":"metrics.dapr_http_server_latency"}}}'
```

## 相关链接/参考

- [配置指标]({{% ref "metrics-overview.md" %}})
- [操作指南：使用 Prometheus 观察指标]({{% ref "prometheus.md" %}})
- [使用 Elastic 查看 Dapr 追踪]({{% ref "open-telemetry-collector-elastic.md" %}})
- [EDOT Collector：配置指标采集](https://www.elastic.co/docs/reference/edot-collector/config/configure-metrics-collection)
