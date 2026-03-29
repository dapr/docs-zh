---
type: docs
title: "配置规范"
linkTitle: "配置"
description: "Dapr Configuration 资源的基本规范"
weight: 5000
---

`Configuration` 是一个 Dapr 资源，用于配置 Dapr 边车、控制平面等。

## 边车格式

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: <REPLACE-WITH-NAME>
  namespace: <REPLACE-WITH-NAMESPACE>
spec:
  api:
    allowed:
      - name: <REPLACE-WITH-API>
        version: <VERSION>
        protocol: <HTTP-OR-GRPC>
  tracing:
    samplingRate: <REPLACE-WITH-INTEGER>
    stdout: true
    otel:
      endpointAddress: <REPLACE-WITH-ENDPOINT-ADDRESS>
      isSecure: <TRUE-OR-FALSE>
      protocol: <HTTP-OR-GRPC>
      headers:
        - name: <HEADER-NAME>
          value: <HEADER-VALUE>
        - name: <HEADER-NAME>
          secretKeyRef:
            name: <SECRET-STORE-NAME>
            key: <SECRET-KEY>
      timeout: <DURATION>
  metrics:
    enabled: <TRUE-OR-FALSE>
    rules:
      - name: <METRIC-NAME>
        labels:
          - name: <LABEL-NAME>
            regex: {}
    recordErrorCodes: <TRUE-OR-FALSE>
    latencyDistributionBuckets:
      - <BUCKET-VALUE-MS-0>
      - <BUCKET-VALUE-MS-1>
    http:
      increasedCardinality: <TRUE-OR-FALSE>
      pathMatching: 
        - <PATH-A>
        - <PATH-B>
      excludeVerbs: <TRUE-OR-FALSE>
  httpPipeline: # 用于传入的 http 调用
    handlers:
      - name: <HANDLER-NAME>
        type: <HANDLER-TYPE>
  appHttpPipeline: # 用于传出的 http 调用
    handlers:
      - name: <HANDLER-NAME>
        type: <HANDLER-TYPE>
  nameResolution:
    component: <NAME-OF-NAME-RESOLUTION-COMPONENT>
    version: <NAME-RESOLUTION-COMPONENT-VERSION>
    configuration:
     <NAME-RESOLUTION-COMPONENT-METADATA-CONFIGURATION>
  secrets:
    scopes:
      - storeName: <NAME-OF-SCOPED-STORE>
        defaultAccess: <ALLOW-OR-DENY>
        deniedSecrets: <REPLACE-WITH-DENIED-SECRET>
  components:
    deny:
      - <COMPONENT-TO-DENY>
  accessControl:
    defaultAction: <ALLOW-OR-DENY>
    trustDomain: <REPLACE-WITH-TRUST-DOMAIN>
    policies:
      - appId: <APP-NAME>
        defaultAction: <ALLOW-OR-DENY>
        trustDomain: <REPLACE-WITH-TRUST-DOMAIN>
        namespace: "default"
        operations:
          - name: <OPERATION-NAME>
            httpVerb: ['POST', 'GET']
            action: <ALLOW-OR-DENY>
```

### 规格字段

| 字段              | 必需 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| accessControl      | N        | 应用于被调用应用的 Dapr 边车。用于配置策略，限制调用应用通过服务调用在被调用应用上可以执行的操作。  | [了解更多关于 `accessControl` 配置的信息。]({{% ref invoke-allowlist.md %}}) |
| api                | N        | 用于仅启用应用所使用的 Dapr 边车 API。  | [了解更多关于 `api` 配置的信息。]({{% ref api-allowlist.md %}}) |
| httpPipeline       | N        | 配置 API 中间件管道 | [中间件管道配置概述]({{% ref "configuration-overview.md#middleware" %}})<br>[了解更多关于 `httpPipeline` 配置的信息。]({{% ref "middleware.md#configure-api-middleware-pipelines" %}}) |
| appHttpPipeline    | N        | 配置应用中间件管道 | [中间件管道配置概述]({{% ref "configuration-overview.md#middleware" %}})<br>[了解更多关于 `appHttpPipeline` 配置的信息。]({{% ref "middleware.md#configure-app-middleware-pipelines" %}}) |
| components         | N        | 用于指定不能被初始化的组件类型的拒绝列表。 | [了解更多关于 `components` 配置的信息。]({{% ref "configuration-overview.md#disallow-usage-of-certain-component-types" %}}) |
| features           | N        | 定义启用/禁用的预览功能。 | [了解更多关于 `features` 配置的信息。]({{% ref preview-features.md %}}) |
| logging            | N        | 配置 Dapr 运行时中的日志记录方式。 | [了解更多关于 `logging` 配置的信息。]({{% ref "configuration-overview.md#logging" %}})  |
| metrics            | N        | 为应用启用或禁用指标。 | [了解更多关于 `metrics` 配置的信息。]({{% ref "configuration-overview.md#metrics" %}}) |
| nameResolution     | N        | 服务调用构建块的名称解析配置规范。 | [了解各组件的 `nameResolution` 配置信息。]({{% ref supported-name-resolution.md %}}) |
| secrets            | N        | 限制 Dapr 应用可以访问的密钥。  | [了解更多关于 `secrets` 配置的信息。]({{% ref secret-scope.md %}}) |
| tracing            | N        | 为应用启用追踪。 | [了解更多关于 `tracing` 配置的信息。]({{% ref "configuration-overview.md#tracing" %}}) |


## 控制平面格式

随 Dapr 安装的 `daprsystem` 配置文件用于应用全局设置，仅在将 Dapr 部署到 Kubernetes 时才会设置。

```yml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprsystem
  namespace: default
spec:
  mtls:
    enabled: true
    allowedClockSkew: 15m
    workloadCertTTL: 24h
```

### 规格字段

| 字段              | 必需 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| mtls               | N        | 定义 mTLS 配置 | `allowedClockSkew: 15m`<br>`workloadCertTTL:24h`<br>[了解更多关于 `mtls` 配置的信息。]({{% ref "configuration-overview.md#mtls-mutual-tls" %}}) |


## 相关链接

- [了解如何使用配置规范]({{% ref configuration-overview.md %}})
