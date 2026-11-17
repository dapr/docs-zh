---
type: docs
title: "Dapr MCP 服务器工具参考"
linkTitle: "工具参考"
weight: 40
description: "Dapr MCP 服务器公开的每个工具、其输入参数、安全属性，以及启用该工具的 component 类型"
aliases:
  - /zh-hans/developing-ai/mcp/mcp-server-tool-reference/
---

Dapr MCP 服务器公开了 17 个工具。其中三个始终注册。其余工具仅在 sidecar 中至少存在一个对应类型的 component 时才会注册，因此代理永远不会看到它无法使用的工具。

服务器在客户端连接时发送的架构（schema）是每个工具的权威定义。本页是对它的易读摘要。

## 先调用 `get_components`

特定 component 的工具以 component 名称作为输入，例如 `storeName` 或 `pubsubName`。代理应先调用 `get_components` 了解现有的名称，而不是凭猜测。服务器发给模型的说明也是这样要求的，并告诉模型把 `metadata` 字段作为 JSON 对象（`{}`）传递，而不要作为字符串（`"{}"`）传递。

## 安全属性

每个工具都带有 MCP 注解 `readOnlyHint`、`destructiveHint` 和 `idempotentHint`，MCP 客户端可据此决定在调用前是否询问用户。下表以如下方式展示这些注解：

- **只读**：读取数据，不做任何更改。
- **幂等**：使用相同输入再次调用不会产生额外影响，因此可以安全地重试。
- **破坏性**：可能删除或覆盖数据，或触发无法撤销的操作。请考虑在首次调用前征得用户确认。
- **副作用**：会更改状态，或在某处触发一个操作。

除 `get_components` 外，每个工具还设置了 `openWorldHint`，因为它会访问服务器之外的系统。

## 工具概览

| 工具 | sidecar 中存在以下 component 时注册 | 安全属性 |
|---|---|---|
| [`get_components`](#get_components) | 始终 | 只读、幂等 |
| [`invoke_service`](#invoke_service) | 始终 | 破坏性、有副作用、非幂等 |
| [`invoke_actor_method`](#invoke_actor_method) | 始终 | 破坏性、有副作用、非幂等 |
| [`save_state`](#save_state) | `state.*` component | 有副作用、幂等 |
| [`get_state`](#get_state) | `state.*` component | 只读、幂等 |
| [`delete_state`](#delete_state) | `state.*` component | 破坏性、幂等 |
| [`execute_transaction`](#execute_transaction) | `state.*` component | 破坏性、有副作用、非幂等 |
| [`publish_event`](#publish_event) | `pubsub.*` component | 有副作用、非幂等 |
| [`publish_event_with_metadata`](#publish_event_with_metadata) | `pubsub.*` component | 有副作用、非幂等 |
| [`invoke_output_binding`](#invoke_output_binding) | `bindings.*` component | 破坏性、有副作用、非幂等 |
| [`get_secret`](#get_secret) | `secretstores.*` component | 只读、幂等 |
| [`get_bulk_secrets`](#get_bulk_secrets) | `secretstores.*` component | 只读、幂等 |
| [`converse_with_llm`](#converse_with_llm) | `conversation.*` component | 只读、幂等 |
| [`encrypt_data`](#encrypt_data) | `crypto.*` component | 破坏性、有副作用、非幂等 |
| [`decrypt_data`](#decrypt_data) | `crypto.*` component | 只读、幂等 |
| [`acquire_lock`](#acquire_lock) | `lock.*` component | 有副作用、幂等 |
| [`release_lock`](#release_lock) | `lock.*` component | 有副作用、非幂等 |

工具跟随 sidecar 中已加载的 component。当[component 热重载]({{% ref "component-updates.md#hot-reloading" %}})添加某类型的第一个 component 时，服务器会在客户端下次列出工具或调用 `get_components` 时注册该类型的工具，并通知已连接的客户端工具列表已变更。当该类型的最后一个 component 被移除时，其工具也会一并移除。只读取一次工具列表的客户端需要重新连接才能看到这一变化。

工具因输入缺失或 sidecar 返回错误而失败时，会返回一个标记为错误的结果，其中包含模型可以读懂的消息，而不会使 MCP 请求失败。

## metadata

### get_components

列出 sidecar 中已加载的 component，并给出每个 component 的 `name`、`type`、`version` 和 `capabilities`。只列出服务器有对应工具的 component 类型。每次调用时，该列表都会从 sidecar 实时读取。

输入：无。

## service invocation

### invoke_service

通过[service invocation]({{% ref service-invocation-overview.md %}})调用另一个 Dapr 应用上的方法，并返回响应体。

| 输入 | 必填 | 说明 |
|---|---|---|
| `appID` | 是 | 目标应用的 App ID。 |
| `method` | 是 | 要调用的方法或路径，例如 `orders/status`。 |
| `data` | 否 | 请求体，通常为 JSON。 |
| `httpVerb` | 否 | `GET`、`HEAD`、`POST`、`PUT`、`PATCH`、`DELETE` 或 `OPTIONS`。默认为 `POST`。 |
| `contentType` | 否 | `data` 的内容类型。若 `data` 是有效的 JSON，默认为 `application/json`，否则为 `text/plain`。 |
| `metadata` | 否 | 发送给目标应用的请求头。以 `dapr-`、`grpc-` 或 `:` 开头的键会被拒绝。 |

## Actor

### invoke_actor_method

调用[virtual Actor]({{% ref actors-overview.md %}})上的方法，并返回其响应。

| 输入 | 必填 | 说明 |
|---|---|---|
| `actorType` | 是 | 已注册的 Actor 类型。 |
| `actorID` | 是 | Actor 实例的 ID。 |
| `method` | 是 | 要调用的 Actor 方法。 |
| `data` | 否 | 传递给该方法的负载。 |

## State Management

### save_state

将一个键值对保存到[state store]({{% ref state-management-overview.md %}})。

| 输入 | 必填 | 说明 |
|---|---|---|
| `storeName` | 是 | state store component 名称。 |
| `key` | 是 | 保存所用的键。 |
| `value` | 是 | 要保存的值，为字符串。JSON 会按原样存储。 |

### get_state

读取一个键的值。当键不存在时，报告 `found: false`。

| 输入 | 必填 | 说明 |
|---|---|---|
| `storeName` | 是 | state store component 名称。 |
| `key` | 是 | 要读取的键。 |

### delete_state

删除一个键。

| 输入 | 必填 | 说明 |
|---|---|---|
| `storeName` | 是 | state store component 名称。 |
| `key` | 是 | 要删除的键。 |

### execute_transaction

将多个保存与删除操作作为一个原子事务运行。state store 必须支持事务。

| 输入 | 必填 | 说明 |
|---|---|---|
| `storeName` | 是 | state store component 名称。 |
| `items` | 是 | 非空的操作列表。每项包含 `key`（必填）、要保存的 `value`，以及用于改为删除该键的 `isDelete: true`。 |

## 发布和订阅

### publish_event

向[pub/sub]({{% ref pubsub-overview.md %}}) component 上的主题发布一条消息。

| 输入 | 必填 | 说明 |
|---|---|---|
| `pubsubName` | 是 | pub/sub component 名称。 |
| `topic` | 是 | 要发布到的主题。 |
| `message` | 是 | 消息负载，通常为 JSON。 |
| `contentType` | 否 | `message` 的内容类型。若 `message` 是有效的 JSON，默认为 `application/json`，否则为 `text/plain`。 |

### publish_event_with_metadata

与 `publish_event` 相同，但可附带发布 metadata，例如 `ttlInSeconds`。

| 输入 | 必填 | 说明 |
|---|---|---|
| `pubsubName` | 是 | pub/sub component 名称。 |
| `topic` | 是 | 要发布到的主题。 |
| `message` | 是 | 消息负载，通常为 JSON。 |
| `contentType` | 否 | `message` 的内容类型。 |
| `metadata` | 否 | 发布 metadata，例如 `{"ttlInSeconds": "60"}`。 |

## Bindings

### invoke_output_binding

对[output binding]({{% ref bindings-overview.md %}})执行一个操作，例如 HTTP 端点、队列或对象存储，并返回响应。

| 输入 | 必填 | 说明 |
|---|---|---|
| `bindingName` | 是 | binding component 名称。 |
| `operation` | 是 | binding 支持的操作，例如 `create`、`get` 或 `delete`。 |
| `data` | 否 | 负载，通常为 JSON。 |
| `metadata` | 否 | binding 为此操作所需的 metadata，例如对象存储 binding 所需的 `key`。 |

## secrets

secret 值会在工具结果中返回给模型。只公开代理应当读取的 secret store，并通过[secret 作用域]({{% ref secrets-scopes.md %}})进一步收窄范围。

### get_secret

从[secret store]({{% ref secrets-overview.md %}})中读取一个 secret。

| 输入 | 必填 | 说明 |
|---|---|---|
| `storeName` | 是 | secret store component 名称。 |
| `secretName` | 是 | secret 的名称。 |
| `metadata` | 否 | store 特定的选项，例如 `version_id`。 |

### get_bulk_secrets

读取应用在某个 secret store 中可访问的全部 secrets。工具描述会告诉模型，仅当用户明确要求获取所有 secrets 时才使用此工具。

| 输入 | 必填 | 说明 |
|---|---|---|
| `storeName` | 是 | secret store component 名称。 |
| `metadata` | 否 | store 特定的选项。 |

## 对话

### converse_with_llm

通过[对话]({{% ref conversation-overview.md %}}) component 向另一个大型语言模型 (LLM) 发送提示词，并返回回复，以及用于继续该对话的 `context_id`。

| 输入 | 必填 | 说明 |
|---|---|---|
| `name` | 是 | conversation component 名称。 |
| `prompt` | 是 | 要发送的提示词。 |
| `contextId` | 否 | 来自先前调用的 `context_id`，用于继续该对话。省略时会生成新的。 |
| `temperature` | 否 | 采样温度，取值从 `0.0` 到 `1.0`。默认为 `0.7`。 |

## 加密

### encrypt_data

使用由[加密]({{% ref cryptography-overview.md %}}) component 持有的密钥对文本进行加密，并返回经 base64 编码的密文。

| 输入 | 必填 | 说明 |
|---|---|---|
| `componentName` | 是 | 加密 component 名称。 |
| `plainText` | 是 | 要加密的文本。 |
| `keyName` | 否 | 密钥名称，或 `name/version`。默认为 `rsa-private-key.pem`。 |
| `keyWrapAlgorithm` | 否 | 密钥包装算法，例如 `RSA`、`RSA-OAEP-256` 或 `A256KW`。默认为 `RSA`。 |

### decrypt_data

解密由 `encrypt_data` 生成的密文，并返回明文。

| 输入 | 必填 | 说明 |
|---|---|---|
| `componentName` | 是 | 加密 component 名称。 |
| `cipherText` | 是 | base64 编码的密文。 |
| `keyName` | 否 | 密钥名称，或 `name/version`。省略时，使用密文头部中指定的密钥。 |

## 分布式锁

始终将 `acquire_lock` 与 `release_lock` 配对使用，并设置过期时间，以免代理停止运行后锁被永久持有。

### acquire_lock

尝试在某个资源上获取[分布式锁]({{% ref distributed-lock-api-overview.md %}})。如果该锁已被其他所有者持有，调用会成功返回，并附带 `lock_acquired: false`。

| 输入 | 必填 | 说明 |
|---|---|---|
| `storeName` | 是 | lock store component 名称。 |
| `resourceID` | 是 | 要加锁的资源名称。 |
| `lockOwner` | 是 | 调用方的唯一 ID，释放锁时会再次使用。 |
| `expiryInSeconds` | 是 | 锁的有效期（秒），必须大于零。锁会在此时间后自动过期。 |

### release_lock

释放一个锁。如果锁不存在或属于其他所有者，则会失败。

| 输入 | 必填 | 说明 |
|---|---|---|
| `storeName` | 是 | lock store component 名称。 |
| `resourceID` | 是 | 已加锁的资源名称。 |
| `lockOwner` | 是 | 获取锁时使用的所有者 ID。 |
