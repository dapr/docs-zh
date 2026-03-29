---
type: docs
title: "操作指南：为 Dapr 边车配置来自密钥的环境变量"
linkTitle: "来自密钥的环境变量"
weight: 7500
description: "将 Kubernetes 密钥中的环境变量注入到 Dapr 边车中"
---
在特殊情况下，Dapr 边车需要向其注入环境变量。此用例可能是组件、第三方库或使用环境变量来配置所述组件或自定义其行为的模块所必需的。这对于生产环境和非生产环境都很有用。

## 概述
在 Dapr 1.15 中，引入了新的 `dapr.io/env-from-secret` 注解，类似于 `dapr.io/env`。
使用此注解，您可以将环境变量注入到 Dapr 边车中，其值来自密钥。

### 注解格式
此注解的值格式如下：

- 单键密钥：`<ENV_VAR_NAME>=<SECRET_NAME>`
- 多键/值密钥：`<ENV_VAR_NAME>=<SECRET_NAME>:<SECRET_KEY>`

`<ENV_VAR_NAME>` 需要遵循 `C_IDENTIFIER` 格式并由 `[A-Za-z_][A-Za-z0-9_]*` 正则表达式捕获：
- 必须以字母或下划线开头
- 标识符的其余部分包含字母、数字或下划线

由于 `secretKeyRef` 的限制，需要设置 `name` 字段，因此必须同时设置 `name` 和 `key`。[在此 Kubernetes 文档的 "env.valueFrom.secretKeyRef.name" 部分了解更多信息。](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#environment-variables)
在这种情况下，Dapr 将两者设置为相同的值。

## 配置单键密钥环境变量
在以下示例中，`dapr.io/env-from-secret` 注解被添加到 Deployment 中。
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodeapp
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "nodeapp"
        dapr.io/app-port: "3000"
        dapr.io/env-from-secret: "AUTH_TOKEN=auth-headers-secret"
    spec:
      containers:
      - name: node
        image: dapriosamples/hello-k8s-node:latest
        ports:
        - containerPort: 3000
        imagePullPolicy: Always
```

值为 `"AUTH_TOKEN=auth-headers-secret"` 的 `dapr.io/env-from-secret` 注解被注入为：

```yaml
env:
- name: AUTH_TOKEN
    valueFrom:
    secretKeyRef:
        name: auth-headers-secret
        key: auth-headers-secret
```
这要求密钥同时具有相同值的 `name` 和 `key` 字段，即 "auth-headers-secret"。

**示例密钥**

> **注意：**以下示例仅用于演示目的。不建议以明文形式存储密钥。

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: auth-headers-secret
type: Opaque
stringData:
  auth-headers-secret: "AUTH=mykey"
```

## 配置多键密钥环境变量

在以下示例中，`dapr.io/env-from-secret` 注解被添加到 Deployment 中。
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodeapp
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "nodeapp"
        dapr.io/app-port: "3000"
        dapr.io/env-from-secret: "AUTH_TOKEN=auth-headers-secret:auth-header-value"
    spec:
      containers:
      - name: node
        image: dapriosamples/hello-k8s-node:latest
        ports:
        - containerPort: 3000
        imagePullPolicy: Always
```
值为 `"AUTH_TOKEN=auth-headers-secret:auth-header-value"` 的 `dapr.io/env-from-secret` 注解被注入为：
```yaml
env:
- name: AUTH_TOKEN
    valueFrom:
    secretKeyRef:
        name: auth-headers-secret
        key: auth-header-value
```

**示例密钥**

 > **注意：**以下示例仅用于演示目的。不建议以明文形式存储密钥。
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: auth-headers-secret
type: Opaque
stringData:
  auth-header-value: "AUTH=mykey"
```
