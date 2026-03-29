---
type: docs
title: "使用 Dapr API"
linkTitle: "使用 Dapr API"
weight: 30
description: "运行 Dapr 边车并试用状态管理 API"
---

在本指南中，你将通过运行边车并直接调用状态管理 API 来模拟一个应用程序。
在使用 Dapr CLI 运行 Dapr 后，你将：

- 保存一个状态对象。
- 读取/获取状态对象。
- 删除状态对象。

[在我们的概念文档中了解有关状态构建块及其工作原理的更多信息]({{% ref state-management %}})。

### 前置条件

- [安装 Dapr CLI]({{% ref install-dapr-cli.md %}})。
- [运行 `dapr init`]({{% ref install-dapr-selfhost.md%}})。

### 步骤 1：运行 Dapr 边车

[`dapr run`]({{% ref dapr-run.md %}}) 命令通常运行你的应用程序和 Dapr 边车。在这种情况下，
它仅运行边车，因为你直接与状态管理 API 交互。

启动一个 Dapr 边车，它将为名为 `myapp` 的空应用程序监听端口 3500：

```bash
dapr run --app-id myapp --dapr-http-port 3500
```

由于上述命令未定义自定义组件文件夹，Dapr 使用在 [`dapr init` 流程]({{% ref "install-dapr-selfhost.md#step-5-verify-components-directory-has-been-initialized" %}}) 期间创建的默认组件定义。

### 步骤 2：保存状态

使用一个对象更新状态。新状态将如下所示：

```json
[
  {
    "key": "name",
    "value": "Bruce Wayne"
  }
]
```

请注意，状态中包含的每个对象都分配了一个值为 `name` 的 `key`。你将在下一步中使用该键。

使用以下命令保存一个新的状态对象：

{{< tabpane text=true >}}
{{% tab "HTTP API (Bash)" %}}

```bash
curl -X POST -H "Content-Type: application/json" -d '[{ "key": "name", "value": "Bruce Wayne"}]' http://localhost:3500/v1.0/state/statestore
```

{{% /tab %}}

{{% tab "HTTP API (PowerShell)" %}}

```powershell
Invoke-RestMethod -Method Post -ContentType 'application/json' -Body '[{ "key": "name", "value": "Bruce Wayne"}]' -Uri 'http://localhost:3500/v1.0/state/statestore'
```

{{% /tab %}}

{{< /tabpane >}}

### 步骤 3：获取状态

使用键 `name` 通过状态管理 API 检索你刚刚存储在状态中的对象。在同一终端窗口中，运行以下命令：

{{< tabpane text=true >}}

{{% tab "HTTP API (Bash)" %}}

```bash
curl http://localhost:3500/v1.0/state/statestore/name 
```

{{% /tab %}}

{{% tab "HTTP API (PowerShell)" %}}

```powershell
Invoke-RestMethod -Uri 'http://localhost:3500/v1.0/state/statestore/name'
```

{{% /tab %}}

{{< /tabpane >}}

### 步骤 4：查看状态如何存储在 Redis 中

查看 Redis 容器并验证 Dapr 是否将其用作状态存储。使用以下命令通过 Redis CLI 进行操作：

```bash
docker exec -it dapr_redis redis-cli
```

列出 Redis 键以查看 Dapr 如何使用你提供给 `dapr run` 的 app-id 作为键的前缀来创建键值对：

```bash
keys *
```

**输出：**  
`1) "myapp||name"`

通过运行以下命令查看状态值：

```bash
hgetall "myapp||name"
```

**输出：**  
`1) "data"`  
`2) "\"Bruce Wayne\""`  
`3) "version"`  
`4) "1"`  

使用以下命令退出 Redis CLI：

```bash
exit
```

### 步骤 5：删除状态

在同一终端窗口中，从状态存储中删除 `name` 状态对象。

{{< tabpane text=true >}}

{{% tab "HTTP API (Bash)" %}}

```bash
curl -v -X DELETE -H "Content-Type: application/json" http://localhost:3500/v1.0/state/statestore/name
```

{{% /tab %}}

{{% tab "HTTP API (PowerShell)" %}}

```powershell
Invoke-RestMethod -Method Delete -ContentType 'application/json' -Uri 'http://localhost:3500/v1.0/state/statestore/name'
```

{{% /tab %}}

{{< /tabpane >}}

{{< button text="下一步：Dapr 快速入门 >>" page="getting-started/quickstarts.md" >}}
