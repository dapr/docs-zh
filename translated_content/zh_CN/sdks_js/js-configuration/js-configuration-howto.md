---
type: docs
title: "操作指南：使用 Dapr JavaScript SDK 管理配置"
linkTitle: "操作指南：管理配置"
weight: 54050
description: 使用 Dapr JavaScript SDK 获取应用设置，并订阅配置变更
---

使用 `DaprClient.configuration` 读取应用设置，并响应设置变更，无需直接调用配置存储。本指南使用 Redis 进行本地开发。

## 前提条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}}) 以及已初始化的 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- [Node.js](https://nodejs.org/) 18 或更高版本
- [`@dapr/dapr`](https://www.npmjs.com/package/@dapr/dapr) 包，版本 3.19.0 或更高
- Docker，用于下面的 Redis 示例

在应用目录中（如有需要，先初始化 npm 项目），安装 SDK：

```sh
npm init -y
npm install @dapr/dapr@3.19.0
```

示例使用保存为 `.mjs` 文件的 JavaScript ES 模块，不需要 TypeScript 编译器。同样的 API 在 TypeScript 中也可用。

## 配置存储

启动一个专用的本地 Redis 实例，监听 6380 端口，以避免与 `dapr init` 启动的 Redis 冲突：

```sh
docker run --name js-config-redis -p 127.0.0.1:6380:6379 -d redis:7
```

Redis 配置组件会在订阅开始时启用所需的键空间通知，因此无需额外的 Redis 标志。本示例未启用身份验证，并将 Redis 绑定到回环地址，仅用于本地开发。生产环境中，请按照 [Redis 配置存储参考]({{% ref redis-configuration-store.md %}}) 中的说明配置身份验证和 TLS。

在应用目录中创建 `components` 目录，并将以下内容保存为 `components\configstore.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: configstore
spec:
  type: configuration.redis
  version: v1
  metadata:
    - name: redisHost
      value: "localhost:6380"
    - name: redisPassword
      value: ""
```

组件的 `metadata.name`（即 `configstore`）是每个 SDK 方法所使用的存储名称。Redis 状态存储组件不是配置存储；组件类型必须为 `configuration.redis`。

填充存储：

```sh
docker exec js-config-redis redis-cli MSET orderId1 "101||1" orderId2 "102||1"
```

本示例使用 `value||version` 格式的 Redis 配置值。SDK 会将值和版本分别以字符串形式返回。

## 获取配置项

将以下代码保存为 `get-configuration.mjs`：

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: process.env.DAPR_GRPC_PORT ?? "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
});

try {
  const config = await client.configuration.get(
    "configstore",
    ["orderId1", "orderId2"],
  );

  for (const [key, item] of Object.entries(config.items)) {
    console.log(`${key}: ${item.value} (version ${item.version})`);
  }

  const order = config.items["orderId1"];
  if (order === undefined) {
    throw new Error("Required configuration key orderId1 was not returned");
  }
} finally {
  await client.stop();
}
```

使用 Dapr 边车运行它：

```sh
dapr run --app-id js-config-reader --dapr-grpc-port 50001 --resources-path .\components -- node get-configuration.mjs
```

对于已写入的示例值，应用会输出：

```text
orderId1: 101 (version 1)
orderId2: 102 (version 1)
```

若要获取所有配置项，可省略键参数，或传入空数组：

```javascript
const config = await client.configuration.get("configstore");
```

空键列表会被发送给组件。能否返回全部键，以及包含哪些键，取决于存储。请显式检查所需的键，而不要假设每个请求的键都一定存在。

## 订阅配置变更

将以下代码保存为 `watch-configuration.mjs`：

```javascript
import { setTimeout } from "node:timers/promises";
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: process.env.DAPR_GRPC_PORT ?? "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
});

let subscription;

try {
  subscription = await client.configuration.subscribeWithKeys(
    "configstore",
    ["orderId1", "orderId2"],
    async (changes) => {
      for (const [key, item] of Object.entries(changes.items)) {
        console.log(`${key}: ${item.value} (version ${item.version})`);
      }
    },
  );

  console.log("Subscription requested; watching for 60 seconds");
  await setTimeout(60_000);
} finally {
  try {
    if (subscription) {
      await subscription.stop();
    }
  } finally {
    await client.stop();
  }
}
```

等读取程序退出后，再运行订阅程序：

```sh
dapr run --app-id js-config-watcher --dapr-grpc-port 50001 --resources-path .\components -- node watch-configuration.mjs
```

在另一个终端中，于订阅程序运行期间修改一个被监听的键：

```sh
docker exec js-config-redis redis-cli SET orderId1 "103||2"
```

订阅建立后，回调会输出 `orderId1: 103 (version 2)`。订阅返回的 Promise 只是本地句柄，并不表示服务端已确认就绪。如果在启动应用后立即更新存储，订阅可能尚未生效。

要监听整个存储，请将 `subscribeWithKeys` 调用替换为：

```javascript
subscription = await client.configuration.subscribe(
  "configstore",
  async (changes) => {
    console.log("Configuration changes:", changes.items);
  },
);
```

全键订阅的行为（包括之后新增的键是否会被监听）取决于组件。每个订阅都有自己的句柄；关闭时必须停止每一个订阅。不需要 `DaprServer`、应用回调路由或 `--app-port`：更新会通过客户端的 gRPC 流到达。

## 后续步骤

阅读[客户端用法指南]({{% ref js-configuration-client-usage.md %}})，了解请求元数据、响应处理，以及重要的订阅失败和清理限制。
