---
type: docs
title: "JavaScript SDK"
linkTitle: "JavaScript"
weight: 1000
description: 用于开发 Dapr 应用程序的 JavaScript SDK 软件包
no_list: true
cascade:
  github_repo: https://github.com/dapr/js-sdk
  github_subdir: daprdocs/content/en/js-sdk-docs
  path_base_for_github_subdir: content/en/developing-applications/sdks/js/
  github_branch: main
---

一个用于在 JavaScript 和 TypeScript 中构建 Dapr 应用程序的客户端库。该客户端抽象了服务间的 service invocation、State Management、pub/sub、secrets 等公开 Dapr API，并提供简单直观的 API 用于构建应用程序。

## 安装

要开始使用 JavaScript SDK，请从 [NPM](https://www.npmjs.com/package/@dapr/dapr) 安装 Dapr JavaScript SDK 软件包：

```bash
npm install --save @dapr/dapr
```

## 对话

通过 HTTP 或 gRPC，使用 `DaprClient.conversation` 与大型语言模型 (LLM) 对话，包括工具调用、结构化输出、PII 清理、提示词缓存保留以及 token 用量统计。这些指南面向 JavaScript SDK **3.19.0 或更高版本**。

请先阅读[对话操作指南]({{% ref js-conversation-howto.md %}})。有关运行时要求和请求选项，请参阅[客户端用法]({{% ref js-conversation-client-usage.md %}})；有关完整的函数调用往返流程，请参阅[工具调用]({{% ref js-conversation-tools-howto.md %}})。

## Jobs

使用 `DaprClient.jobs` 和 `DaprServer.jobs` 调度一次性、基于间隔或基于 Cron 的 job，并接收其回调。job 功能需要 JavaScript SDK **3.19.0 或更高版本**、Dapr runtime **1.16 或更高版本**，以及正在运行的 Scheduler service。

请参阅[job 操作指南]({{% ref js-jobs-howto.md %}})，阅读[客户端与回调用法指南]({{% ref js-jobs-client-usage.md %}})，或使用 [cron 构建器]({{% ref js-jobs-cron.md %}})构建基于日历的调度计划。

## 配置

使用 `DaprClient.configuration` 读取应用设置并订阅其变更。[配置操作指南]({{% ref js-configuration-howto.md %}})和[客户端用法指南]({{% ref js-configuration-client-usage.md %}})涵盖指定键或全部键、存储特定的 metadata、响应处理以及订阅清理，适用于 `@dapr/dapr` 3.19.0 或更高版本。在 JavaScript SDK 中，配置操作需要使用 gRPC。

## State Management

使用 `DaprClient.state` 保存、读取和删除应用状态。SDK 支持通过 HTTP 或 gRPC 进行批量操作、ETag、一致性选项、事务、TTL metadata、自定义序列化以及 Query State。

请参阅[State Management 操作指南]({{% ref js-state-management-howto.md %}})，阅读[客户端用法指南]({{% ref js-state-management-client-usage.md %}})了解特定协议的行为，或学习如何[进行 Query State]({{% ref js-state-management-query.md %}})。这些指南面向 JavaScript SDK 3.19.0 或更高版本。

## 发布和订阅

通过 HTTP 或 gRPC 发布单个事件或批量事件，接收编程式服务端回调，或通过客户端发起的 gRPC 流进行订阅，无需应用程序服务器。

[发布和订阅指南]({{% ref js-pubsub %}})涵盖 JavaScript SDK 3.19.0 或更高版本，包括 Routing、确认、死信主题、序列化、错误处理以及订阅清理。

## service invocation

通过 HTTP 或 gRPC 调用服务，并通过 `DaprServer` 或已有的 HTTP 应用程序接收调用请求。

[service invocation 指南]({{% ref js-service-invocation %}})涵盖 JavaScript SDK 3.19.0 或更高版本，包括请求头、查询参数、回调响应、序列化、错误处理以及传输限制。

## secrets

使用 `DaprClient.secret` 读取单个 secrets 和批量 secrets。有关配置步骤，请参阅[secrets 操作指南]({{% ref js-secrets-howto.md %}})；有关 metadata、响应结构以及 HTTP/gRPC 差异，请阅读[客户端用法指南]({{% ref js-secrets-client-usage.md %}})。这些指南面向 JavaScript SDK 3.19.0 或更高版本。

## Binary Store

通过 HTTP 或 gRPC 使用 `DaprClient.binaryStore` 存储、读取、流式传输和删除二进制文件。Binary Store 需要 Dapr runtime 1.19 或更高版本以及 JavaScript SDK 3.19.0 或更高版本。

请参阅[Binary Store 操作指南]({{% ref js-binarystore-howto.md %}})开始使用，或阅读[客户端用法指南]({{% ref js-binarystore-client-usage.md %}})了解配置、流式传输、取消以及错误处理。

## 加密

在 **`@dapr/dapr` 3.19.0 或更高版本**中，通过 HTTP 或 gRPC 使用 `DaprClient.crypto` 加密和解密消息与文件。对于大负载和生产环境中的流式传输，请优先使用 gRPC。

请参阅[加密操作指南]({{% ref js-cryptography-howto.md %}})以配置 component 并加密数据。阅读[客户端用法指南]({{% ref js-cryptography-client-usage.md %}})了解支持的输入、密码算法、密钥引用、流式传输以及限制。

## 搜索

通过 HTTP 或 gRPC 使用 `DaprClient.search` 管理索引，并对 JSON 文档进行索引、读取、删除和查询。搜索需要 Dapr runtime 1.19 或更高版本以及 JavaScript SDK 3.19.0 或更高版本。

请参阅[搜索操作指南]({{% ref js-search-howto.md %}})开始使用，或阅读[客户端用法指南]({{% ref js-search-client-usage.md %}})了解查询选项、分页、写入确认、取消以及错误。

## 向量

通过 HTTP 或 gRPC 使用 `DaprClient.vector` 存储预先计算的嵌入向量，并执行相似性搜索。向量功能需要 1.19 发行系列或更高版本、支持向量的 Dapr runtime，以及 JavaScript SDK 3.19.0 或更高版本。

请参阅[向量操作指南]({{% ref js-vector-howto.md %}})开始使用，或阅读[客户端用法指南]({{% ref js-vector-client-usage.md %}})了解配置、索引的写入确认、取消以及错误处理。

## 结构

Dapr JavaScript SDK 包含两个主要 component：

- **DaprServer**：管理所有 Dapr sidecar 与应用程序之间的通信。
- **DaprClient**：管理所有应用程序与 Dapr sidecar 之间的通信。

上述通信可配置为使用 gRPC 或 HTTP 协议。

<table>
  <tr>
  <td bgcolor="white"> <img src="images/dapr-server.jpg" alt="Dapr Server" width="500px"> </td>
  <td bgcolor="white"> <img src="images/dapr-client.jpg" alt="Dapr Client" width="500px"> </td>
  </tr>
</table>

## 快速入门

为了帮助你快速入门，请查看以下资源：

<div class="card-deck">
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>客户端</b></h5>
      <p class="card-text">创建 JavaScript 客户端，并与 Dapr sidecar 及其他 Dapr 应用程序交互（例如发布事件、output binding 支持等）。 </p>
      <a href="{{% ref js-client %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>服务器</b></h5>
      <p class="card-text">创建 JavaScript 服务器，并让 Dapr sidecar 与你的应用程序交互（例如订阅事件、input binding 支持等）。 </p>
      <a href="{{% ref js-server %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>Actors</b></h5>
      <p class="card-text">创建具有状态、reminder/timer 和方法的 virtual Actor。</p>
      <a href="{{% ref js-actors %}}" class="stretched-link"></a>
    </div>
  </div>
</div>
<br />
<div class="card-deck">
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>日志</b></h5>
      <p class="card-text">配置和自定义 SDK 日志。</p>
      <a href="{{% ref js-logger %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>示例</b></h5>
      <p class="card-text">克隆 JavaScript SDK 源代码并试用一些示例，以快速入门。</p>
      <a href="{{% ref js-examples %}}" class="stretched-link"></a>
    </div>
  </div>
</div>
