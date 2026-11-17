---
type: docs
title: "如何：使用 Actor 应用发起的 gRPC 事件流"
linkTitle: "如何：应用发起的流"
weight: 56
description: "打开一条从应用到 daprd 的 gRPC 流，无需暴露服务端口即可接收 Actor 回调"
---

{{% alert title="Alpha" color="warning" %}}
`SubscribeActorEventsAlpha1` 处于 alpha。其 API 形式在未来的版本中可能会发生变化。
{{% /alert %}}

本指南介绍如何使用生成的 gRPC 客户端，以 Go 语言实现 `SubscribeActorEventsAlpha1`。请先阅读[概念文档]({{% ref "actors-app-initiated-streams" %}})，了解协议细节，以及何时应优先选择这种方式而不是传统回调。

{{% alert title="使用 Go SDK？" color="primary" %}}
[Dapr Go SDK](https://github.com/dapr/go-sdk) 将该协议封装为一个高级辅助函数 —— [`client.SubscribeActorEvents`](https://github.com/dapr/go-sdk/tree/main/examples/actor-grpc) —— 由它为你管理流、回调派发和重新连接。本指南直接记录原始的 gRPC 协议，适用于理解线上传输格式，或用于尚未提供辅助函数的 SDK。
{{% /alert %}}

## 前提条件

- [Dapr v1.18 或更高版本]({{% ref "getting-started" %}})
- 为 Actor 配置的 state store（要求参见 [Actor 概述]({{% ref "actors-overview" %}})）
- 你所用语言的 Dapr proto 定义（Go 示例使用 `github.com/dapr/dapr/pkg/proto/runtime/v1`）

## 协议概览

{{< diagram actor-event-stream >}}

daprd 为每个回调和响应生成唯一的 `id`，用于将二者关联起来。应用**必须**在响应中回传相同的 `id`。

## 步骤 1：打开流并注册 Actor 类型

流上发送的第一条消息必须是 `initial_request`，用于声明应用所承载的 Actor 类型。除 `entities` 外，所有字段都是可选的，并会覆盖 Dapr 的默认值。

{{< tabpane text=true >}}

{{% tab "Go（原始 gRPC）" %}}

```go
package main

import (
    "context"
    "log"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"

    runtimev1pb "github.com/dapr/dapr/pkg/proto/runtime/v1"
    anypb "google.golang.org/protobuf/types/known/anypb"
    durationpb "google.golang.org/protobuf/types/known/durationpb"
)

func main() {
    // 连接到 Dapr sidecar 的 gRPC 端口（默认 50001）。
    conn, err := grpc.NewClient("localhost:50001",
        grpc.WithTransportCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatalf("connect: %v", err)
    }
    defer conn.Close()

    client := runtimev1pb.NewDaprClient(conn)
    ctx := context.Background()

    // 打开双向流。
    stream, err := client.SubscribeActorEventsAlpha1(ctx)
    if err != nil {
        log.Fatalf("open stream: %v", err)
    }

    // 第一条消息：注册本应用承载的 Actor 类型。
    idleTimeout := durationpb.New(60 * time.Minute)
    err = stream.Send(&runtimev1pb.SubscribeActorEventsRequestAlpha1{
        RequestType: &runtimev1pb.SubscribeActorEventsRequestAlpha1_InitialRequest{
            InitialRequest: &runtimev1pb.SubscribeActorEventsRequestInitialAlpha1{
                Entities:           []string{"MyActor"},
                ActorIdleTimeout:   idleTimeout,
                DrainRebalancedActors: boolPtr(true),
            },
        },
    })
    if err != nil {
        log.Fatalf("send initial: %v", err)
    }

    // 等待 daprd 的确认。
    msg, err := stream.Recv()
    if err != nil {
        log.Fatalf("recv initial ack: %v", err)
    }
    if msg.GetInitialResponse() == nil {
        log.Fatalf("unexpected first message type")
    }
    log.Println("registered with Dapr, waiting for callbacks")

    // 进入回调循环。
    handleCallbacks(stream)
}

func boolPtr(b bool) *bool { return &b }
```

{{% /tab %}}

{{< /tabpane >}}

## 步骤 2：处理回调

完成初始握手后，流会传递来自 daprd 的回调。每条回调消息都使用 `oneof response_type`。应用必须为收到的每个回调发送一个相互关联的响应。

{{< tabpane text=true >}}

{{% tab "Go（原始 gRPC）" %}}

```go
func handleCallbacks(stream runtimev1pb.Dapr_SubscribeActorEventsAlpha1Client) {
    for {
        msg, err := stream.Recv()
        if err != nil {
            log.Printf("stream closed: %v", err)
            return
        }

        switch v := msg.ResponseType.(type) {

        case *runtimev1pb.SubscribeActorEventsResponseAlpha1_InvokeRequest:
            req := v.InvokeRequest
            log.Printf("invoke %s/%s.%s (id=%s)", req.ActorType, req.ActorId, req.Method, req.Id)

            // 执行 Actor 方法并构建响应负载。
            result, invokeErr := dispatchMethod(req.ActorType, req.ActorId, req.Method, req.Data)

            resp := &runtimev1pb.SubscribeActorEventsRequestAlpha1{}
            if invokeErr != nil {
                resp.RequestType = &runtimev1pb.SubscribeActorEventsRequestAlpha1_InvokeResponse{
                    InvokeResponse: &runtimev1pb.SubscribeActorEventsRequestInvokeResponseAlpha1{
                        Id:    req.Id,
                        Data:  []byte(invokeErr.Error()),
                        Error: true,
                    },
                }
            } else {
                resp.RequestType = &runtimev1pb.SubscribeActorEventsRequestAlpha1_InvokeResponse{
                    InvokeResponse: &runtimev1pb.SubscribeActorEventsRequestInvokeResponseAlpha1{
                        Id:   req.Id,
                        Data: result,
                    },
                }
            }
            if err := stream.Send(resp); err != nil {
                log.Printf("send invoke response: %v", err)
                return
            }

        case *runtimev1pb.SubscribeActorEventsResponseAlpha1_ReminderRequest:
            req := v.ReminderRequest
            log.Printf("reminder %s/%s name=%s (id=%s)", req.ActorType, req.ActorId, req.Name, req.Id)

            // 返回 cancel=true，以在本次触发后取消该 reminder。
            shouldCancel := handleReminder(req.ActorType, req.ActorId, req.Name, req.Data)

            if err := stream.Send(&runtimev1pb.SubscribeActorEventsRequestAlpha1{
                RequestType: &runtimev1pb.SubscribeActorEventsRequestAlpha1_ReminderResponse{
                    ReminderResponse: &runtimev1pb.SubscribeActorEventsRequestReminderResponseAlpha1{
                        Id:     req.Id,
                        Cancel: shouldCancel,
                    },
                },
            }); err != nil {
                return
            }

        case *runtimev1pb.SubscribeActorEventsResponseAlpha1_TimerRequest:
            req := v.TimerRequest
            log.Printf("timer %s/%s name=%s (id=%s)", req.ActorType, req.ActorId, req.Name, req.Id)

            shouldCancel := handleTimer(req.ActorType, req.ActorId, req.Name, req.Data)

            if err := stream.Send(&runtimev1pb.SubscribeActorEventsRequestAlpha1{
                RequestType: &runtimev1pb.SubscribeActorEventsRequestAlpha1_TimerResponse{
                    TimerResponse: &runtimev1pb.SubscribeActorEventsRequestReminderResponseAlpha1{
                        Id:     req.Id,
                        Cancel: shouldCancel,
                    },
                },
            }); err != nil {
                return
            }

        case *runtimev1pb.SubscribeActorEventsResponseAlpha1_DeactivateRequest:
            req := v.DeactivateRequest
            log.Printf("deactivate %s/%s (id=%s)", req.ActorType, req.ActorId, req.Id)

            releaseActorState(req.ActorType, req.ActorId)

            if err := stream.Send(&runtimev1pb.SubscribeActorEventsRequestAlpha1{
                RequestType: &runtimev1pb.SubscribeActorEventsRequestAlpha1_DeactivateResponse{
                    DeactivateResponse: &runtimev1pb.SubscribeActorEventsRequestDeactivateResponseAlpha1{
                        Id: req.Id,
                    },
                },
            }); err != nil {
                return
            }
        }
    }
}

// 占位实现，请替换为你自己的 Actor 逻辑。
func dispatchMethod(actorType, actorID, method string, data []byte) ([]byte, error) { return nil, nil }
func handleReminder(actorType, actorID, name string, data *anypb.Any) bool         { return false }
func handleTimer(actorType, actorID, name string, data *anypb.Any) bool            { return false }
func releaseActorState(actorType, actorID string)                                   {}
```

{{% /tab %}}

{{< /tabpane >}}

## 步骤 3：发送错误信号

如果应用无法处理某个回调（例如，未注册对应的 Actor 方法），请发送 `request_failed` 消息，而不是类型化的响应。请使用 [google.golang.org/grpc/codes](https://pkg.go.dev/google.golang.org/grpc/codes) 中的 gRPC 状态码。

```go
import "google.golang.org/grpc/codes"

stream.Send(&runtimev1pb.SubscribeActorEventsRequestAlpha1{
    RequestType: &runtimev1pb.SubscribeActorEventsRequestAlpha1_RequestFailed{
        RequestFailed: &runtimev1pb.SubscribeActorEventsRequestFailedAlpha1{
            Id:      req.Id,
            Code:    uint32(codes.NotFound),  // 将该失败标记为永久性、不可重试
            Message: "actor method not found: " + req.Method,
        },
    },
})
```

{{% alert title="重要" color="warning" %}}
daprd 将 `codes.NotFound` 视为永久性的、不可重试的失败。对于 Dapr 应当重试的临时性错误，请使用其他状态码（例如 `codes.Internal`）。
{{% /alert %}}

## 步骤 4：处理重新连接

该流是一个长连接。如果 daprd 重启或网络中断，`stream.Recv()` 会返回错误。请使用指数退避重新连接：

```go
import (
    "math/rand"
    "time"
)

func runWithReconnect(ctx context.Context, client runtimev1pb.DaprClient) {
    backoff := 1 * time.Second
    for {
        if ctx.Err() != nil {
            return
        }
        stream, err := client.SubscribeActorEventsAlpha1(ctx)
        if err != nil {
            log.Printf("open stream error: %v; retrying in %s", err, backoff)
            time.Sleep(backoff + time.Duration(rand.Intn(500))*time.Millisecond)
            backoff = min(backoff*2, 30*time.Second)
            continue
        }
        backoff = 1 * time.Second // 成功后重置

        if err := sendInitialRequest(stream); err != nil {
            continue
        }
        if _, err := stream.Recv(); err != nil { // 等待初始确认
            continue
        }
        handleCallbacks(stream) // 阻塞直到流关闭
    }
}
```

## 运行时配置字段

初始注册消息可以包含以下可选字段，用于覆盖 Dapr 对该流上所有 Actor 类型的默认值：

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `entities` | `[]string` | **必填。** 本应用承载的 Actor 类型。 |
| `actor_idle_timeout` | `Duration` | 在此空闲时长后停用 Actor。未设置时使用 Dapr 默认值（60 分钟）。 |
| `drain_ongoing_call_timeout` | `Duration` | 重新平衡期间，等待进行中调用完成的时长。未设置时使用 Dapr 默认值（2 秒）。 |
| `drain_rebalanced_actors` | `bool` | 若为 true，则在停用经过重新平衡的 Actor 之前等待排空。未设置时使用 Dapr 默认值。 |
| `reentrancy` | `ActorReentrancyConfig` | 启用 Actor 重入并设置最大栈深度。默认：禁用。 |
| `entities_config` | `[]ActorEntityConfig` | 为各个 Actor 类型单独覆盖上述任一字段。 |

有关每个参数的说明，请参阅 [Actor runtime 配置参数]({{% ref "actors-runtime-config" %}})。

## 与传统回调共存

应用发起的流与传统的 HTTP/gRPC 回调并不互斥。已打开 `SubscribeActorEventsAlpha1` 的 Pod 通过该流接收回调；未打开该流的 Pod 则继续使用传统的入站端点。在移除入站端口和 NetworkPolicy 规则之前，请先迁移所有 Pod。

## 相关链接

- [Actor App-Initiated Streams 概念]({{% ref "actors-app-initiated-streams" %}})
- [Actor API 参考 — SubscribeActorEventsAlpha1]({{% ref "actors_api#subscribeactoreventsalpha1-grpc" %}})
- [Actor runtime 配置参数]({{% ref "actors-runtime-config" %}})
- [Actor 概述]({{% ref "actors-overview" %}})
