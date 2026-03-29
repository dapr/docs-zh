---
type: docs
title: "定义组件"
linkTitle: "定义组件"
weight: 70
description: "创建组件定义文件以与机密构建块交互"
---

在构建应用时，你很可能需要创建自己的组件文件定义，具体取决于你想要使用的构建块和特定组件。

在本教程中，你将创建一个组件定义文件来与[机密构建块 API]({{% ref secrets %}})交互：

- 创建一个本地 JSON 机密存储。
- 使用组件定义文件向 Dapr 注册机密存储。
- 使用 Dapr HTTP API 获取机密。

## 步骤 1：创建 JSON 机密存储

1. 创建一个名为 `my-components` 的新目录来保存新的机密和组件文件：

   ```bash
   mkdir my-components
   ```

1. 进入该目录。

   ```bash
   cd my-components
   ```

1. Dapr 支持[多种类型的机密存储]({{% ref supported-secret-stores %}})，但在本教程中，创建一个名为 `mysecrets.json` 的本地 JSON 文件，其中包含以下机密：

```json
{
   "my-secret" : "I'm Batman"
}
```

## 步骤 2：创建机密存储 Dapr 组件

1. 创建一个新文件 `localSecretStore.yaml`，内容如下：

   ```yaml
   apiVersion: dapr.io/v1alpha1
   kind: Component
   metadata:
     name: my-secret-store
     namespace: default
   spec:
     type: secretstores.local.file
     version: v1
     metadata:
     - name: secretsFile
       value: ./mysecrets.json
     - name: nestedSeparator
       value: ":"
   ```

在上述文件定义中：
- `type: secretstores.local.file` 告诉 Dapr 使用本地文件组件作为机密存储。
- metadata 字段提供了使用此组件所需的特定组件信息。在这种情况下，机密存储 JSON 路径是相对于你调用 `dapr run` 的位置。

## 步骤 3：运行 Dapr 边车

启动一个 Dapr 边车，它将在端口 3500 上监听一个名为 `myapp` 的空白应用程序：


PowerShell 环境：
```bash
dapr run --app-id myapp --dapr-http-port 3500 --resources-path ../
```
非 PowerShell 环境：
```bash
dapr run --app-id myapp --dapr-http-port 3500 --resources-path .
```

{{% alert title="提示" color="primary" %}}
如果出现错误消息，提示 `app-id` 已被使用，你可能需要停止任何当前正在运行的 Dapr 边车。在运行下一个 `dapr run` 命令之前，请通过以下方式之一停止边车：

- 按 Ctrl+C 或 Command+C。
- 在终端中运行 `dapr stop` 命令。

{{% /alert %}}

## 步骤 4：获取机密

在单独的终端中，运行：

{{< tabpane text=true >}}
{{% tab "HTTP API (Bash)" %}}

```bash
curl http://localhost:3500/v1.0/secrets/my-secret-store/my-secret
```

{{% /tab %}}

{{% tab "HTTP API (PowerShell)" %}}

```powershell
Invoke-RestMethod -Uri 'http://localhost:3500/v1.0/secrets/my-secret-store/my-secret'
```

{{% /tab %}}
{{< /tabpane >}}

**输出：**

```json
{"my-secret":"I'm Batman"}
```

{{< button text="下一步：设置发布订阅代理 >>" page="pubsub-quickstart.md" >}}
