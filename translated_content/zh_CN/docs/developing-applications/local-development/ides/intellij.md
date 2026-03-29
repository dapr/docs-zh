---
type: docs
title: "IntelliJ"
linkTitle: "IntelliJ"
weight: 2000
description: "配置 IntelliJ 社区版以使用 Dapr 进行调试"
---

在开发 Dapr 应用程序时，通常使用 Dapr CLI 启动您的"Dapr 化"服务，类似这样：

```bash
dapr run --app-id nodeapp --app-port 3000 --dapr-http-port 3500 app.js
```

这会使用默认的组件 yaml 文件（在 `dapr init` 时创建），以便您的服务可以与本地 Redis 容器交互。这对刚入门来说很好，但如果您想将调试器附加到您的服务并单步调试代码呢？这是您可以不调用应用程序而使用 dapr cli 的地方。

将调试器附加到服务的一种方法是首先从命令行运行 `dapr run --`，然后启动代码并附加调试器。虽然这是一个完全可以接受的解决方案，但它确实需要一些额外的步骤（比如在终端和 IDE 之间切换），以及一些可能想要克隆您的仓库并点击"播放"按钮开始调试的开发者说明。

本文档解释如何直接从 IntelliJ 使用 `dapr`。作为先决条件，请确保您已通过 `dapr init` 初始化了 Dapr 的开发环境。

让我们开始吧！

## 将 Dapr 添加为"外部工具"

首先，在直接修改配置文件之前退出 IntelliJ。

### IntelliJ 配置文件位置
对于 [2020.1](https://www.jetbrains.com/help/idea/2020.1/tuning-the-ide.html#config-directory) 及更高版本，工具的配置文件应位于：

{{< tabpane text=true >}}

{{% tab "Windows" %}}

```powershell
%USERPROFILE%\AppData\Roaming\JetBrains\IntelliJIdea2020.1\tools\
```
{{% /tab %}}


{{% tab "Linux" %}}
 ```shell
 $HOME/.config/JetBrains/IntelliJIdea2020.1/tools/
 ```
{{% /tab %}}


{{% tab "MacOS" %}}
```shell
~/Library/Application\ Support/JetBrains/IntelliJIdea2020.1/tools/
```
{{% /tab %}}


{{< /tabpane >}}

> 对于 2019.3 或更早版本，配置文件位置不同。有关更多详细信息，请参阅[此处](https://www.jetbrains.com/help/idea/2019.3/tuning-the-ide.html#config-directory)。

如果需要，请更改路径中 IntelliJ 的版本。

在 `<CONFIG PATH>/tools/External\ Tools.xml` 中创建或编辑文件（如果需要，更改路径中的 IntelliJ 版本）。`<CONFIG PATH>` 取决于操作系统，如上所示。

添加新的 `<tool></tool>` 条目：

```xml
<toolSet name="External Tools">
  ...
  <!-- 1. 每个工具都有自己的 app-id，因此为每个要调试的应用程序创建一个 -->
  <tool name="dapr for DemoService in examples" description="Dapr sidecar" showInMainMenu="false" showInEditor="false" showInProject="false" showInSearchPopup="false" disabled="false" useConsole="true" showConsoleOnStdOut="true" showConsoleOnStdErr="true" synchronizeAfterRun="true">
    <exec>
      <!-- 2. 对于 Linux 或 MacOS 使用：/usr/local/bin/dapr -->
      <option name="COMMAND" value="C:\dapr\dapr.exe" />
      <!-- 3. 选择不与其他 daprd 命令条目冲突的应用程序、http 和 grpc 端口（placement 地址不应更改）。 -->
      <option name="PARAMETERS" value="run -app-id demoservice -app-port 3000 -dapr-http-port 3005 -dapr-grpc-port 52000" />
      <!-- 4. 使用 `components` 文件夹所在的文件夹 -->
      <option name="WORKING_DIRECTORY" value="C:/Code/dapr/java-sdk/examples" />
    </exec>
  </tool>
  ...
</toolSet>
```

（可选）您还可以为可以在许多项目中重用的边车工具创建新条目：

```xml
<toolSet name="External Tools">
  ...
  <!-- 1. 具有应用端口的应用程序的可重用条目。 -->
  <tool name="dapr with app-port" description="Dapr sidecar" showInMainMenu="false" showInEditor="false" showInProject="false" showInSearchPopup="false" disabled="false" useConsole="true" showConsoleOnStdOut="true" showConsoleOnStdErr="true" synchronizeAfterRun="true">
    <exec>
      <!-- 2. 对于 Linux 或 MacOS 使用：/usr/local/bin/dapr -->
      <option name="COMMAND" value="c:\dapr\dapr.exe" />
      <!-- 3. 提示用户 4 次（按顺序）：app id、app port、Dapr 的 http port、Dapr 的 grpc port。 -->
      <option name="PARAMETERS" value="run --app-id $Prompt$ --app-port $Prompt$ --dapr-http-port $Prompt$ --dapr-grpc-port $Prompt$" />
      <!-- 4. 使用 `components` 文件夹所在的文件夹 -->
      <option name="WORKING_DIRECTORY" value="$ProjectFileDir$" />
    </exec>
  </tool>
  <!-- 1. 没有 app-port 的应用程序的可重用条目。 -->
  <tool name="dapr without app-port" description="Dapr sidecar" showInMainMenu="false" showInEditor="false" showInProject="false" showInSearchPopup="false" disabled="false" useConsole="true" showConsoleOnStdOut="true" showConsoleOnStdErr="true" synchronizeAfterRun="true">
    <exec>
      <!-- 2. 对于 Linux 或 MacOS 使用：/usr/local/bin/dapr -->
      <option name="COMMAND" value="c:\dapr\dapr.exe" />
      <!-- 3. 提示用户 3 次（按顺序）：app id、Dapr 的 http port、Dapr 的 grpc port。 -->
      <option name="PARAMETERS" value="run --app-id $Prompt$ --dapr-http-port $Prompt$ --dapr-grpc-port $Prompt$" />
      <!-- 4. 使用 `components` 文件夹所在的文件夹 -->
      <option name="WORKING_DIRECTORY" value="$ProjectFileDir$" />
    </exec>
  </tool>
  ...
</toolSet>
```

## 创建或编辑运行配置

现在，为要调试的应用程序创建或编辑运行配置。可以在 `main()` 函数旁边的菜单中找到它。

![Edit run configuration menu](/images/intellij_debug_menu.png)

现在，添加程序参数和环境变量。这些需要与上面"外部工具"中的条目定义的端口匹配。

* 本示例的命令行参数：`-p 3000`
* 本示例的环境变量：`DAPR_HTTP_PORT=3005;DAPR_GRPC_PORT=52000`

![Edit run configuration](/images/intellij_edit_run_configuration.png)

## 开始调试

完成上述一次性配置后，在 IntelliJ 中使用 Dapr 调试 Java 应用程序需要两个步骤：

1. 通过 IntelliJ 中的 `Tools` -> `External Tool` 启动 `dapr`。

![Run dapr as 'External Tool'](/images/intellij_start_dapr.png)

2. 以调试模式启动您的应用程序。

![Start application in debug mode](/images/intellij_debug_app.png)

## 总结

调试完成后，请确保在 IntelliJ 中同时停止 `dapr` 和您的应用程序。

> 注意：由于您使用 **dapr** ***run*** CLI 命令启动了服务，**dapr** ***list*** 命令将在当前使用 Dapr 运行的应用程序列表中显示来自 IntelliJ 的运行。

祝您调试愉快！

## 相关链接

<!-- IGNORE_LINKS -->

- IntelliJ 配置目录位置的[更改](https://intellij-support.jetbrains.com/hc/en-us/articles/206544519-Directories-used-by-the-IDE-to-store-settings-caches-plugins-and-logs)

<!-- END_IGNORE -->
