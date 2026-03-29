---
type: docs
title: "日志"
linkTitle: "概述"
weight: 1000
description: "了解 Dapr 日志记录"
---

Dapr 会生成结构化日志并输出到 stdout，格式可以是纯文本或 JSON。默认情况下，所有 Dapr 进程（runtime 或 sidecar，以及所有控制平面服务）以纯文本形式将日志写入控制台（stdout）。要启用 JSON 格式的日志记录，在运行 Dapr 进程时需要添加 `--log-as-json` 命令标志。

{{% alert title="注意" color="primary" %}}
如果你想使用 Elastic Search 或 Azure Monitor 等搜索引擎来搜索日志，强烈建议使用 JSON 格式的日志，因为日志收集器和搜索引擎可以使用内置的 JSON 解析器来解析它们。
{{% /alert %}}

## 日志架构

Dapr 根据以下架构生成日志：

| 字段 | 描述 | 示例 |
|-------|-------------------|---------|
| time  | ISO8601 时间戳 | `2011-10-05T14:48:00.000Z` |
| level | 日志级别（info/warn/debug/error） | `info` |
| type  | 日志类型 | `log` |
| msg   | 日志消息 | `hello dapr!` |
| scope | 日志记录范围 | `dapr.runtime` |
| instance | 容器名称 | `dapr-pod-xxxxx` |
| app_id | Dapr App ID | `dapr-app` |
| ver | Dapr Runtime 版本 | `1.9.0` |

API 日志记录可能会添加其他结构化字段，如 [API 日志记录文档]({{% ref "api-logs-troubleshooting.md" %}}) 中所述。

## 纯文本和 JSON 格式的日志

* 纯文本日志示例

```bash
time="2022-11-01T17:08:48.303776-07:00" level=info msg="starting Dapr Runtime -- version 1.9.0 -- commit v1.9.0-g5dfcf2e" instance=dapr-pod-xxxx scope=dapr.runtime type=log ver=1.9.0
time="2022-11-01T17:08:48.303913-07:00" level=info msg="log level set to: info" instance=dapr-pod-xxxx scope=dapr.runtime type=log ver=1.9.0
```

* JSON 格式日志示例

```json
{"instance":"dapr-pod-xxxx","level":"info","msg":"starting Dapr Runtime -- version 1.9.0 -- commit v1.9.0-g5dfcf2e","scope":"dapr.runtime","time":"2022-11-01T17:09:45.788005Z","type":"log","ver":"1.9.0"}
{"instance":"dapr-pod-xxxx","level":"info","msg":"log level set to: info","scope":"dapr.runtime","time":"2022-11-01T17:09:45.788075Z","type":"log","ver":"1.9.0"}
```

## 日志格式

Dapr 支持输出纯文本（默认）或 JSON 格式的日志。

要使用 JSON 格式的日志，你需要在安装 Dapr 和部署应用时添加额外的配置选项。建议使用 JSON 格式的日志，因为大多数日志收集器和搜索引擎可以使用内置的解析器更轻松地解析 JSON。

## 使用 Dapr CLI 启用 JSON 日志记录

使用 Dapr CLI 运行应用程序时，传递 `--log-as-json` 选项以启用 JSON 格式的日志，例如：

```sh
dapr run \
  --app-id orderprocessing \
  --resources-path ./components/ \
  --log-as-json \
    -- python3 OrderProcessingService.py
```

## 在 Kubernetes 中启用 JSON 日志记录

以下步骤描述了如何为 Kubernetes 配置 JSON 格式的日志

### Dapr 控制平面

Dapr 控制平面中的所有服务（例如 `operator`、`sentry` 等）都支持 `--log-as-json` 选项来启用 JSON 格式的日志记录。

如果你使用 Helm chart 将 Dapr 部署到 Kubernetes，可以通过传递 `--set global.logAsJson=true` 选项为 Dapr 系统服务启用 JSON 格式的日志，例如：

```bash
helm upgrade --install dapr \
  dapr/dapr \
  --namespace dapr-system \
  --set global.logAsJson=true
```

### 为 Dapr sidecars 启用 JSON 格式的日志

你可以通过在部署中添加 `dapr.io/log-as-json: "true"` 注解来为 Dapr sidecars 启用 JSON 格式的日志，例如：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pythonapp
  labels:
    app: python
spec:
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
        # This enables JSON-formatted logging
        dapr.io/log-as-json: "true"
...
```

## API 日志记录

API 日志记录使你能够查看应用程序对 Dapr sidecar 发起的 API 调用，以调试问题或监控应用程序的行为。你可以将 Dapr API 日志记录与 Dapr 日志事件结合使用。

有关更多信息，请参阅[配置和查看 Dapr 日志]({{% ref "logs-troubleshooting.md" %}})和[配置和查看 Dapr API 日志]({{% ref "api-logs-troubleshooting.md" %}})。

## 日志收集器

如果你在 Kubernetes 集群中运行 Dapr，[Fluentd](https://www.fluentd.org/) 是一个流行的容器日志收集器。你可以将 Fluentd 与 [JSON 解析器插件](https://docs.fluentd.org/parser/json)结合使用来解析 Dapr JSON 格式的日志。这个[操作指南]({{% ref fluentd.md %}})展示了如何在集群中配置 Fluentd。

如果你使用 Azure Kubernetes Service，可以使用内置代理通过 Azure Monitor 收集日志，无需安装 Fluentd。

## 搜索引擎

如果你使用 [Fluentd](https://www.fluentd.org/)，我们建议使用 Elastic Search 和 Kibana。这个[操作指南]({{% ref fluentd.md %}})展示了如何在 Kubernetes 集群中设置 Elastic Search 和 Kibana。

如果你使用 Azure Kubernetes Service，可以使用 [Azure Monitor for containers](https://docs.microsoft.com/azure/azure-monitor/insights/container-insights-overview) 而无需安装任何其他监控工具。另请参阅[如何为容器启用 Azure Monitor](https://docs.microsoft.com/azure/azure-monitor/insights/container-insights-onboard)

## 参考资料

- [操作指南：设置 Fluentd、Elastic search 和 Kibana]({{% ref fluentd.md %}})
- [操作指南：在 Azure Kubernetes Service 中设置 Azure Monitor]({{% ref azure-monitor.md %}})
- [配置和查看 Dapr 日志]({{% ref "logs-troubleshooting.md" %}})
- [配置和查看 Dapr API 日志]({{% ref "api-logs-troubleshooting.md" %}})
