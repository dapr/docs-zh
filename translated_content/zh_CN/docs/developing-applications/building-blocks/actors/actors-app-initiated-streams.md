---
type: docs
title: "Actor 应用发起的 gRPC 事件流（Alpha）"
linkTitle: "应用发起的流（Alpha）"
weight: 55
description: "无需暴露服务器端口，即可通过应用发起的 gRPC 流接收 Actor 回调"
---

{{% alert title="Alpha" color="warning" %}}
`SubscribeActorEventsAlpha1` 处于 Alpha 阶段，其 API 结构在未来版本中可能会发生变化。
{{% /alert %}}

默认情况下，Dapr 通过调用应用上的**入站** HTTP 或 gRPC 端点来投递 Actor 回调——包括方法调用、提醒、定时器和停用。每个承载 Actor 的 Pod 都必须暴露一个 Dapr 边车可以访问的服务器端口。

从 Dapr v1.18 开始，Actor 宿主也可以改为由应用向边车打开一条**单一的双向 gRPC 流**（`SubscribeActorEventsAlpha1`），并通过该连接接收全部四种回调类型。应用是 gRPC _客户端_：它连接 daprd、打开流，然后等待回调。无需入站端口。

这使 Actor 回调投递方式与 Dapr 中 pub/sub 的流式订阅（`SubscribeTopicEventsAlpha1`）、配置监听流和调度器作业流保持一致。

[Go SDK](https://github.com/dapr/go-sdk) 为该 API 提供了一个高级辅助工具（[`client.SubscribeActorEvents`](https://github.com/dapr/go-sdk/tree/main/examples/actor-grpc)）。其他 Dapr SDK 目前只能通过其生成的 gRPC 客户端使用 `SubscribeActorEventsAlpha1`。详见 [SDK 支持](#sdk-支持)。

## 为什么使用应用发起的流？

当 NetworkPolicy 限制了指向应用 Pod 的入站流量、Actor 运行在受限网络环境中，或者你希望用单一的连接管理入口代替每种回调各自的 HTTP/gRPC 路由时，应用发起的方式很有用。

| | 传统回调 | 应用发起的流 |
|---|---|---|
| **连接方向** | 边车 → 应用 | 应用 → 边车 |
| **需要应用服务器端口** | 是 | 否 |
| **NetworkPolicy / 防火墙** | 必须允许边车到应用的入站 | 只需要允许应用到边车的出站 |
| **回调类型** | 每种类型一个独立端点 | 四种类型都走同一条流 |
| **SDK 支持** | 所有 SDK | Go SDK 提供辅助工具；其他 SDK 通过生成的 gRPC 客户端使用 |
| **稳定性** | 稳定 | Alpha (v1.18+) |

## 工作原理

该协议基于双向 gRPC 流上的请求–响应配对：

1. **应用打开流。** 应用调用 Dapr gRPC 服务上的 `SubscribeActorEventsAlpha1`，并发送一条初始注册消息（`SubscribeActorEventsRequestInitialAlpha1`），其中列出它承载的 Actor 类型，以及可选的运行时配置覆盖项（空闲超时、排空设置、重入）。

2. **Dapr 确认注册。** daprd 在流上回复 `SubscribeActorEventsResponseInitialAlpha1`。消息体为空表示成功；错误会以 gRPC 流错误的形式返回。

3. **Dapr 发送回调。** 每当 Actor 方法被调用、提醒或定时器触发、或 Actor 被停用时，daprd 都会沿流发送一条 `SubscribeActorEventsResponseAlpha1` 消息。每条消息都带有唯一的关联 `id`。

4. **应用响应。** 应用处理回调，并发送一条带有匹配 `id` 的 `SubscribeActorEventsRequestAlpha1` 消息。响应类型决定了具体动作：

   | 收到的回调 | 应用回复 |
   |---|---|
   | `invoke_request`（方法调用） | 带响应负载的 `invoke_response` |
   | `reminder_request` | `reminder_response`（可选 `cancel: true` 以停止提醒） |
   | `timer_request` | `timer_response`（可选 `cancel: true` 以停止定时器） |
   | `deactivate_request` | `deactivate_response`（仅确认，无负载） |

5. **错误信号。** 如果应用无法处理某个回调（例如 Actor 方法不存在），它会发送一条 `request_failed` 消息，其中包含原始 `id`、gRPC 状态码以及可选的消息。daprd 会把 `codes.NotFound` 映射为永久性、不可重试的失败。

### 重连与滚动重启

Dapr 支持同一个应用进程同时存在多条并发流。这使得零停机的滚动重启成为可能：

- 当新 Pod 打开流时，daprd 会把所有**新**回调路由到最新的连接。
- **较旧**的连接会继续接收它已发送回调的响应，并自然排空。
- 当旧连接上所有进行中的工作完成后，即可安全关闭该连接。

如果流中断，应用应使用指数退避进行重连。

## NetworkPolicy 与防火墙注意事项

由于连接由应用**发起**，流量方向为：

```
app pod → daprd sidecar (gRPC port, default 50001)
```

在限制性较强的 NetworkPolicy 环境中，这意味着你不再需要允许边车向应用 Pod 发起入站连接的规则。但是，你仍然需要允许应用 Pod 出站到边车的 gRPC 端口。

{{% alert title="运维注意事项" color="primary" %}}
如果你之前通过拒绝来自边车的全部入站流量来锁定承载 Actor 的 Pod，那么对于使用 `SubscribeActorEventsAlpha1` 的 Pod，可以删除该入站规则。如果同一批 Pod 同时还使用传统的 HTTP/gRPC Actor 回调，则应保留该规则（两种模式可以在迁移期间共存）。

Dapr 的 gRPC 端口可通过 `dapr.io/grpc-port` 注解配置（默认：`50001`）。请确保应用 Pod 到 `localhost` / 边车上该端口的出站流量被允许。
{{% /alert %}}

### NetworkPolicy 示例（Kubernetes）

以下策略限制承载 Actor 的 Pod 的入站流量，并允许出站到边车的 gRPC 端口。如果你将 `dapr.io/grpc-port` 设为了非默认值，请相应调整端口。

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: actor-app-initiated-stream
spec:
  podSelector:
    matchLabels:
      app: my-actor-service
  policyTypes:
    - Ingress
    - Egress
  ingress: []  # 应用发起的流不需要任何入站规则
  egress:
    - ports:
        - protocol: TCP
          port: 50001   # daprd gRPC 端口（如通过注解修改，请相应调整）
```

## SDK 支持

[Go SDK](https://github.com/dapr/go-sdk) 提供了一个高级辅助工具 [`client.SubscribeActorEvents`](https://github.com/dapr/go-sdk/tree/main/examples/actor-grpc)，它会为你管理流的生命周期、回调分发和重连。其他 Dapr SDK 目前只能通过其生成的 gRPC 客户端暴露 `SubscribeActorEventsAlpha1`；请按[操作指南]({{% ref "howto-actors-app-initiated-streams" %}})中所示直接调用它。

## 相关链接

- [操作指南：使用 Actor 应用发起的 gRPC 流]({{% ref "howto-actors-app-initiated-streams" %}})
- [Actor API 参考 — SubscribeActorEventsAlpha1]({{% ref "actors_api#subscribeactoreventsalpha1-grpc" %}})
- [Actor 概述]({{% ref "actors-overview" %}})
- [Actor 运行时配置]({{% ref "actors-runtime-config" %}})
- [运行时 PR dapr/dapr#9812](https://github.com/dapr/dapr/pull/9812)
