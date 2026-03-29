---
type: docs
title: "Workflow API 参考"
linkTitle: "Workflow API"
weight: 1600
---

Dapr 为用户提供了通过其内置工作流引擎与工作流交互的能力，该引擎使用 Dapr Actors 实现。

要了解如何与工作流引擎交互，请参阅[如何编写]({{% ref howto-author-workflow.md %}}和[管理工作流]({{% ref howto-manage-workflow.md %}}。


# HTTP API 参考（已弃用）

以下是 Dapr Workflow API 的参考文档。
该 API 已弃用，最终将被移除。

## 启动工作流请求

使用给定名称启动工作流实例，可选择指定实例 ID。

```
POST http://localhost:<daprPort>/v1.0/workflows/<workflowComponentName>/<workflowName>/start[?instanceID=<instanceID>]
```

请注意，工作流实例 ID 只能包含字母数字字符、下划线和短横线。

### URL 参数

参数 | 描述
--------- | -----------
`workflowComponentName` | 对于 Dapr Workflows 使用 `dapr`
`workflowName` | 标识工作流类型
`instanceID` | （可选）为特定工作流的每次运行创建的唯一值

### 请求内容

任何请求内容都将作为输入传递给工作流。Dapr API 会原样传递内容，而不会尝试解释它。

### HTTP 响应代码

代码 | 描述
---- | -----------
`202`  | 已接受
`400`  | 请求格式错误
`500`  | 请求格式正确，dapr 代码中存在错误

### 响应内容

API 调用将提供类似以下的响应：

```json
{
    "instanceID": "12345678"
}
```

## 终止工作流请求

使用给定名称和实例 ID 终止正在运行的工作流实例。

```
POST http://localhost:<daprPort>/v1.0/workflows/<workflowComponentName>/<instanceId>/terminate
```

{{% alert title="注意" color="primary" %}}
 终止工作流将终止由该工作流实例创建的所有子工作流。

终止工作流对由被终止实例启动的任何进行中的活动执行没有影响。

{{% /alert %}}

### URL 参数

参数 | 描述
--------- | -----------
`workflowComponentName` | 对于 Dapr Workflows 使用 `dapr`
`instanceId` | 为特定工作流的每次运行创建的唯一值

### HTTP 响应代码

代码 | 描述
---- | -----------
`202`  | 已接受
`400`  | 请求格式错误
`500`  | 请求格式正确，dapr 代码中存在错误

### 响应内容

此 API 不返回任何内容。

## 触发事件请求

对于支持订阅外部事件的工作流组件（如 Dapr Workflow 引擎），您可以使用以下"触发事件" API 向特定工作流实例传递命名事件。

```
POST http://localhost:<daprPort>/v1.0/workflows/<workflowComponentName>/<instanceID>/raiseEvent/<eventName>
```

{{% alert title="注意" color="primary" %}}
 订阅事件的具体机制取决于您使用的工作流组件。Dapr Workflow 有一种订阅外部事件的方式，但其他工作流组件可能有不同的方式。

{{% /alert %}}

### URL 参数

参数 | 描述
--------- | -----------
`workflowComponentName` | 对于 Dapr Workflows 使用 `dapr`
`instanceId` | 为特定工作流的每次运行创建的唯一值
`eventName` | 要触发的事件名称

### HTTP 响应代码

代码 | 描述
---- | -----------
`202`  | 已接受
`400`  | 请求格式错误
`500`  | 请求格式正确，dapr 代码或底层组件中存在错误

### 响应内容

无。

## 暂停工作流请求

暂停正在运行的工作流实例。

```
POST http://localhost:<daprPort>/v1.0/workflows/<workflowComponentName>/<instanceId>/pause
```

### URL 参数

参数 | 描述
--------- | -----------
`workflowComponentName` | 对于 Dapr Workflows 使用 `dapr`
`instanceId` | 为特定工作流的每次运行创建的唯一值

### HTTP 响应代码

代码 | 描述
---- | -----------
`202`  | 已接受
`400`  | 请求格式错误
`500`  | Dapr 代码或底层组件中存在错误

### 响应内容

无。

## 恢复工作流请求

恢复已暂停的工作流实例。

```
POST http://localhost:<daprPort>/v1.0/workflows/<workflowComponentName>/<instanceId>/resume
```

### URL 参数

参数 | 描述
--------- | -----------
`workflowComponentName` | 对于 Dapr Workflows 使用 `dapr`
`instanceId` | 为特定工作流的每次运行创建的唯一值

### HTTP 响应代码

代码 | 描述
---- | -----------
`202`  | 已接受
`400`  | 请求格式错误
`500`  | Dapr 代码中存在错误

### 响应内容

无。

## 清除工作流请求

使用工作流的实例 ID 从状态存储中清除工作流状态。

```
POST http://localhost:<daprPort>/v1.0/workflows/<workflowComponentName>/<instanceId>/purge
```

{{% alert title="注意" color="primary" %}}
只有 `COMPLETED`、`FAILED` 或 `TERMINATED` 状态的工作流才能被清除。
{{% /alert %}}

### URL 参数

参数 | 描述
--------- | -----------
`workflowComponentName` | 对于 Dapr Workflows 使用 `dapr`
`instanceId` | 为特定工作流的每次运行创建的唯一值

### HTTP 响应代码

代码 | 描述
---- | -----------
`202`  | 已接受
`400`  | 请求格式错误
`500`  | Dapr 代码中存在错误

### 响应内容

无。

## 获取工作流请求

获取给定工作流实例的信息。

```
GET http://localhost:<daprPort>/v1.0/workflows/<workflowComponentName>/<instanceId>
```

### URL 参数

参数 | 描述
--------- | -----------
`workflowComponentName` | 对于 Dapr Workflows 使用 `dapr`
`instanceId` | 为特定工作流的每次运行创建的唯一值

### HTTP 响应代码

代码 | 描述
---- | -----------
`200`  | OK
`400`  | 请求格式错误
`500`  | Dapr 代码中存在错误

### 响应内容

API 调用将提供类似以下的 JSON 响应：

```json
{
  "createdAt": "2023-01-12T21:31:13Z",
  "instanceID": "12345678",
  "lastUpdatedAt": "2023-01-12T21:31:13Z",
  "properties": {
    "property1": "value1",
    "property2": "value2"
  },
  "runtimeStatus": "RUNNING"
}
```

参数 | 描述
--------- | -----------
`runtimeStatus` | 工作流实例的状态。值包括：`"RUNNING"`、`"COMPLETED"`、`"CONTINUED_AS_NEW"`、`"FAILED"`、`"CANCELED"`、`"TERMINATED"`、`"PENDING"`、`"SUSPENDED"`
