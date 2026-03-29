---
type: docs
title: "操作指南：为 Dapr 边车服务添加自定义注解"
linkTitle: "边车服务注解"
weight: 8000
description: "在 Dapr 边车服务上配置自定义注解"
---

Dapr Operator 在 Kubernetes 中运行时，会自动为 Dapr 边车创建一个 Service（名称带有 `-dapr` 后缀）。在某些情况下，您可能需要向此服务添加自定义注解，例如以支持特定的网络策略（如 Illumio）或指标抓取配置。

## 概述

`dapr.io/sidecar-svc-annotations` 注解让您能够指定以逗号分隔的 `key=value` 对列表，这些键值对将被作为注解添加到 Dapr 边车服务。

## 使用方式

将注解添加到您的 Deployment 或 StatefulSet Pod 模板中。

### 格式

值应采用逗号分隔的键值对列表：
`key1=value1,key2=value2`

### 示例

以下是一个向 Dapr 边车服务添加自定义注解的 Deployment 示例：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  namespace: default
  labels:
    app: test-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "test-app"
        dapr.io/sidecar-svc-annotations: "com.example.policy.app=test-app,com.example.policy.env=test,com.example.policy.team=platform"
    spec:
      containers:
      - name: test-app
        image: nginx:1.19.2
```

Dapr Operator 生成的 Service 将包含这些注解：

```yaml
apiVersion: v1
kind: Service
metadata:
  annotations:
    com.example.policy.app: test-app
    com.example.policy.env: test
    com.example.policy.team: platform
    dapr.io/app-id: test-app
    prometheus.io/path: /
    prometheus.io/port: "9090"
    prometheus.io/probe: "true"
    prometheus.io/scrape: "true"
  labels:
    dapr.io/enabled: "true"
  name: test-app-dapr
  namespace: default
...
```
