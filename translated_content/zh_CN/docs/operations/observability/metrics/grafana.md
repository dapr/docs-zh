---
type: docs
title: "操作指南：使用 Grafana 观察指标"
linkTitle: "Grafana 仪表板"
weight: 5000
description: "如何在 Grafana 仪表板中查看 Dapr 指标。"
---

## 可用的仪表板

{{< tabpane text=true >}}

{{% tab "系统服务" %}}
`grafana-system-services-dashboard.json` 模板显示 Dapr 系统组件状态，包括 dapr-operator、dapr-sidecar-injector、dapr-sentry 和 dapr-placement：

<img src="/images/grafana-system-service-dashboard.png" alt="系统服务仪表板截图" width=1200>
{{% /tab %}}

{{% tab "边车" %}}
`grafana-sidecar-dashboard.json` 模板显示 Dapr 边车状态，包括边车健康状态/资源使用、HTTP 和 gRPC 的吞吐量/延迟、Actor、mTLS 等：

<img src="/images/grafana-sidecar-dashboard.png" alt="边车仪表板截图" width=1200>
{{% /tab %}}

{{% tab "Actor" %}}
`grafana-actor-dashboard.json` 模板显示 Dapr Sidecar 状态、Actor 调用吞吐量/延迟、timer/reminder 触发器以及轮转并发：

<img src="/images/grafana-actor-dashboard.png" alt="Actor 仪表板截图" width=1200>
{{% /tab %}}

{{< /tabpane >}}

## 前提条件

- [安装 Prometheus]({{%ref prometheus.md%}})

## 在 Kubernetes 上设置

### 安装 Grafana

1. 添加 Grafana Helm 仓库：

   ```bash
   helm repo add grafana https://grafana.github.io/helm-charts
   helm repo update
   ```

1. 安装 chart：

   ```bash
   helm install grafana grafana/grafana -n dapr-monitoring
   ```

   {{% alert title="注意" color="primary" %}}
   如果你是 Minikube 用户或出于开发目的想要禁用持久卷，可以使用以下命令来禁用它：

   ```bash
   helm install grafana grafana/grafana -n dapr-monitoring --set persistence.enabled=false
   ```
   {{% /alert %}}


1. 获取 Grafana 登录的管理员密码：

   ```bash
   kubectl get secret --namespace dapr-monitoring grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo
   ```

   你将获得一个类似于 `cj3m0OfBNx8SLzUlTx91dEECgzRlYJb60D2evof1%` 的密码。从密码中移除 `%` 字符，得到 `cj3m0OfBNx8SLzUlTx91dEECgzRlYJb60D2evof1` 作为管理员密码。

1. 验证 Grafana 是否在你的集群中运行：

   ```bash
   kubectl get pods -n dapr-monitoring

   NAME                                                READY   STATUS       RESTARTS   AGE
   dapr-prom-kube-state-metrics-9849d6cc6-t94p8        1/1     Running      0          4m58s
   dapr-prom-prometheus-alertmanager-749cc46f6-9b5t8   2/2     Running      0          4m58s
   dapr-prom-prometheus-node-exporter-5jh8p            1/1     Running      0          4m58s
   dapr-prom-prometheus-node-exporter-88gbg            1/1     Running      0          4m58s
   dapr-prom-prometheus-node-exporter-bjp9f            1/1     Running      0          4m58s
   dapr-prom-prometheus-pushgateway-688665d597-h4xx2   1/1     Running      0          4m58s
   dapr-prom-prometheus-server-694fd8d7c-q5d59         2/2     Running      0          4m58s
   grafana-c49889cff-x56vj                             1/1     Running      0          5m10s
   ```

### 将 Prometheus 配置为数据源
首先需要将 Prometheus 作为数据源连接到 Grafana。

1. 将 svc/grafana 端口转发：

   ```bash
   kubectl port-forward svc/grafana 8080:80 -n dapr-monitoring

   Forwarding from 127.0.0.1:8080 -> 3000
   Forwarding from [::1]:8080 -> 3000
   Handling connection for 8080
   Handling connection for 8080
   ```

1. 在浏览器中打开 `http://localhost:8080`

1. 登录 Grafana
   - 用户名 = `admin`
   - 密码 = 上面获取的密码

1. 选择 `Configuration` 和 `Data Sources`

   <img src="/images/grafana-datasources.png" alt="Grafana 添加数据源菜单截图" width=200>


1. 添加 Prometheus 作为数据源。

      <img src="/images/grafana-add-datasources.png" alt="Prometheus 添加数据源截图" width=600>

1. 获取你的 Prometheus HTTP URL

   Prometheus HTTP URL 遵循格式 `http://<prometheus service endpoint>.<namespace>`

   首先通过运行以下命令获取 Prometheus 服务器端点：

   ```bash
   kubectl get svc -n dapr-monitoring

   NAME                                 TYPE        CLUSTER-IP        EXTERNAL-IP   PORT(S)             AGE
   dapr-prom-kube-state-metrics         ClusterIP   10.0.174.177      <none>        8080/TCP            7d9h
   dapr-prom-prometheus-alertmanager    ClusterIP   10.0.255.199      <none>        80/TCP              7d9h
   dapr-prom-prometheus-node-exporter   ClusterIP   None              <none>        9100/TCP            7d9h
   dapr-prom-prometheus-pushgateway     ClusterIP   10.0.190.59       <none>        9091/TCP            7d9h
   dapr-prom-prometheus-server          ClusterIP   10.0.172.191      <none>        80/TCP              7d9h
   elasticsearch-master                 ClusterIP   10.0.36.146       <none>        9200/TCP,9300/TCP   7d10h
   elasticsearch-master-headless        ClusterIP   None              <none>        9200/TCP,9300/TCP   7d10h
   grafana                              ClusterIP   10.0.15.229       <none>        80/TCP              5d5h
   kibana-kibana                        ClusterIP   10.0.188.224      <none>        5601/TCP            7d10h

   ```

      在本指南中，服务器名称是 `dapr-prom-prometheus-server`，命名空间是 `dapr-monitoring`，所以 HTTP URL 将是 `http://dapr-prom-prometheus-server.dapr-monitoring`。

1. 填写以下设置：

   - 名称：`Dapr`
   - HTTP URL：`http://dapr-prom-prometheus-server.dapr-monitoring`
   - Default：开启
   - Skip TLS Verify：开启
     - 保存和测试配置所必需

   <img src="/images/grafana-prometheus-dapr-server-url.png" alt="Prometheus 数据源配置截图" width=600>

1. 点击 `Save & Test` 按钮验证连接是否成功。

## 在 Grafana 中导入仪表板

1. 在 Grafana 主屏幕的左上角，点击 "+" 选项，然后选择 "Import"。

   现在你可以从 [发布资源](https://github.com/dapr/dapr/releases)中导入适用于你的 Dapr 版本的 [Grafana 仪表板模板](https://github.com/dapr/dapr/tree/master/grafana)：

   <img src="/images/grafana-uploadjson.png" alt="Grafana 仪表板上传选项截图" width=700>

1. 找到你导入的仪表板并开始使用

   <img src="/images/system-service-dashboard.png" alt="Dapr 服务仪表板截图" width=900>

   {{% alert title="提示" color="primary" %}}
   将鼠标悬停在角落的 `i` 上以查看每个图表的描述：

   <img src="/images/grafana-tooltip.png" alt="图表工具提示截图" width=700>
   {{% /alert %}}

## 参考

* [Dapr 可观测性]({{%ref observability-concept.md %}})
* [Prometheus 安装](https://github.com/prometheus-community/helm-charts)
* [Kubernetes 上的 Prometheus](https://github.com/coreos/kube-prometheus)
* [Prometheus 查询语言](https://prometheus.io/docs/prometheus/latest/querying/basics/)
* [支持的 Dapr 指标](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md)

## 示例

{{< youtube id=8W-iBDNvCUM start=2577 >}}
