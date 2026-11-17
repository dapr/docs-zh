---
type: docs
title: "操作指南：使用 Dapr JavaScript SDK 检索 secrets"
linkTitle: "操作指南：检索 secrets"
weight: 52050
description: "使用 Dapr JavaScript SDK 配置 secret store，并检索单个 secrets 和批量 secrets"
---

本指南使用 `DaprClient.secret` 从本地 secret store 中检索单个 secrets 以及所有可访问的 secrets。示例使用 JavaScript ES 模块；TypeScript 中同样可以使用这些方法。

## 前提条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化的 [Dapr environment]({{% ref install-dapr-selfhost.md %}})
- [Node.js](https://nodejs.org/) 18 或更高版本
- [`@dapr/dapr`](https://www.npmjs.com/package/@dapr/dapr) 包，版本 3.19.0 或更高

在应用目录中，如有需要请初始化 npm 项目，并安装 SDK：

```sh
npm init -y
npm install @dapr/dapr@3.19.0
```

显式指定版本可确保 npm 安装本指南所使用的 3.19.0 版本。你也可以替换为更高的版本。

## 配置本地 secret store

在应用的工作目录中创建名为 `secrets.json` 的文件：

```json
{
  "api-key": "development-api-key",
  "database": {
    "username": "development-user",
    "password": "development-password"
  }
}
```

创建一个 `components` 目录，并将以下内容保存为 `components\local-secret-store.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-secret-store
spec:
  type: secretstores.local.file
  version: v1
  metadata:
    - name: secretsFile
      value: secrets.json
    - name: multiValued
      value: "true"
```

component 的 `metadata.name`（即 `local-secret-store`）就是传给 SDK 的存储名称。`secretsFile` 的路径相对于运行 `dapr run` 的目录，而不是 component 文件所在的目录。将 `multiValued` 设为 `"true"` 后，`database` secrets 即可同时包含 `username` 和 `password`。

{{% alert title="仅用于开发" color="warning" %}}
本地文件 component 会以明文读取 secrets，且不进行身份验证。本示例只使用虚拟值，请勿提交真实 secrets；对于已部署的应用，请配置生产环境的[secret store]({{% ref supported-secret-stores %}})。
{{% /alert %}}

有关扁平化和多值 secrets 的行为，请参阅[local file secret store 参考]({{% ref file-secret-store.md %}})。

## 检索单个 secrets 与批量 secrets

将以下内容保存为 `app.mjs`。使用 `.mjs` 扩展名可以让 Node.js 运行该 ES 模块，而无需修改项目的包配置。

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "3500",
  communicationProtocol: CommunicationProtocolEnum.HTTP,
});

const storeName = "local-secret-store";

try {
  const apiKey = await client.secret.get(storeName, "api-key");
  if (typeof apiKey["api-key"] !== "string") {
    throw new Error("The required api-key secret was not returned");
  }

  const database = await client.secret.get(storeName, "database");
  if (
    typeof database.username !== "string" ||
    typeof database.password !== "string"
  ) {
    throw new Error("The required database credentials were not returned");
  }

  const secrets = await client.secret.getBulk(storeName);
  if (
    typeof secrets.database?.username !== "string" ||
    typeof secrets.database?.password !== "string"
  ) {
    throw new Error("Bulk retrieval did not return the database credentials");
  }

  console.log("Retrieved the required secrets without logging their values");
} finally {
  await client.stop();
}
```

在包含 `secrets.json` 的目录中启动应用及其 sidecar：

```sh
dapr run --app-id secrets-example --dapr-http-port 3500 --dapr-grpc-port 50001 --resources-path .\components -- node app.mjs
```

这是一个仅作为客户端的应用；它不需要 `DaprServer`、应用端口或入站 secrets 处理程序。

### 单个 secrets 的响应

`get(storeName, key)` 直接返回 secrets 的键值数据。对于名称/值形式的 secrets，唯一的键就是 secrets 名称本身；对于多值 secrets，键是其各个字段，不包含 secrets 名称。以示例数据为例，`get(storeName, "api-key")` 返回：

```json
{
  "api-key": "development-api-key"
}
```

通过 HTTP 时，`get(storeName, "database")` 会同时返回两个值：

```json
{
  "username": "development-user",
  "password": "development-password"
}
```

### 批量响应

`getBulk(storeName)` 返回一个以 secrets 名称为键的对象，其值是包含每个 secrets 数据的嵌套对象：

```json
{
  "api-key": {
    "api-key": "development-api-key"
  },
  "database": {
    "username": "development-user",
    "password": "development-password"
  }
}
```

批量检索并不是数组，也不是分页迭代器。它会将完整响应加载到内存中。仅当应用需要所有可访问的 secrets，且 component 支持批量检索时，才使用它。

## 使用 gRPC

配置 `CommunicationProtocolEnum.GRPC` 以及 sidecar 的 gRPC 端口 `"50001"`，以替代 HTTP 和 `"3500"`。`get` 和 `getBulk` 方法同样可用。

{{% alert title="多值单个 secrets 的限制" color="warning" %}}
在 SDK 3.19.0 中，gRPC 的 `get` 只返回运行时 secrets 数据映射中的第一个条目。在本示例中，它永远不会同时返回 database 的两个字段，因此只更改协议会导致 database 校验失败。对于多值的单个 secrets，请保留 HTTP。gRPC 的 `getBulk` 会保留所有嵌套值，但它检索的是所有可访问的 secrets，而不仅仅是某一个。
{{% /alert %}}

## 通过 HTTP 传递存储特定的 metadata

`get` 的第三个参数是一个查询字符串**字符串**，而不是 metadata 对象。每个参数都要包含 `metadata.` 前缀，并省略开头的 `?`。请使用 `URLSearchParams` 对值进行编码。

例如，对于名为 `aws-secrets` 的 AWS Secrets Manager component，检索特定版本：

```javascript
const metadata = new URLSearchParams({
  "metadata.version_id": "your-version-id",
}).toString();

const secret = await client.secret.get(
  "aws-secrets",
  "database-password",
  metadata,
);
```

此代码片段假定已存在 HTTP `client` 以及单独配置的 AWS component；本地文件示例不需要它。支持的 metadata 取决于[secret store component]({{% ref supported-secret-stores %}})。例如，Kubernetes 支持 `metadata.namespace`，而部分云端存储支持选择版本。

gRPC 实现在 SDK 3.19.0 中会忽略此参数。`getBulk` 在两种协议下都没有 metadata 参数。有关完整的 API 范围和错误行为，请参阅[客户端用法指南]({{% ref js-secrets-client-usage.md %}})。
