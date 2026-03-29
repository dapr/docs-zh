---
type: docs
title: "Dapr Visual Studio Code 扩展概述"
linkTitle: "Dapr 扩展"
weight: 10000
description:  "如何使用 Dapr 扩展开发和运行 Dapr 应用程序"
---

{{% alert title="弃用通知" color="primary" %}}
该扩展先前由 Microsoft 支持，但现在已被弃用。该扩展将在 Visual Studio Code marketplace 中保持可用，但将不再接收更新或支持。

{{% /alert %}}

用于本地开发的*已弃用* [Dapr Visual Studio Code 扩展](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-dapr) 为用户提供了多种功能，以更好地管理其 Dapr 应用程序，并对所有支持的 Dapr 语言（包括 .NET、Go、PHP、Python 和 Java）的应用程序进行调试。

<a href="vscode:extension/ms-azuretools.vscode-dapr" class="btn btn-primary" role="button">在 VSCode 中打开</a>

## 功能

### 脚手架 Dapr 调试任务

Dapr 扩展帮助你使用 Visual Studio Code 的[内置调试功能](https://code.visualstudio.com/Docs/editor/debugging)通过 Dapr 调试应用程序。

使用 `Dapr: Scaffold Dapr Tasks` [命令面板](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette)操作，你可以更新现有的 `task.json` 和 `launch.json` 文件，以便在开始调试时启动和配置 Dapr 边车。

1. 确保已为你的应用设置了启动配置。（[了解更多](https://code.visualstudio.com/Docs/editor/debugging)）
2. 使用 `Ctrl+Shift+P` 打开命令面板
3. 选择 `Dapr: Scaffold Dapr Tasks`
4. 使用 `F5` 或通过运行视图运行你的应用和 Dapr 边车。

### 脚手架 Dapr 组件

将 Dapr 添加到应用程序时，你可能需要一个专用的组件目录，与作为 `dapr init` 一部分初始化的默认组件分离。

要创建包含默认 `statestore`、`pubsub` 和 `zipkin` 组件的专用组件文件夹，请使用 `Dapr: Scaffold Dapr Components` [命令面板](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette)操作。

1. 在 Visual Studio Code 中打开应用程序目录
2. 使用 `Ctrl+Shift+P` 打开命令面板
3. 选择 `Dapr: Scaffold Dapr Components`
4. 使用 `dapr run --resources-path ./components -- ...` 运行应用程序

### 查看正在运行的 Dapr 应用程序

应用程序视图显示在本地机器上运行的 Dapr 应用程序。

<br /><img src="/images/vscode-extension-view.png" alt="Dapr VSCode 扩展视图运行应用程序选项的屏幕截图" width="800">

### 调用 Dapr 应用程序

在应用程序视图中，用户可以右键单击并通过 GET 或 POST 方法调用 Dapr 应用程序，可选择指定有效负载。

<br /><img src="/images/vscode-extension-invoke.png" alt="Dapr VSCode 扩展调用选项的屏幕截图" width="800">

### 向 Dapr 应用程序发布事件

在应用程序视图中，用户可以右键单击并向正在运行的 Dapr 应用程序发布消息，指定主题和有效负载。

用户还可以向所有正在运行的应用程序发布消息。

  <br /><img src="/images/vscode-extension-publish.png" alt="Dapr VSCode 扩展发布选项的屏幕截图" width="800">
## 其他资源

### 同时调试多个 Dapr 应用程序

使用 VS Code 扩展，你可以通过[多目标调试](https://code.visualstudio.com/docs/editor/debugging#_multitarget-debugging)同时调试多个 Dapr 应用程序。

### 社区通话演示

观看此[视频](https://www.youtube.com/watch?v=OtbYCBt9C34&t=85)了解如何使用 Dapr VS Code 扩展：

{{< youtube id=OtbYCBt9C34 start=85 >}}
