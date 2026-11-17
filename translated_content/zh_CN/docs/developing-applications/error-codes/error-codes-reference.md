---
type: docs
title: "错误码参考指南"
linkTitle: "参考"
description: "Dapr 中的 gRPC 和 HTTP 错误码及其描述列表"
weight: 20
---

以下表格列出了 Dapr runtime 返回的错误码。
错误码会在 HTTP 请求的响应体中返回，或在 gRPC 状态响应的 `ErrorInfo` 部分中返回（如果存在）。 
目前正在推进一项工作，依据 [Richer Error Model]({{% ref "grpc-error-codes.md#richer-grpc-error-model" %}}) 丰富所有 gRPC 错误响应。没有对应 gRPC 代码的错误码，表示这些错误尚未更新到此模型。

### Actors API

| HTTP Code                          | gRPC Code | Description                                                             |
| ---------------------------------- | --------- | ----------------------------------------------------------------------- |
| `ERR_ACTOR_INSTANCE_MISSING`       |           | 缺少 actor 实例                                                         |
| `ERR_ACTOR_INVOKE_METHOD`          |           | 调用 actor 方法时出错                                                   |
| `ERR_ACTOR_RUNTIME_NOT_FOUND`      |           | 未找到 Actor runtime                                                     |
| `ERR_ACTOR_STATE_GET`              |           | 获取 actor 状态时出错                                                   |
| `ERR_ACTOR_STATE_TRANSACTION_SAVE` |           | 保存 actor 事务时出错                                                   |
| `ERR_ACTOR_REMINDER_CREATE`        |           | 创建 actor reminder 时出错                                                   |
| `ERR_ACTOR_REMINDER_DELETE`        |           | 删除 actor reminder 时出错                                                   |
| `ERR_ACTOR_REMINDER_GET`           |           | 获取 actor reminder 时出错                                                   |
| `ERR_ACTOR_REMINDER_NON_HOSTED`    |           | 在非托管 actor 类型上执行 reminder 操作                                       |
| `ERR_ACTOR_TYPE_RESERVED`          |           | 对 Dapr 保留的 actor 类型（`dapr.internal.*`）调用 Actor API            |
| `ERR_ACTOR_TIMER_CREATE`           |           | 创建 actor timer 时出错                                                 |
| `ERR_ACTOR_TIMER_GET`              |           | 获取 actor timer 时出错                                                 |
| `ERR_ACTOR_TIMER_LIST`             |           | 列出 actor timer 时出错                                                 |
| `ERR_ACTOR_TIMER_NOT_FOUND`        |           | 未找到 actor timer                                                     |
| `ERR_ACTOR_TIMER_NON_HOSTED`       |           | 在非托管 actor 类型上执行 timer 操作                                     |
| `ERR_ACTOR_TIMER_NOT_OWNED`        |           | 在不由此主机持有的 actor 上执行 timer 操作                               |
| `ERR_ACTOR_NO_APP_CHANNEL`         |           | app channel 未初始化                                                        |
| `ERR_ACTOR_STACK_DEPTH`            |           | 超出最大 actor 调用栈深度                                               |
| `ERR_ACTOR_NO_PLACEMENT`           |           | 未配置 Placement 服务                                                   |
| `ERR_ACTOR_RUNTIME_CLOSED`         |           | Actor runtime 已关闭                                                      |
| `ERR_ACTOR_NAMESPACE_REQUIRED`     |           | 在 Kubernetes 模式下运行时，actor 必须配置 namespace                      |
| `ERR_ACTOR_NO_ADDRESS`             |           | 未找到 actor 的地址                                                     |


### workflow API

| HTTP Code                          | gRPC Code | Description                                                                             |
| ---------------------------------- | --------- | --------------------------------------------------------------------------------------- |
| `ERR_GET_WORKFLOW`                 |           | 获取 workflow 时出错                                                                        |
| `ERR_START_WORKFLOW`               |           | 启动 workflow 时出错                                                                        |
| `ERR_PAUSE_WORKFLOW`               |           | 暂停 workflow 时出错                                                                        |
| `ERR_RESUME_WORKFLOW`              |           | 恢复 workflow 时出错                                                                        |
| `ERR_TERMINATE_WORKFLOW`           |           | 终止 workflow 时出错                                                                        |
| `ERR_PURGE_WORKFLOW`               |           | 清除 workflow 时出错                                                                        |
| `ERR_RAISE_EVENT_WORKFLOW`         |           | 在 workflow 中引发事件时出错                                                                |
| `ERR_WORKFLOW_COMPONENT_MISSING`   |           | 缺少 workflow component                                                                          |
| `ERR_WORKFLOW_COMPONENT_NOT_FOUND` |           | 未找到 workflow component                                                                        |
| `ERR_WORKFLOW_EVENT_NAME_MISSING`  |           | 缺少 workflow 事件名称                                                                      |
| `ERR_WORKFLOW_NAME_MISSING`        |           | 未配置 workflow 名称                                                                        |
| `ERR_INSTANCE_ID_INVALID`          |           | workflow instance ID 无效。（仅允许字母数字和下划线字符）                                      |
| `ERR_INSTANCE_ID_NOT_FOUND`        |           | 未找到 workflow instance ID                                                                     |
| `ERR_INSTANCE_ID_PROVIDED_MISSING` |           | 缺少 workflow instance ID                                                                       |
| `ERR_INSTANCE_ID_TOO_LONG`         |           | workflow instance ID 过长                                                                      |


### State Management API

| HTTP Code                               | gRPC Code                               | Description                               |
| --------------------------------------- | --------------------------------------- | ----------------------------------------- |
| `ERR_STATE_TRANSACTION`                 |                                         | state transaction 出错                              |
| `ERR_STATE_SAVE`                        |                                         | 保存状态时出错                            |
| `ERR_STATE_GET`                         |                                         | 获取状态时出错                            |
| `ERR_STATE_DELETE`                      |                                         | 删除状态时出错                            |
| `ERR_STATE_BULK_DELETE`                 |                                         | 批量删除状态时出错                        |
| `ERR_STATE_BULK_GET`                    |                                         | 批量获取状态时出错                        |
| `ERR_NOT_SUPPORTED_STATE_OPERATION`     |                                         | 事务中不支持该操作                        |
| `ERR_STATE_QUERY`                       | `DAPR_STATE_QUERY_FAILED`               | 查询状态时出错                            |
| `ERR_STATE_STORE_NOT_FOUND`             | `DAPR_STATE_NOT_FOUND`                  | 未找到 state store                            |
| `ERR_STATE_STORE_NOT_CONFIGURED`        | `DAPR_STATE_NOT_CONFIGURED`             | state store 未配置                            |
| `ERR_STATE_STORE_NOT_SUPPORTED`         | `DAPR_STATE_TRANSACTIONS_NOT_SUPPORTED` | state store 不支持事务                        |
| `ERR_STATE_STORE_NOT_SUPPORTED`         | `DAPR_STATE_QUERYING_NOT_SUPPORTED`     | state store 不支持查询                        |
| `ERR_STATE_STORE_TOO_MANY_TRANSACTIONS` | `DAPR_STATE_TOO_MANY_TRANSACTIONS`      | 单个事务中的操作数过多                    |
| `ERR_MALFORMED_REQUEST`                 | `DAPR_STATE_ILLEGAL_KEY`                | 键无效                                    |


### Configuration API

| HTTP Code                                | gRPC Code | Description                            |
| ---------------------------------------- | --------- | -------------------------------------- |
| `ERR_CONFIGURATION_GET`                  |           | 获取配置时出错                         |
| `ERR_CONFIGURATION_STORE_NOT_CONFIGURED` |           | 配置存储未配置                         |
| `ERR_CONFIGURATION_STORE_NOT_FOUND`      |           | 未找到配置存储                         |
| `ERR_CONFIGURATION_SUBSCRIBE`            |           | 订阅配置时出错                         |
| `ERR_CONFIGURATION_UNSUBSCRIBE`          |           | 取消订阅配置时出错                     |


### 密码学 API

| HTTP Code                             | gRPC Code | Description                     |
| ------------------------------------- | --------- | ------------------------------- |
| `ERR_CRYPTO`                          |           | 密码学操作出错                  |
| `ERR_CRYPTO_KEY`                      |           | 获取密码学密钥时出错            |
| `ERR_CRYPTO_PROVIDER_NOT_FOUND`       |           | 未找到密码学提供程序            |
| `ERR_CRYPTO_PROVIDERS_NOT_CONFIGURED` |           | 密码学提供程序未配置            |


### secrets API

| HTTP Code                          | gRPC Code | Description                 |
| ---------------------------------- | --------- | --------------------------- |
| `ERR_SECRET_GET`                   |           | 获取 secrets 时出错              |
| `ERR_SECRET_STORE_NOT_FOUND`       |           | 未找到 secret store              |
| `ERR_SECRET_STORES_NOT_CONFIGURED` |           | secret store 未配置              |
| `ERR_PERMISSION_DENIED`            |           | 策略拒绝权限                |


### pub/sub 和消息错误

| HTTP Code                     | gRPC Code                              | Description                            |
| ----------------------------- | -------------------------------------- | -------------------------------------- |
| `ERR_PUBSUB_EMPTY`            | `DAPR_PUBSUB_NAME_EMPTY`               | Pubsub 名称为空                        |
| `ERR_PUBSUB_NOT_FOUND`        | `DAPR_PUBSUB_NOT_FOUND`                | 未找到 Pubsub                          |
| `ERR_PUBSUB_NOT_FOUND`        | `DAPR_PUBSUB_TEST_NOT_FOUND`           | 未找到 Pubsub                          |
| `ERR_PUBSUB_NOT_CONFIGURED`   | `DAPR_PUBSUB_NOT_CONFIGURED`           | Pubsub 未配置                          |
| `ERR_TOPIC_NAME_EMPTY`        | `DAPR_PUBSUB_TOPIC_NAME_EMPTY`         | 主题名称为空                           |
| `ERR_PUBSUB_FORBIDDEN`        | `DAPR_PUBSUB_FORBIDDEN`                | APP ID 被禁止访问主题                  |
| `ERR_PUBSUB_PUBLISH_MESSAGE`  | `DAPR_PUBSUB_PUBLISH_MESSAGE`          | 发布消息时出错                         |
| `ERR_PUBSUB_REQUEST_METADATA` | `DAPR_PUBSUB_METADATA_DESERIALIZATION` | 反序列化 metadata 时出错                   |
| `ERR_PUBSUB_CLOUD_EVENTS_SER` | `DAPR_PUBSUB_CLOUD_EVENT_CREATION`     | 创建 CloudEvent 时出错                 |
| `ERR_PUBSUB_EVENTS_SER`       | `DAPR_PUBSUB_MARSHAL_ENVELOPE`         | 封送 Cloud Event 信封时出错            |
| `ERR_PUBSUB_EVENTS_SER`       | `DAPR_PUBSUB_MARSHAL_EVENTS`           | 将事件封送为字节时出错                 |
| `ERR_PUBSUB_EVENTS_SER`       | `DAPR_PUBSUB_UNMARSHAL_EVENTS`         | 反封送事件时出错                       |
| `ERR_PUBLISH_OUTBOX`          |                                        | 向 outbox 发布消息时出错               |


### conversation API

| HTTP Code                         | gRPC Code | Description                                   |
| --------------------------------- | --------- | --------------------------------------------- |
| `ERR_CONVERSATION_INVALID_PARMS`  |           | conversation component 参数无效                              |
| `ERR_CONVERSATION_INVOKE`         |           | 调用对话时出错                                |
| `ERR_CONVERSATION_MISSING_INPUTS` |           | 缺少对话输入                                  |
| `ERR_CONVERSATION_NOT_FOUND`      |           | 未找到对话                                    |


### Search API

| HTTP Code                         | gRPC Code                          | Description                    |
| --------------------------------- | ---------------------------------- | ------------------------------ |
| `ERR_SEARCH_STORE_NOT_FOUND`      | `DAPR_SEARCH_STORE_NOT_FOUND`      | 未找到搜索存储                 |
| `ERR_SEARCH_STORE_NOT_CONFIGURED` | `DAPR_SEARCH_STORE_NOT_CONFIGURED` | 未配置搜索存储                 |
| `ERR_SEARCH_INVALID_REQUEST`      | `DAPR_SEARCH_INVALID_REQUEST`      | 搜索请求无效                   |


### 向量 API

| HTTP Code                         | gRPC Code                          | Description                    |
| --------------------------------- | ---------------------------------- | ------------------------------ |
| `ERR_VECTOR_STORE_NOT_FOUND`      | `DAPR_VECTOR_STORE_NOT_FOUND`      | 未找到向量存储                 |
| `ERR_VECTOR_STORE_NOT_CONFIGURED` | `DAPR_VECTOR_STORE_NOT_CONFIGURED` | 未配置向量存储                 |
| `ERR_VECTOR_INVALID_REQUEST`      | `DAPR_VECTOR_INVALID_REQUEST`      | 向量请求无效                   |


### service invocation / 直接消息 API

| HTTP Code           | gRPC Code | Description            |
| ------------------- | --------- | ---------------------- |
| `ERR_DIRECT_INVOKE` |           | 调用服务时出错         |


### binding API

| HTTP Code                   | gRPC Code | Description                   |
| --------------------------- | --------- | ----------------------------- |
| `ERR_INVOKE_OUTPUT_BINDING` |           | 调用 output binding 时出错            |


### 分布式锁 API

| HTTP Code                       | gRPC Code | Description               |
| ------------------------------- | --------- | ------------------------- |
| `ERR_LOCK_STORE_NOT_CONFIGURED` |           | lock store 未配置              |
| `ERR_LOCK_STORE_NOT_FOUND`      |           | 未找到 lock store              |
| `ERR_TRY_LOCK`                  |           | 获取锁时出错              |
| `ERR_UNLOCK`                    |           | 释放锁时出错              |


### 健康检查

| HTTP Code                       | gRPC Code | Description                 |
| ------------------------------- | --------- | --------------------------- |
| `ERR_HEALTH_NOT_READY`          |           | Dapr 未就绪                 |
| `ERR_HEALTH_APPID_NOT_MATCH`    |           | Dapr App ID 不匹配          |
| `ERR_OUTBOUND_HEALTH_NOT_READY` |           | Dapr 出站未就绪             |


### 通用

| HTTP Code                    | gRPC Code | Description                |
| ---------------------------- | --------- | -------------------------- |
| `ERR_API_UNIMPLEMENTED`      |           | API 未实现                 |
| `ERR_APP_CHANNEL_NIL`        |           | app channel 为 nil             |
| `ERR_BAD_REQUEST`            |           | 错误请求                   |
| `ERR_BODY_READ`              |           | 读取请求体时出错           |
| `ERR_INTERNAL`               |           | 内部错误                   |
| `ERR_MALFORMED_REQUEST`      |           | 格式错误的请求             |
| `ERR_MALFORMED_REQUEST_DATA` |           | 格式错误的请求数据         |
| `ERR_MALFORMED_RESPONSE`     |           | 格式错误的响应             |


### Scheduler/Jobs API

| HTTP Code                       | gRPC Code                       | Description                            |
| ------------------------------- | ------------------------------- | -------------------------------------- |
| `DAPR_SCHEDULER_SCHEDULE_JOB`   | `DAPR_SCHEDULER_SCHEDULE_JOB`   | 调度 job 时出错                         |
| `DAPR_SCHEDULER_JOB_NAME`       | `DAPR_SCHEDULER_JOB_NAME`       | job 名称只能设置在 URL 中              |
| `DAPR_SCHEDULER_JOB_NAME_EMPTY` | `DAPR_SCHEDULER_JOB_NAME_EMPTY` | job 名称为空                           |
| `DAPR_SCHEDULER_GET_JOB`        | `DAPR_SCHEDULER_GET_JOB`        | 获取 job 时出错                         |
| `DAPR_SCHEDULER_LIST_JOBS`      | `DAPR_SCHEDULER_LIST_JOBS`      | 列出 job 时出错                         |
| `DAPR_SCHEDULER_DELETE_JOB`     | `DAPR_SCHEDULER_DELETE_JOB`     | 删除 job 时出错                         |
| `DAPR_SCHEDULER_EMPTY`          | `DAPR_SCHEDULER_EMPTY`          | 必需参数为空                           |
| `DAPR_SCHEDULER_SCHEDULE_EMPTY` | `DAPR_SCHEDULER_SCHEDULE_EMPTY` | 未提供 job 的调度计划                   |


### 通用

| HTTP Code | gRPC Code | Description   |
| --------- | --------- | ------------- |
| `ERROR`   | `ERROR`   | 通用错误      |

## 后续步骤

- [处理 HTTP 错误码]({{% ref http-error-codes.md %}})
- [处理 gRPC 错误码]({{% ref grpc-error-codes.md %}})
