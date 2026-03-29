---
type: docs
title: "Health API 参考"
linkTitle: "Health API"
description: "Health API 的详细文档"
weight: 800
---

Dapr 提供了可用于 Dapr 就绪或存活检测以及 SDK 初始化就绪的健康检查探针。

## 获取 Dapr 健康状态

通过以下方式获取 Dapr 的健康状态：
- 检查边车健康状态
- 检查边车健康状态，包括组件就绪状态，用于初始化期间。

### 等待 Dapr HTTP 端口变为可用

等待所有组件初始化完成，Dapr HTTP 端口可用_并且_应用通道已初始化。例如，此端点与 Kubernetes 存活探针一起使用。

#### HTTP 请求

```
GET http://localhost:<daprPort>/v1.0/healthz
```

#### HTTP 响应代码

代码 | 描述
---- | -----------
204  | Dapr 健康
500  | Dapr 不健康

#### URL 参数

参数 | 描述
--------- | -----------
daprPort | Dapr 端口

#### 示例

```shell
curl -i http://localhost:3500/v1.0/healthz
```

### 等待针对 `/outbound` 路径的特定健康检查

等待所有组件初始化完成，Dapr HTTP 端口可用，但应用通道尚未建立。此端点使您的应用能够在应用通道初始化之前对 Dapr 边车 API 执行调用，例如使用 secrets API 读取机密。例如，在 Dapr SDK 的 `waitForSidecar` 方法中使用（例如 .NET 和 Java SDK）来检查边车是否已正确初始化并准备好接受任何调用。

例如，[Java SDK]({{% ref "java-client.md#wait-for-sidecar" %}}) 和 [.NET SDK]({{% ref "dotnet-client.md#wait-for-sidecar" %}}) 使用此端点进行初始化。

目前，`.NET SDK`、`Java SDK`、`Python SDK` 和 `JavaScript SDK` 中支持 `v1.0/healthz/outbound` 端点。

#### HTTP 请求

```
GET http://localhost:<daprPort>/v1.0/healthz/outbound
```

#### HTTP 响应代码

代码 | 描述
---- | -----------
204  | Dapr 健康
500  | Dapr 不健康

#### URL 参数

参数 | 描述
--------- | -----------
daprPort | Dapr 端口
 
#### 示例

```shell
curl -i http://localhost:3500/v1.0/healthz/outbound
```

## 相关文章

- [边车健康]({{% ref "sidecar-health.md" %}})
- [应用健康]({{% ref "app-health.md" %}})
