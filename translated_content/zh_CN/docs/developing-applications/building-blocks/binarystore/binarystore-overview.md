---
type: docs
title: "Binary Store 概述"
linkTitle: "概述"
weight: 100
description: "Dapr Binary Store 构建块概述"
---

Dapr Binary Store 构建块提供了一套可移植的 API，用于通过已配置的组件存储、检索和删除二进制文件。应用通过文件名和 Binary Store 组件的名称来定位文件。运行时在应用与组件之间以流的方式传输文件内容，而不是将其包装在 JSON 值中。这样可以避免运行时额外占用一份完整文件大小的缓冲区，不过所选组件仍可能自行缓冲内容或设定自身的大小限制。

Binary Store 面向文件及其他不透明的二进制内容。对于自然以键/值数据表示的小型应用值，请改用[状态管理]({{% ref "state-management-overview.md" %}})。

{{% alert title="Alpha API" color="warning" %}}
Binary Store API 目前处于 [Alpha 阶段]({{% ref "certification-lifecycle.md" %}})。HTTP API 使用 `v1.0-alpha1` 版本，对应的 gRPC 方法同样处于 Alpha 阶段。该 API 在未来的版本中可能发生变化。
{{% /alert %}}

## 特性

Binary Store 构建块提供以下功能：

- **组件可移植性**：通过组件的配置名称使用组件，更换存储后端时无需修改应用中的 API 调用。
- **流式传输**：以流的形式上传和下载文件内容，而不是包装在 JSON 载荷中。
- **创建或替换行为**：仅当文件不存在时创建文件，或显式替换已存在的文件。
- **文件操作**：使用相同的组件和文件名检索和删除指定文件。

文件名可以包含嵌套的相对路径，例如 `reports/2026/summary.pdf`。名称不得以 `/` 开头或结尾，不得包含空的路径段、`.` 或 `..` 路径段，也不得包含 `\`、`*`、`?`、`[`、`]` 或 `#`。运行时会拒绝无效的名称。

## 组件

Binary Store 通过 Dapr 组件进行配置。组件的 `metadata.name` 即为 Binary Store API 请求中使用的存储名称，`spec.type` 用于选择具体实现。组件特定的连接信息和能力在组件的 metadata 中配置。有关各提供方的配置详情，请参阅[受支持的 Binary Store 组件]({{% ref "reference/components-reference/supported-binarystores/_index.md" %}})，或浏览[Binary Store 组件实现](https://github.com/dapr/components-contrib/tree/master/binarystore)。

Dapr 运行时内置了一个 `in-memory` Binary Store 组件，用于本地开发和测试。该组件不具备持久性：文件保存在边车的内存中，不与其他边车实例共享，进程停止后即丢失。其默认单文件最大大小为 4 MiB，默认存储总大小为 512 MiB。这些限制可以在该组件上配置；其他存储的限制和持久性取决于具体组件。

## Binary Store API

HTTP API 在 `/v1.0-alpha1/binarystore/{storeName}/{fileName}` 路径上提供 `POST`、`PUT`、`GET` 和 `DELETE` 操作。请求体和响应体均为原始文件字节。`POST` 仅在文件不存在时创建文件，`PUT` 则会创建文件或替换已存在的文件。上传或删除成功时返回 `204 No Content`，下载成功时以 `application/octet-stream` 内容类型流式返回文件。

有关端点参数、响应码和 gRPC 方法的详细信息，请参阅[Binary Store API 参考]({{% ref binary_store_api.md %}})。

## 后续步骤

- 按照[操作指南]({{% ref howto-use-binary-store.md %}})配置存储并使用 HTTP API。
- 查阅[Binary Store API 参考]({{% ref binary_store_api.md %}})。
