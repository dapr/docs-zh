---
type: docs
title: "Workflow API 参考"
linkTitle: "Workflow API"
description: "关于 workflow API 的详细文档"
weight: 1600
---

Dapr 为用户提供了通过其内置 workflow 引擎与 workflow 交互的能力，该引擎使用 Dapr Actors 实现。

要了解如何与 workflow 引擎交互，请参阅[如何编写]{{% ref howto-author-workflow.md %}}和[管理 workflow]({{% ref howto-manage-workflow.md %}})。


# HTTP API 参考（已弃用）

以下是 Dapr Workflow API 的参考。
该 API 已弃用，最终将被移除。

## 启动 workflow 请求

使用给定名称启动 workflow instance。两个查询参数均为可选，且彼此独立；参见下表。

```
POST http://localhost:<daprPort>/v1.0/workflows/<workflowComponentName>/<workflowName>/start?instanceID=<instanceID>&appID=<appID>
```

请注意，workflow instance ID 只能包含字母数字字符、下划线和短横线。

{{% alert title="重要" color="warning" %}}
强烈建议为每次执行分配一个新的实例 ID，而不是复用旧的实例 ID。参见[实例 ID 复用的影响]({{% ref "workflow-features-concepts.md#implications-of-instance-id-reuse" %}})。只有当具有该 ID 的现有 workflow，以及它创建的每个 child workflow（逐级递归检查），都已进入终止状态（`COMPLETED`、`FAILED` 或 `TERMINATED`）后，该实例 ID 才能被复用。否则请求会失败，返回 HTTP `500` 与错误代码 `ERR_START_WORKFLOW`，且错误消息会指出尚未终止的 workflow。SDK Workflow Client 则会收到 gRPC `AlreadyExists` 状态码，从而无需解析消息即可识别冲突。若要无条件释放某个实例 ID，请先使用[清除 API]({{% ref "workflow_api.md#清除-workflow-请求" %}})清除该 workflow。更多详情参见[workflow 标识]({{% ref "workflow-features-concepts.md#workflow-identity" %}})。
{{% /alert %}}

### URL 参数

参数 | 描述
--------- | -----------
`workflowComponentName` | 对于 Dapr Workflows 使用 `dapr`
`workflowName` | 标识 workflow 类型
`instanceID` | （可选）为特定 workflow 的每次运行创建的唯一值
`appID` | （可选）应承载该 workflow instance 的应用的 App ID。默认为本地应用。目标应用必须位于同一 namespace 中，其[workflow access policy]({{% ref workflow-access-policy %}})决定是否允许该调用。

### 请求内容

任何请求内容都将作为输入传递给 workflow。Dapr API 会原样传递内容，而不会尝试解释它。

### HTTP 响应代码

代码 | 描述
---- | -----------
`202`  | 已接受
`400`  | 请求格式错误
`500`  | 请求格式正确，dapr 代码中存在错误。这包括当具有给定实例 ID 的 workflow 已存在且尚不可复用（它或其某个 child workflow 未处于终止状态）时的错误代码 `ERR_START_WORKFLOW`

### 响应内容

API 调用将提供类似以下的响应：

```json
{
    "instanceID": "12345678"
}
```

## 终止 workflow 请求

使用给定名称和实例 ID 终止正在运行的 workflow instance。

```
POST http://localhost:<daprPort>/v1.0/workflows/<workflowComponentName>/<instanceId>/terminate
```

{{% alert title="注意" color="primary" %}}
 终止 workflow 会终止由该 workflow instance 创建的所有 child workflow。

终止 workflow 对由被终止实例启动的任何进行中的 activity 执行没有影响。

{{% /alert %}}

### URL 参数

参数 | 描述
--------- | -----------
`workflowComponentName` | 对于 Dapr Workflows 使用 `dapr`
`instanceId` | 为特定 workflow 的每次运行创建的唯一值
`appID` | （可选）承载该 workflow instance 的应用的 App ID。默认为本地应用。目标应用必须位于同一 namespace 中，其[workflow access policy]({{% ref workflow-access-policy %}})决定是否允许该调用。

### HTTP 响应代码

代码 | 描述
---- | -----------
`202`  | 已接受
`400`  | 请求格式错误
`500`  | 请求格式正确，dapr 代码中存在错误

### 响应内容

此 API 不返回任何内容。

## raise event 请求

对于支持订阅 external event 的 workflow component（如 Dapr Workflow 引擎），您可以使用以下"raise event" API 向特定 workflow instance 传递命名事件。

```
POST http://localhost:<daprPort>/v1.0/workflows/<workflowComponentName>/<instanceID>/raiseEvent/<eventName>
```

{{% alert title="注意" color="primary" %}}
 订阅事件的具体机制取决于您使用的 workflow component。Dapr Workflow 有一种订阅 external event 的方式，但其他 workflow component 可能有不同的方式。

{{% /alert %}}

### URL 参数

参数 | 描述
--------- | -----------
`workflowComponentName` | 对于 Dapr Workflows 使用 `dapr`
`instanceId` | 为特定 workflow 的每次运行创建的唯一值
`appID` | （可选）承载该 workflow instance 的应用的 App ID。默认为本地应用。目标应用必须位于同一 namespace 中，其[workflow access policy]({{% ref workflow-access-policy %}})决定是否允许该调用。
`eventName` | 要触发的事件名称

### HTTP 响应代码

代码 | 描述
---- | -----------
`202`  | 已接受
`400`  | 请求格式错误
`500`  | 请求格式正确，dapr 代码或底层 component 中存在错误

### 响应内容

无。

## 暂停 workflow 请求

暂停正在运行的 workflow instance。

```
POST http://localhost:<daprPort>/v1.0/workflows/<workflowComponentName>/<instanceId>/pause
```

### URL 参数

参数 | 描述
--------- | -----------
`workflowComponentName` | 对于 Dapr Workflows 使用 `dapr`
`instanceId` | 为特定 workflow 的每次运行创建的唯一值
`appID` | （可选）承载该 workflow instance 的应用的 App ID。默认为本地应用。目标应用必须位于同一 namespace 中，其[workflow access policy]({{% ref workflow-access-policy %}})决定是否允许该调用。

### HTTP 响应代码

代码 | 描述
---- | -----------
`202`  | 已接受
`400`  | 请求格式错误
`500`  | Dapr 代码或底层 component 中存在错误

### 响应内容

无。

## 恢复 workflow 请求

恢复已暂停的 workflow instance。

```
POST http://localhost:<daprPort>/v1.0/workflows/<workflowComponentName>/<instanceId>/resume
```

### URL 参数

参数 | 描述
--------- | -----------
`workflowComponentName` | 对于 Dapr Workflows 使用 `dapr`
`instanceId` | 为特定 workflow 的每次运行创建的唯一值
`appID` | （可选）承载该 workflow instance 的应用的 App ID。默认为本地应用。目标应用必须位于同一 namespace 中，其[workflow access policy]({{% ref workflow-access-policy %}})决定是否允许该调用。

### HTTP 响应代码

代码 | 描述
---- | -----------
`202`  | 已接受
`400`  | 请求格式错误
`500`  | Dapr 代码中存在错误

### 响应内容

无。

## 清除 workflow 请求

使用 workflow 的实例 ID 从 state store 中清除 workflow 状态。

```
POST http://localhost:<daprPort>/v1.0/workflows/<workflowComponentName>/<instanceId>/purge
```

{{% alert title="注意" color="primary" %}}
只有 `COMPLETED`、`FAILED` 或 `TERMINATED` 状态的 workflow 才能被清除。
{{% /alert %}}

### URL 参数

参数 | 描述
--------- | -----------
`workflowComponentName` | 对于 Dapr Workflows 使用 `dapr`
`instanceId` | 为特定 workflow 的每次运行创建的唯一值
`appID` | （可选）承载该 workflow instance 的应用的 App ID。默认为本地应用。目标应用必须位于同一 namespace 中，其[workflow access policy]({{% ref workflow-access-policy %}})决定是否允许该调用。

### HTTP 响应代码

代码 | 描述
---- | -----------
`202`  | 已接受
`400`  | 请求格式错误
`500`  | Dapr 代码中存在错误

### 响应内容

无。

## 获取 workflow 请求

获取给定 workflow instance 的信息。

```
GET http://localhost:<daprPort>/v1.0/workflows/<workflowComponentName>/<instanceId>
```

### URL 参数

参数 | 描述
--------- | -----------
`workflowComponentName` | 对于 Dapr Workflows 使用 `dapr`
`instanceId` | 为特定 workflow 的每次运行创建的唯一值
`appID` | （可选）承载该 workflow instance 的应用的 App ID。默认为本地应用。目标应用必须位于同一 namespace 中，其[workflow access policy]({{% ref workflow-access-policy %}})决定是否允许该调用。

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
    "property2": "value2",
  },
  "runtimeStatus": "RUNNING",
 }
```

参数 | 描述
--------- | -----------
`runtimeStatus` | workflow instance 的状态。值包括：`"RUNNING"`、`"COMPLETED"`、`"CONTINUED_AS_NEW"`、`"FAILED"`、`"CANCELED"`、`"TERMINATED"`、`"PENDING"`、`"SUSPENDED"`

当 `runtimeStatus` 为 `"FAILED"` 时，`properties` 映射不包含 `dapr.workflow.output`。失败的 workflow 没有成功的输出。取而代之，`properties` 映射通过以下键携带失败信息：

参数 | 描述
--------- | -----------
`dapr.workflow.failure.error_type` | `runtimeStatus` 为 `"FAILED"` 的 workflow 的错误类型。
`dapr.workflow.failure.error_message` | `runtimeStatus` 为 `"FAILED"` 的 workflow 的错误消息。
`dapr.workflow.failure.stack_trace` | `runtimeStatus` 为 `"FAILED"` 的 workflow 的堆栈跟踪（如果可用）。
