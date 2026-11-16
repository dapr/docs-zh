---
type: docs
title: "操作指南：为 Dapr 日志配置 Elastic"
linkTitle: "Elastic"
weight: 4000
description: "使用 Elastic 发行版 OpenTelemetry Collector 将 Dapr 的 JSON 日志收集到 Elastic 中"
---

[Elastic 发行版 OpenTelemetry（EDOT）Collector](https://www.elastic.co/docs/reference/opentelemetry/edot-collector) 通过其 `filelog` 接收器收集 Dapr 的标准输出容器日志。EDOT 是以 `otel` 模式运行的 Elastic Agent，读取标准的 OpenTelemetry Collector 配置。

## 前提条件

- [已在 Kubernetes 上安装 Dapr]({{% ref "kubernetes-deploy.md" %}})
- 一个 [Elastic](https://www.elastic.co/elasticsearch) 端点及 API 密钥，可来自 [Elastic Cloud](https://www.elastic.co/cloud)，也可来自自托管部署
- 可以通过 [kubectl](https://kubernetes.io/docs/tasks/tools/) 访问集群

## 安装

### 创建凭据 Secret

从你的 Elastic 实例中复制端点和 API 密钥，然后在集群中运行以下命令：

```bash
kubectl create namespace dapr-monitoring

kubectl create secret generic elastic-secret -n dapr-monitoring \
  --from-literal=elastic_endpoint="https://YOUR_DEPLOYMENT.es.YOUR_REGION.cloud.es.io:443" \
  --from-literal=elastic_api_key="YOUR_API_KEY"
```

### 启用 JSON 格式日志

Dapr 默认以纯文本输出日志。请开启 JSON 输出，以便字段在收集过程中得以保留。

对于控制平面，通过 [Helm]({{% ref "kubernetes-deploy.md" %}}) 安装 Dapr 时设置 `global.logAsJson`：

```bash
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system --create-namespace \
  --set global.logAsJson=true
```

对于每个应用，在 Pod 模板中添加 `dapr.io/log-as-json` 注解：

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "myapp"
  dapr.io/log-as-json: "true"
```

### 部署 Elastic 发行版 OpenTelemetry Collector

`filelog` 接收器从 Kubernetes 节点读取日志文件，因此收集器以 DaemonSet 方式运行，并挂载宿主机的日志路径。将以下内容保存为 `edot-logs.yaml`：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: edot-logs-config
  namespace: dapr-monitoring
data:
  collector.yaml: |
    receivers:
      filelog:
        include:
          - /var/log/pods/*/*/*.log
        exclude:
          - /var/log/pods/*edot-logs*/*/*.log
        start_at: end
        include_file_path: true
        retry_on_failure:
          enabled: true
        operators:
          - id: container-parser
            type: container
          - id: json-parser
            type: json_parser
            on_error: send_quiet
            parse_from: body
            parse_to: body
    processors:
      batch: {}
      k8s_attributes:
        passthrough: false
        filter:
          node_from_env_var: OTEL_K8S_NODE_NAME
        extract:
          metadata:
            - k8s.namespace.name
            - k8s.pod.name
            - k8s.container.name
            - k8s.deployment.name
            - k8s.node.name
    exporters:
      elasticsearch/otel:
        endpoints:
          - "${env:ELASTIC_ENDPOINT}"
        api_key: "${env:ELASTIC_API_KEY}"
        mapping:
          mode: otel
    service:
      pipelines:
        logs:
          receivers: [filelog]
          processors: [k8s_attributes, batch]
          exporters: [elasticsearch/otel]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: edot-logs
  namespace: dapr-monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: edot-logs
rules:
  - apiGroups: [""]
    resources: ["pods", "nodes", "namespaces"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: edot-logs
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edot-logs
subjects:
  - kind: ServiceAccount
    name: edot-logs
    namespace: dapr-monitoring
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: edot-logs
  namespace: dapr-monitoring
spec:
  selector:
    matchLabels:
      app: edot-logs
  template:
    metadata:
      labels:
        app: edot-logs
    spec:
      serviceAccountName: edot-logs
      containers:
        - name: agent
          image: docker.elastic.co/elastic-agent/elastic-agent:9.5.3
          args: ["--config=/conf/collector.yaml"]
          securityContext:
            runAsUser: 0
          env:
            - name: ELASTIC_AGENT_OTEL
              value: "true"
            - name: OTEL_K8S_NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
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
            - name: varlogpods
              mountPath: /var/log/pods
              readOnly: true
      volumes:
        - name: conf
          configMap:
            name: edot-logs-config
        - name: varlogpods
          hostPath:
            path: /var/log/pods
```

{{% alert title="注意" color="warning" %}}
必须配置 `json_parser` 操作符，并且它必须位于 container 解析器之后。
{{% /alert %}}

将 `edot-logs.yaml` 文件应用到集群：

```bash
kubectl apply -f edot-logs.yaml
```

## 相关链接/参考

- [日志]({{% ref "logs.md" %}})
- [使用 Elastic 查看 Dapr 指标]({{% ref "elastic-metrics.md" %}})
- [使用 Elastic 查看 Dapr 追踪]({{% ref "open-telemetry-collector-elastic.md" %}})
- [EDOT Collector：配置日志收集](https://www.elastic.co/docs/reference/edot-collector/config/configure-logs-collection)
