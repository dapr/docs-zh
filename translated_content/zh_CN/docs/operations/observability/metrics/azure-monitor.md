---
type: docs
title: "操作指南：设置 Azure Monitor 以搜索日志和收集指标"
linkTitle: "Azure Monitor"
weight: 7000
description: "为 Azure Kubernetes Service (AKS) 启用带有 Azure Monitor 的 Dapr 指标和日志"
---

## 前置条件

- [Azure Kubernetes Service](https://docs.microsoft.com/azure/aks/)
- [在 AKS 中为容器启用 Azure Monitor](https://docs.microsoft.com/azure/azure-monitor/insights/container-insights-overview)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Helm 3](https://helm.sh/)

## 使用 Config Map 启用 Prometheus 指标采集

1. 确保 Azure Monitor Agents (AMA) 正在运行。

   ```bash
   $ kubectl get pods -n kube-system
   NAME                                                  READY   STATUS    RESTARTS   AGE
   ...
   ama-logs-48kpv                                        2/2     Running   0          2d13h
   ama-logs-mx24c                                        2/2     Running   0          2d13h
   ama-logs-rs-f9bbb9898-vbt6k                           1/1     Running   0          30h
   ama-logs-sm2mz                                        2/2     Running   0          2d13h
   ama-logs-z7p4c                                        2/2     Running   0          2d13h
   ...
   ```

1. 应用 Config Map 以启用 Prometheus 指标端点采集。

  你可以使用 [azm-config-map.yaml](/docs/azm-config-map.yaml) 来启用 Prometheus 指标端点采集。

  如果你将 Dapr 安装到不同的命名空间，需要更改 `monitor_kubernetes_pod_namespaces` 数组值。例如：

   ```yaml
   ...
     prometheus-data-collection-settings: |-
       [prometheus_data_collection_settings.cluster]
           interval = "1m"
           monitor_kubernetes_pods = true
           monitor_kubernetes_pods_namespaces = ["dapr-system", "default"]
       [prometheus_data_collection_settings.node]
           interval = "1m"
   ...
   ```

  应用 Config Map：

   ```bash
   kubectl apply -f ./azm-config.map.yaml
   ```

## 安装带有 JSON 格式日志的 Dapr

1. 安装 Dapr 并启用 JSON 格式日志。

   ```bash
   helm install dapr dapr/dapr --namespace dapr-system --set global.logAsJson=true
   ```

1. 在 Dapr sidecar 中启用 JSON 格式日志并添加 Prometheus 注解。

  > 注意：Azure Monitor Agents (AMA) 仅在设置了 Prometheus 注解时才会发送指标。

  在你的部署 yaml 中添加 `dapr.io/log-as-json: "true"` 注解。

  示例：

   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: pythonapp
     namespace: default
     labels:
       app: python
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: python
     template:
       metadata:
         labels:
           app: python
         annotations:
           dapr.io/enabled: "true"
           dapr.io/app-id: "pythonapp"
           dapr.io/log-as-json: "true"
           prometheus.io/scrape: "true"
           prometheus.io/port: "9090"
           prometheus.io/path: "/"
   
   ...
   ```

## 使用 Azure Monitor 搜索指标和日志

1. 转到 Azure 门户中的 Azure Monitor。 

1. 搜索 Dapr **日志**。 

  下面是一个示例查询，用于解析 JSON 格式的日志并从 Dapr 系统进程查询日志。

   ```
   ContainerLog
   | extend parsed=parse_json(LogEntry)
   | project Time=todatetime(parsed['time']), app_id=parsed['app_id'], scope=parsed['scope'],level=parsed['level'], msg=parsed['msg'], type=parsed['type'], ver=parsed['ver'], instance=parsed['instance']
   | where level != ""
   | sort by Time
   ```

1. 搜索 **指标**。

  此查询用于查询 Dapr 系统进程的 `process_resident_memory_bytes` Prometheus 指标并渲染时间图表。

   ```
   InsightsMetrics
   | where Namespace == "prometheus" and Name == "process_resident_memory_bytes"
   | extend tags=parse_json(Tags)
   | project TimeGenerated, Name, Val, app=tostring(tags['app'])
   | summarize memInBytes=percentile(Val, 99) by bin(TimeGenerated, 1m), app
   | where app startswith "dapr-"
   | render timechart
   ```

## 参考

- [使用 Azure Monitor for containers 配置 Prometheus 指标采集](https://docs.microsoft.com/azure/azure-monitor/insights/container-insights-prometheus-integration)
- [为 Azure Monitor for containers 配置代理数据收集](https://docs.microsoft.com/azure/azure-monitor/insights/container-insights-agent-config)
- [Azure Monitor 查询](https://docs.microsoft.com/azure/azure-monitor/log-query/query-language)
