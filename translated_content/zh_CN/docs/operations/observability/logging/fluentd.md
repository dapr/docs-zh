---
type: docs
title: "操作指南：在 Kubernetes 中设置 Fluentd、Elasticsearch 和 Kibana"
linkTitle: "FluentD"
weight: 2000
description: "如何在 Kubernetes 中安装 Fluentd、Elasticsearch 和 Kibana 来搜索日志"
---

## 前置条件

- Kubernetes (> 1.14)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Helm 3](https://helm.sh/)

## 安装 Elasticsearch 和 Kibana

1. 为监控工具创建一个 Kubernetes 命名空间

    ```bash
    kubectl create namespace dapr-monitoring
    ```

2. 添加 Elasticsearch 的 helm 仓库

    ```bash
    helm repo add elastic https://helm.elastic.co
    helm repo update
    ```

3. 使用 Helm 安装 Elasticsearch

    默认情况下，该 chart 会创建 3 个副本，这些副本必须分布在不同的节点上。如果你的集群节点数少于 3 个，请指定较小的副本数。例如，以下命令将副本数设置为 1：

    ```bash
    helm install elasticsearch elastic/elasticsearch --version 7.17.3 -n dapr-monitoring --set replicas=1
    ```

    否则：

    ```bash
    helm install elasticsearch elastic/elasticsearch --version 7.17.3 -n dapr-monitoring
    ```

    如果你正在使用 minikube 或只是为了开发目的想禁用持久卷，可以使用以下命令：

    ```bash
    helm install elasticsearch elastic/elasticsearch --version 7.17.3 -n dapr-monitoring --set persistence.enabled=false,replicas=1
    ```

4. 安装 Kibana

    ```bash
    helm install kibana elastic/kibana --version 7.17.3 -n dapr-monitoring
    ```

5. 确保 Elasticsearch 和 Kibana 在你的 Kubernetes 集群中运行

    ```bash
    $ kubectl get pods -n dapr-monitoring
    NAME                            READY   STATUS    RESTARTS   AGE
    elasticsearch-master-0          1/1     Running   0          6m58s
    kibana-kibana-95bc54b89-zqdrk   1/1     Running   0          4m21s
    ```

## 安装 Fluentd

1. 安装 config map 和以 daemonset 方式运行的 Fluentd

    下载这些配置文件：
    - [fluentd-config-map.yaml](/docs/fluentd-config-map.yaml)
    - [fluentd-dapr-with-rbac.yaml](/docs/fluentd-dapr-with-rbac.yaml)

    > 注意：如果你的集群中已经有 Fluentd 在运行，请启用嵌套 JSON 解析器，以便它可以解析来自 Dapr 的 JSON 格式日志。

    将配置应用到你的集群：

    ```bash
    kubectl apply -f ./fluentd-config-map.yaml
    kubectl apply -f ./fluentd-dapr-with-rbac.yaml
    ```

2. 确保 Fluentd 作为 daemonset 运行。Fluentd 实例的数量应与集群节点数相同。在下面的示例中，集群中只有一个节点：

    ```bash
    $ kubectl get pods -n kube-system -w
    NAME                          READY   STATUS    RESTARTS   AGE
    coredns-6955765f44-cxjxk      1/1     Running   0          4m41s
    coredns-6955765f44-jlskv      1/1     Running   0          4m41s
    etcd-m01                      1/1     Running   0          4m48s
    fluentd-sdrld                 1/1     Running   0          14s
    ```

## 安装支持 JSON 格式日志的 Dapr

1. 安装 Dapr 并启用 JSON 格式日志

    ```bash
    helm repo add dapr https://dapr.github.io/helm-charts/
    helm repo update
    helm install dapr dapr/dapr --namespace dapr-system --set global.logAsJson=true
    ```

2. 在 Dapr sidecar 中启用 JSON 格式日志

    将 `dapr.io/log-as-json: "true"` 注解添加到你的 deployment yaml 中。例如：

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
    ...
    ```

## 搜索日志

> 注意：Elasticsearch 需要一些时间来索引 Fluentd 发送的日志。

1. 从本地端口转发到 `svc/kibana-kibana`

    ```bash
    $ kubectl port-forward svc/kibana-kibana 5601 -n dapr-monitoring
    Forwarding from 127.0.0.1:5601 -> 5601
    Forwarding from [::1]:5601 -> 5601
    Handling connection for 5601
    Handling connection for 5601
    ```

2. 浏览到 `http://localhost:5601`

3. 展开下拉菜单并点击 **Management → Stack Management**

    ![Kibana Management 菜单选项下的 Stack Management 项](/images/kibana-1.png)

4. 在 Stack Management 页面上，选择 **Data → Index Management** 并等待 `dapr-*` 被索引。

    ![Kibana Stack Management 页面上的索引管理视图](/images/kibana-2.png)

5. 一旦 `dapr-*` 被索引，点击 **Kibana → Index Patterns**，然后点击 **Create index pattern** 按钮。

    ![Kibana 创建索引模式按钮](/images/kibana-3.png)

6. 通过在 **Index Pattern name** 字段中输入 `dapr*` 来定义新的索引模式，然后点击 **Next step** 按钮继续。

    ![Kibana 定义索引模式页面](/images/kibana-4.png)

7. 通过从 **Time field** 下拉列表中选择 `@timestamp` 选项，配置与新索引模式一起使用的主时间字段。点击 **Create index pattern** 按钮完成索引模式的创建。

    ![Kibana 创建索引模式的配置设置页面](/images/kibana-5.png)

8. 应该显示新创建的索引模式。通过使用 **Fields** 选项卡中的搜索框，确认感兴趣的字段（如 `scope`、`type`、`app_id`、`level` 等）正在被索引。

    > 注意：如果你找不到索引字段，请稍候。搜索所有索引字段所需的时间取决于数据量和运行 Elasticsearch 的资源大小。

    ![创建的 Kibana 索引模式视图](/images/kibana-6.png)

9. 要浏览索引数据，展开下拉菜单并点击 **Analytics → Discover**。

    ![Kibana Analytics 菜单选项下的 Discover 项](/images/kibana-7.png)

10. 在搜索框中输入查询字符串，例如 `scope:*`，然后点击 **Refresh** 按钮查看结果。

    > 注意：这可能需要很长时间。返回所有结果所需的时间取决于数据量和运行 Elasticsearch 的资源大小。

    ![在 Kibana Analytics Discover 页面中使用搜索框](/images/kibana-8.png)

## 参考

* [适用于 Kubernetes 的 Fluentd](https://docs.fluentd.org/v/0.12/articles/kubernetes-fluentd)
* [Elasticsearch helm chart](https://github.com/elastic/helm-charts/tree/master/elasticsearch)
* [Kibana helm chart](https://github.com/elastic/helm-charts/tree/master/kibana)
* [Kibana 查询语言](https://www.elastic.co/guide/en/kibana/current/kuery-query.html)
* [使用日志进行故障排除]({{% ref "logs-troubleshooting.md" %}})
