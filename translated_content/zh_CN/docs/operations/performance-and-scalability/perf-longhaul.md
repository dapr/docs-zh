---
type: docs
title: "长期性能与稳定性"
linkTitle: "长期性能与稳定性"
weight: 10000
description: ""
---

本文提供了 Dapr 在 Kubernetes 上的长期性能与稳定性基准测试。

长期测试设计为运行一周时间，验证 Dapr 及其组件的稳定性，同时测量资源利用率和随时间变化的性能表现。

## 公共仪表板

您可以在公共 Grafana 仪表板上访问实时的长期测试结果。该仪表板近实时更新，显示长期测试的最新结果。

[Dapr 长期测试仪表板](https://dapr.grafana.net/public-dashboards/86d748b233804e74a16d8243b4b64e18)。

## 系统概览

长期环境运行在一个 3 节点的托管 Azure Kubernetes Service (AKS) 集群上，使用标准 D2s_v5 节点，配备 2 核心 8GB RAM，并启用网络加速。

## 测试应用程序

- Feed generator
- Hashtag Actor
- Hashtag counter
- Message Analyzer
- Pubsub Workflow
- Streaming Pubsub Publisher / Producer
- Streaming Pubsub Subscriber / Consumer
- Snapshot App
- Validation Worker App
- Scheduler Jobs App
- Workflow Gen App
- Scheduler Actor Reminders - Client
- Scheduler Actor Reminders - Server
- Scheduler Workflow App

## 重新部署

长期测试环境每 7 天重新部署一次（UTC 时间周五 08:00）。

## 测试基础设施

测试基础设施来源于此 [GitHub 仓库](https://github.com/dapr/test-infra)。

它由 Bicep IaC 模板和 Helm charts 组成，用于部署测试应用程序和 Dapr。
