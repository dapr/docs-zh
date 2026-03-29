---
type: docs
title: "如何操作：使用 Visual Studio Code 调试 Dapr 应用程序"
linkTitle: "如何操作：使用 VSCode 调试"
weight: 20000
description:  "学习如何配置 VSCode 以调试 Dapr 应用程序"
aliases:
  - /zh-hans/developing-applications/ides/vscode/vscode-manual-configuration/
---

{{% alert title="弃用通知" color="primary" %}}
该扩展此前由 Microsoft 支持，但现已弃用。该扩展在 Visual Studio Code marketplace 中仍然可用，但将不再接收更新或支持。

{{% /alert %}}

## 手动调试

开发 Dapr 应用程序时，通常使用 Dapr CLI 启动 daprized 服务，类似这样：

```bash
dapr run --app-id nodeapp --app-port 3000 --dapr-http-port 3500 app.js
```

将调试器附加到服务的一种方法是首先在命令行中使用正确参数运行 daprd，然后启动代码并附加调试器。虽然这是一个完全可接受的解决方案，但它确实需要一些额外的步骤，并且需要向可能想要克隆你的仓库并点击"播放"按钮开始调试的开发者提供一些指导。

如果你的应用程序是一组微服务，每个都有 Dapr 边车，在 Visual Studio Code 中一起调试它们将非常有用。本页面将使用 [hello world 快速入门](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-world)来展示如何配置 VSCode 以使用 [VSCode 调试](https://code.visualstudio.com/Docs/editor/debugging)来调试多个 Dapr 应用程序。

## 前提条件

- 安装 [Dapr 扩展]({{% ref vscode-dapr-extension.md %}})。稍后你将使用它提供的 [任务](https://code.visualstudio.com/docs/editor/tasks)。
- 可选：克隆 [hello world 快速入门](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-world)

## 步骤 1：配置 launch.json

文件 `.vscode/launch.json` 包含 VS Code 调试运行的 [启动配置](https://code.visualstudio.com/Docs/editor/debugging#_launch-configurations)。该文件定义了当用户开始调试时将启动什么以及如何配置。[Visual Studio Code marketplace](https://marketplace.visualstudio.com/VSCode)中提供了每种编程语言的配置。

{{% alert title="脚手架调试配置" color="primary" %}}
[Dapr VSCode 扩展]({{% ref vscode-dapr-extension.md %}})提供内置脚手架，可为你生成 `launch.json` 和 `tasks.json`。

{{< button text="了解更多" page="vscode-dapr-extension.md#scaffold-dapr-components" >}}
{{% /alert %}}

在 hello world 快速入门的情况下，启动了两个应用程序，每个都有自己的 Dapr 边车。一个用 Node.JS 编写，另一个用 Python 编写。你会注意到每个配置都包含一个 `daprd run` preLaunchTask 和一个 `daprd stop` postDebugTask。

```json
{
    "version": "0.2.0",
    "configurations": [
       {
         "type": "pwa-node",
         "request": "launch",
         "name": "Nodeapp with Dapr",
         "skipFiles": [
             "<node_internals>/**"
         ],
         "program": "${workspaceFolder}/node/app.js",
         "preLaunchTask": "daprd-debug-node",
         "postDebugTask": "daprd-down-node"
       },
       {
         "type": "python",
         "request": "launch",
         "name": "Pythonapp with Dapr",
         "program": "${workspaceFolder}/python/app.py",
         "console": "integratedTerminal",
         "preLaunchTask": "daprd-debug-python",
         "postDebugTask": "daprd-down-python"
       }
    ]
}
```

如果你使用的端口不是代码中内置的默认端口，请在 `launch.json` 调试配置中设置 `DAPR_HTTP_PORT` 和 `DAPR_GRPC_PORT` 环境变量。与 daprd `tasks.json` 中的 `httpPort` 和 `grpcPort` 匹配。例如，`launch.json`：

```json
{
  // 设置非默认的 HTTP 和 gRPC 端口
  "env": {
      "DAPR_HTTP_PORT": "3502",
      "DAPR_GRPC_PORT": "50002"
  },
}
```

`tasks.json`：

```json
{
  // 与 launch.json 中设置的端口匹配
  "httpPort": 3502,
  "grpcPort": 50002
}
```

每个配置都需要 `request`、`type` 和 `name`。这些参数帮助 VSCode 识别 `.vscode/tasks.json` 文件中的任务配置。

- `type` 定义使用的语言。根据语言的不同，它可能需要在 marketplace 中找到的扩展，例如 [Python 扩展](https://marketplace.visualstudio.com/items?itemName=ms-python.python)。
- `name` 是配置的唯一名称。当在项目中调用多个配置时，这用于复合配置。
- `${workspaceFolder}` 是 VS Code 变量引用。这是在 VS Code 中打开的工作区路径。
- `preLaunchTask` 和 `postDebugTask` 参数指的是在启动应用程序之前和之后运行的程序配置。有关如何配置这些参数，请参阅步骤 2。

有关 VSCode 调试参数的更多信息，请参阅 [VS Code 启动属性](https://code.visualstudio.com/Docs/editor/debugging#_launchjson-attributes)。

## 步骤 2：配置 tasks.json

对于 `.vscode/launch.json` 中定义的每个[任务](https://code.visualstudio.com/docs/editor/tasks)，在 `.vscode/tasks.json` 中必须存在相应的任务定义。

对于快速入门，每个服务都需要一个任务来使用 `daprd` 类型启动 Dapr 边车，以及一个使用 `daprd-down` 停止边车的任务。参数 `appId`、`httpPort`、`metricsPort`、`label` 和 `type` 是必需的。其他可选参数可用，请参阅[此处的参考表](#daprd-parameter-table")。

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "daprd-debug-node",
            "type": "daprd",
            "appId": "nodeapp",
            "appPort": 3000,
            "httpPort": 3500,
            "metricsPort": 9090
        },
        {
            "label": "daprd-down-node",
            "type": "daprd-down",
            "appId": "nodeapp"
        },
        {
            "label": "daprd-debug-python",
            "type": "daprd",
            "appId": "pythonapp",
            "httpPort": 53109,
            "grpcPort": 53317,
            "metricsPort": 9091
        },
        {
            "label": "daprd-down-python",
            "type": "daprd-down",
            "appId": "pythonapp"
        }
   ]
}
```

## 步骤 3：在 launch.json 中配置复合启动

复合启动配置可以在 `.vscode/launch.json` 中定义，它是一组并行启动的两个或多个启动配置。可选地，可以指定 `preLaunchTask` 并在单独的调试会话开始之前运行。

对于此示例，复合配置是：

```json
{
   "version": "2.0.0",
   "configurations": [...],
   "compounds": [
      {
        "name": "Node/Python Dapr",
        "configurations": ["Nodeapp with Dapr","Pythonapp with Dapr"]
      }
    ]
}
```

## 步骤 4：启动调试会话

现在，你可以在 VS Code 调试器中找到在上一步中定义的复合命令名称，以调试模式运行应用程序：

<img src="/images/vscode-launch-configuration.png" width=400 >

你现在正在使用 Dapr 调试多个应用程序！

## Daprd 参数表

以下是 VS Code 任务支持的参数。这些参数等同于 `daprd` 参数，详见[此参考]({{% ref arguments-annotations-overview.md %}})：

| 参数    | 描述   | 必需    | 示例 |
|--------------|---------------|-------------|---------|
| `allowedOrigins`  | 允许的 HTTP 源（默认为 "*"）  | 否  | `"allowedOrigins": "*"`
| `appId`| 应用程序的唯一 ID。用于服务发现、状态封装和发布订阅消费者 ID	| 是 | `"appId": "divideapp"`
| `appMaxConcurrency` | 限制应用程序的并发性。有效值是任何大于 0 的数字 | 否 | `"appMaxConcurrency": -1`
| `appPort` | 此参数告诉 Dapr 你的应用程序正在监听哪个端口	 | 是 |  `"appPort": 4000`
| `appProtocol` | 告诉 Dapr 你的应用程序使用哪个协议。有效选项是 `http`、`grpc`、`https`、`grpcs`、`h2c`。默认是 `http`。 | 否 | `"appProtocol": "http"`
| `args` | 设置传递给 Dapr 应用程序的参数列表	 | 否 | "args": []
| `componentsPath` | 组件目录的路径。如果为空，则不会加载组件。 | 否 | `"componentsPath": "./components"`
| `config` | 告诉 Dapr 使用哪个配置资源 | 否 | `"config": "./config"`
| `controlPlaneAddress` | Dapr 控制平面的地址 | 否 | `"controlPlaneAddress": "http://localhost:1366/"`
| `enableProfiling` | 启用性能分析	 | 否 | `"enableProfiling": false`
| `enableMtls` | 为 daprd 到 daprd 通信通道启用自动 mTLS | 否 | `"enableMtls": false`
| `grpcPort` | Dapr API 要监听的 gRPC 端口（默认为 "50001"） | 如果有多个应用则为是 | `"grpcPort": 50004`
| `httpPort` | Dapr API 的 HTTP 端口 | 是 | `"httpPort": 3502`
| `internalGrpcPort` | Dapr 内部 API 要监听的 gRPC 端口	 | 否 | `"internalGrpcPort": 50001`
| `logAsJson` | 将此参数设置为 true 会以 JSON 格式输出日志。默认为 false | 否 | `"logAsJson": false`
| `logLevel` | 设置 Dapr 边车的日志级别。允许的值是 debug、info、warn、error。默认是 info | 否 | `"logLevel": "debug"`
| `metricsPort` | 设置边车指标服务器的端口。默认为 9090 | 如果有多个应用则为是 | `"metricsPort": 9093`
| `mode` | Dapr 的运行模式（默认为 "standalone"） | 否 | `"mode": "standalone"`
| `placementHostAddress` | Dapr Actor Placement 服务器的地址 | 否 | `"placementHostAddress": "http://localhost:1313/"`
| `profilePort` | 分析服务器的端口（默认为 "7777"）	 | 否 |  `"profilePort": 7777`
| `sentryAddress` | Sentry CA 服务的地址 | 否 | `"sentryAddress": "http://localhost:1345/"`
| `type` | 告诉 VS Code 这将是一个 daprd 任务类型 | 是 | `"type": "daprd"`


## 相关链接

- [Visual Studio Code 扩展概述]({{% ref vscode-dapr-extension.md %}})
- [Visual Studio Code 调试](https://code.visualstudio.com/docs/editor/debugging)
