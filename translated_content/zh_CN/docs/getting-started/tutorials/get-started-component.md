---
type: docs
title: "定义 component"
linkTitle: "定义 component"
weight: 70
description: "创建 component 定义文件，以便与 secrets building block 交互"
---

在构建应用时，你很可能会根据想要使用的 building block 和特定 component，创建自己的 component 定义文件。

在本教程中，你将创建一个 component 定义文件，以便与 [secrets building block API]({{% ref secrets %}}) 交互：

- 创建一个本地 JSON secret store。
- 使用 component 定义文件向 Dapr 注册 secret store。
- 使用 Dapr HTTP API 获取 secret。

## 步骤 1：创建 JSON secret store

1. 创建一个名为 `my-components` 的新目录，用于存放新的 secret 和 component 文件：

   ```bash
   mkdir my-components
   ```

1. 进入此目录。

   ```bash
   cd my-components
   ```

1. Dapr 支持[多种类型的 secret store]({{% ref supported-secret-stores %}})，但在本教程中，你将创建一个名为 `mysecrets.json` 的本地 JSON 文件，其中包含以下 secret：

```json
{
   "my-secret" : "I'm Batman"
}
```

## 步骤 2：创建 secret store Dapr component

1. 创建一个名为 `localSecretStore.yaml` 的新文件，内容如下：

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
- `type: secretstores.local.file` 表示 Dapr 将使用本地文件 component 作为 secret store。
- metadata 字段提供了使用此 component 所需的特定信息。在本例中，secret store JSON 文件的路径是相对于你调用 `dapr run` 的位置而言的。

{{% alert title="提示" color="primary" %}}
你可以使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 中的 component builder，而无需手动编写 component YAML。该向导会引导你选择 component 类型和 metadata 字段，并为你生成 YAML 文件。sidecar 运行后，仪表板还会显示 Dapr 加载的 component，以便你验证 `my-secret-store` 是否可用。
{{% /alert %}}

## 步骤 3：运行 Dapr sidecar

启动一个 Dapr sidecar，为名为 `myapp` 的空白应用程序在端口 3500 上监听：


PowerShell 环境：
```bash
dapr run --app-id myapp --dapr-http-port 3500 --resources-path ../
```
非 PowerShell 环境：
```bash
dapr run --app-id myapp --dapr-http-port 3500 --resources-path .
```

{{% alert title="提示" color="primary" %}}
如果出现错误消息，提示 `app-id` 已被使用，你可能需要停止当前正在运行的 Dapr sidecar。在运行下一个 `dapr run` 命令之前，请通过以下任一方式停止 sidecar：

- 按 Ctrl+C 或 Command+C。
- 在终端中运行 `dapr stop` 命令。

{{% /alert %}}

## 步骤 4：获取 secret

在另一个终端中运行：

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

{{< button text="下一步：设置 pub/sub broker >>" page="pubsub-quickstart.md" >}}
