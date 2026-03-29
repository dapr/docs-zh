---
type: docs
title: "弹性规范"
linkTitle: "弹性"
weight: 3000
description: "Dapr 弹性资源的基本规范"
---

`Resiliency` Dapr 资源允许您定义和应用容错弹性策略。弹性规范在 Dapr 边车启动时应用。

{{% alert title="注意" color="primary" %}}
任何弹性资源都可以限制到特定的[命名空间]({{% ref isolation-concept.md %}})，并通过作用域限制对任何特定应用程序集的访问。
{{% /alert %}}

## 格式

```yml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: <REPLACE-WITH-RESOURCE-NAME>
version: v1alpha1
scopes:
  - <REPLACE-WITH-SCOPED-APPIDS>
spec:
  policies: # Required
    timeouts:
      timeoutName: <REPLACE-WITH-TIME-VALUE> # Replace with any unique name
    retries:
      retryName: # Replace with any unique name
        policy: <REPLACE-WITH-VALUE>
        duration: <REPLACE-WITH-VALUE>
        maxInterval: <REPLACE-WITH-VALUE>
        maxRetries: <REPLACE-WITH-VALUE>
        matching:
          httpStatusCodes: <REPLACE-WITH-VALUE>
          gRPCStatusCodes: <REPLACE-WITH-VALUE>
    circuitBreakers:
      circuitBreakerName: # Replace with any unique name
        maxRequests: <REPLACE-WITH-VALUE>
        timeout: <REPLACE-WITH-VALUE> 
        trip: <REPLACE-WITH-CONSECUTIVE-FAILURE-VALUE>
targets: # Required
    apps:
      appID: # Replace with scoped app ID
        timeout: <REPLACE-WITH-TIMEOUT-NAME>
        retry: <REPLACE-WITH-RETRY-NAME>
        circuitBreaker: <REPLACE-WITH-CIRCUIT-BREAKER-NAME>
    actors:
      myActorType: 
        timeout: <REPLACE-WITH-TIMEOUT-NAME>
        retry: <REPLACE-WITH-RETRY-NAME>
        circuitBreaker: <REPLACE-WITH-CIRCUIT-BREAKER-NAME>
        circuitBreakerCacheSize: <REPLACE-WITH-VALUE>
    components:
      componentName: # Replace with your component name
        outbound:
          timeout: <REPLACE-WITH-TIMEOUT-NAME>
          retry: <REPLACE-WITH-RETRY-NAME>
          circuitBreaker: <REPLACE-WITH-CIRCUIT-BREAKER-NAME>
```

## 规范字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| policies | Y | 弹性策略的配置，包括：<br><ul><li>`timeouts`</li><li>`retries`</li><li>`circuitBreakers`</li></ul> <br> [查看包含所有内置策略的更多示例]({{% ref resiliency-overview.md %}}) | timeout: `general`<br>retry: `retryForever`<br>circuit breaker: `simpleCB` |
| targets | Y | 使用弹性策略的应用程序、Actor 或组件的配置。<br>[在弹性目标指南中查看更多示例]({{% ref targets.md %}})  | `apps` <br>`components`<br>`actors` |


## 相关链接
[了解更多关于弹性策略和目标的信息]({{% ref resiliency-overview.md %}})
