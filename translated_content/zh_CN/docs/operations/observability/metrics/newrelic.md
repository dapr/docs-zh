---
type: docs
title: "操作指南：设置 New Relic 以收集和分析指标"
linkTitle: "New Relic"
weight: 6000
description: "为 Dapr 指标设置 New Relic"
---

## 前置条件

- 永久[免费 New Relic 账户](https://newrelic.com/signup?ref=dapr)，每月 100 GB 免费数据接入，1 个免费全访问用户，无限免费基础用户

## 背景

New Relic 提供 Prometheus OpenMetrics 集成。

本文档介绍如何在集群中安装它，使用 Helm chart（推荐方式）。

## 安装

1. 按照官方说明安装 Helm。

2. 按照[这些说明](https://github.com/newrelic/helm-charts/blob/master/README.md#installing-charts)添加 New Relic 官方 Helm chart 仓库。

3. 运行以下命令通过 Helm 安装 New Relic Logging Kubernetes 插件，将占位符值 YOUR_LICENSE_KEY 替换为您的 [New Relic 许可证密钥](https://docs.newrelic.com/docs/accounts/accounts-billing/account-setup/new-relic-license-key)：

    ```bash
    helm install nri-prometheus newrelic/nri-prometheus --set licenseKey=YOUR_LICENSE_KEY
    ```

## 查看指标

![Dapr 指标](/images/nr-metrics-1.png)

![仪表板](/images/nr-dashboard-dapr-metrics-1.png)

## 相关链接/参考

* [New Relic 账户注册](https://newrelic.com/signup)
* [遥测数据平台](https://newrelic.com/platform/telemetry-data-platform)
* [New Relic Prometheus OpenMetrics 集成](https://github.com/newrelic/helm-charts/tree/master/charts/nri-prometheus)
* [New Relic API 密钥类型](https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/)
* [警报和智能应用](https://docs.newrelic.com/docs/alerts-applied-intelligence/overview/)
