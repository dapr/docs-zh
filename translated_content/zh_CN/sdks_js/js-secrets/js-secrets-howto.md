---
type: docs
title: "操作指南：使用 Dapr JavaScript SDK 检索机密"
linkTitle: "操作指南：检索机密"
weight: 52050
description: "使用 Dapr JavaScript SDK 配置机密存储，并检索单个机密和批量机密"
---

本指南使用 `DaprClient.secret` 从本地机密存储中检索单个机密以及所有可访问的机密。示例使用 JavaScript ES 模块；TypeScript 中同样可以使用这些方法。

## 前提条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化的 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- [Node.js](https://nodejs.org/) 18 或更高版本
- [`@dapr/dapr`](https://www.npmjs.com/package/@dapr/dapr) 包，版本 3.19.0 或更高

在应用目录中，如有需要请初始化 npm 项目，并安装 SDK：

```sh
npm init -y
npm install @dapr/dapr@3.19.0
```

显式指定版本可确保 npm 安装本指南所使用的 3.19.0 版本。你也可以替换为更高的版本。

## 配置本地机密存储

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

组件的 `metadata.name`（即 `local-secret-store`）就是传给 SDK 的存储名称。`secretsFile` 的路径相对于运行 `dapr run` 的目录，而不是组件文件所在的目录。将 `multiValued` 设为 `"true"` 后，`database` 机密即可同时包含 `username` 和 `password`。

{{% alert title="仅用于开发" color="warning" %}}
本地文件组件会以明文读取机密，且不进行身份验证。本示例只使用虚拟值，请勿提交真实机密；对于已部署的应用，请配置生产环境的[机密存储]({{% ref supported-secret-stores %}})。
{{% /alert %}}

有关扁平化和多值机密的行为，请参阅[本地文件机密存储参考]({{% ref file-secret-store.md %}})。

## 检索单个机密与批量机密

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

在包含 `secrets.json` 的目录中启动应用及其边车：

```sh
dapr run --app-id secrets-example --dapr-http-port 3500 --dapr-grpc-port 50001 --resources-path .\components -- node app.mjs
```

这是一个仅作为客户端的应用；它不需要 `DaprServer`、应用端口或入站机密处理程序。

### 单个机密的响应

`get(storeName, key)` 直接返回机密的键值数据。对于名称/值形式的机密，唯一的键就是机密名称本身；对于多值机密，键是其各个字段，不包含机密名称。以示例数据为例，`get(storeName, "api-key")` 返回：

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

`getBulk(storeName)` 返回一个以机密名称为键的对象，其值是包含每个机密数据的嵌套对象：

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

批量检索并不是数组，也不是分页迭代器。它会将完整响应加载到内存中。仅当应用需要所有可访问的机密，且组件支持批量检索时，才使用它。

## 使用 gRPC

配置 `CommunicationProtocolEnum.GRPC` 以及边车的 gRPC 端口 `"50001"`，以替代 HTTP 和 `"3500"`。`get` 和 `getBulk` 方法同样可用。

{{% alert title="多值单个机密的限制" color="warning" %}}
在 SDK 3.19.0 中，gRPC 的 `get` 只返回运行时机密数据映射中的第一个条目。在本示例中，它永远不会同时返回 database 的两个字段，因此只更改协议会导致 database 校验失败。对于多值的单个机密，请保留 HTTP。gRPC 的 `getBulk` 会保留所有嵌套值，但它检索的是所有可访问的机密，而不仅仅是某一个。
{{% /alert %}}

## 通过 HTTP 传递存储特定的元数据

`get` 的第三个参数是一个查询字符串**字符串**，而不是元数据对象。每个参数都要包含 `metadata.` 前缀，并省略开头的 `?`。请使用 `URLSearchParams` 对值进行编码。

例如，对于名为 `aws-secrets` 的 AWS Secrets Manager 组件，检索特定版本：

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

此代码片段假定已存在 HTTP `client` 以及单独配置的 AWS 组件；本地文件示例不需要它。支持的元数据取决于[机密存储组件]({{% ref supported-secret-stores %}})。例如，Kubernetes 支持 `metadata.namespace`，而部分云端存储支持选择版本。

gRPC 实现在 SDK 3.19.0 中会忽略此参数。`getBulk` 在两种协议下都没有元数据参数。有关完整的 API 范围和错误行为，请参阅[客户端用法指南]({{% ref js-secrets-client-usage.md %}})。
