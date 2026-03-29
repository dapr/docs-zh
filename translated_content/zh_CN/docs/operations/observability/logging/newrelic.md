---
type: docs
title: "如何设置：为 Dapr 日志配置 New Relic"
linkTitle: "New Relic"
weight: 3000
description: "为 Dapr 日志配置 New Relic"
---

## 前提条件

- 永久[免费的 New Relic 账户](https://newrelic.com/signup?ref=dapr)，每月 100 GB 的免费数据摄入，1 个免费的全权限用户，无限个免费基础用户

## 背景

New Relic 提供了一个 [Fluent Bit](https://fluentbit.io/) 输出[插件](https://github.com/newrelic/newrelic-fluent-bit-output)，可以轻松将日志转发到 [New Relic Logs](https://github.com/newrelic/newrelic-fluent-bit-output)。该插件也以独立的 Docker 镜像形式提供，可以以 DaemonSet 的形式安装在 Kubernetes 集群中，我们称之为 Kubernetes 插件。

本文档介绍了如何在集群中安装该插件，可以使用 Helm chart（推荐），或者通过手动应用 Kubernetes 清单文件。

## 安装

### 使用 Helm chart 安装（推荐）

1. 按照官方说明安装 Helm。

2. 按照这些说明添加 New Relic 官方 Helm chart 仓库

3. 运行以下命令通过 Helm 安装 New Relic Logging Kubernetes 插件，将占位符值 YOUR_LICENSE_KEY 替换为您的 [New Relic 许可证密钥](https://docs.newrelic.com/docs/accounts/accounts-billing/account-setup/new-relic-license-key/)：

- Helm 3
    ```bash
    helm install newrelic-logging newrelic/newrelic-logging --set licenseKey=YOUR_LICENSE_KEY
    ```

- Helm 2
    ```bash
    helm install newrelic/newrelic-logging --name newrelic-logging --set licenseKey=YOUR_LICENSE_KEY
    ```

对于欧盟用户，请在上述任何 helm install 命令中添加 `--set endpoint=https://log-api.eu.newrelic.com/log/v1`。

默认情况下，日志跟踪设置为 /var/log/containers/*.log。要更改此设置，请在上述任何 helm install 命令中添加 --set fluentBit.path=DESIRED_PATH 来提供您首选的路径。

### 安装 Kubernetes 清单文件

1. 将以下 3 个清单文件下载到当前工作目录：

    ```bash
    curl https://raw.githubusercontent.com/newrelic/helm-charts/master/charts/newrelic-logging/k8s/fluent-conf.yml > fluent-conf.yml
    curl https://raw.githubusercontent.com/newrelic/helm-charts/master/charts/newrelic-logging/k8s/new-relic-fluent-plugin.yml > new-relic-fluent-plugin.yml
    curl https://raw.githubusercontent.com/newrelic/helm-charts/master/charts/newrelic-logging/k8s/rbac.yml > rbac.yml
    ```

2. 在下载的 new-relic-fluent-plugin.yml 文件中，将占位符值 LICENSE_KEY 替换为您的 New Relic 许可证密钥。

    对于欧盟用户，将 ENDPOINT 环境变量替换为 https://log-api.eu.newrelic.com/log/v1。

3. 添加许可证密钥后，在终端或命令行界面中运行以下命令：
    ```bash
    kubectl apply -f .
    ```

4. [可选] 您可以通过编辑 fluent-conf.yml 文件中的 parsers.conf 部分来配置插件如何解析数据。有关更多信息，请参阅 Fluent Bit 关于 Parsers 配置的文档。

    默认情况下，日志跟踪设置为 /var/log/containers/*.log。要更改此设置，请在 new-relic-fluent-plugin.yml 文件中将默认路径替换为您首选的路径。

## 查看日志

![Dapr Annotations](/images/nr-logging-1.png)

![搜索](/images/nr-logging-2.png)

## 相关链接/参考

* [New Relic 账户注册](https://newrelic.com/signup)
* [遥测数据平台](https://newrelic.com/platform/telemetry-data-platform)
* [New Relic Logging](https://github.com/newrelic/helm-charts/tree/master/charts/newrelic-logging)
* [New Relic API 密钥类型](https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/)
* [告警和应用智能](https://docs.newrelic.com/docs/alerts-applied-intelligence/overview/)
