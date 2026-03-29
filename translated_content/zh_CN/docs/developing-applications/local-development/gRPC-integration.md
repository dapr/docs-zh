---
type: docs
title: "操作指南：在 Dapr 应用中使用 gRPC 接口"
linkTitle: "gRPC 接口"
weight: 400
description: "在应用程序中使用 Dapr gRPC API"
---

Dapr 为本地调用实现了 HTTP 和 gRPC 两种 API。[gRPC](https://grpc.io/) 适用于低延迟、高性能场景，并提供了基于 proto 客户端的语言集成。

[在 Dapr SDK 文档中查看自动生成客户端的完整列表]({{% ref sdks %}})。

Dapr 运行时实现了一个 [proto 服务](https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/dapr.proto)，应用程序可以通过 gRPC 与其通信。

除了通过 gRPC 调用 Dapr 外，Dapr 还支持作为代理进行 gRPC 服务间调用。[在 gRPC 服务调用操作指南中了解更多]({{% ref howto-invoke-services-grpc.md %}})。

本指南演示如何使用 Go SDK 应用程序配置并通过 gRPC 调用 Dapr。

## 配置 Dapr 通过 gRPC 与应用程序通信

{{< tabpane text=true >}}
<!--selfhosted-->
{{% tab "Self-hosted" %}}

在自托管模式下运行时，使用 `--app-protocol` 标志告知 Dapr 使用 gRPC 与应用程序通信。

```bash
dapr run --app-protocol grpc --app-port 5005 node app.js
```

这会告知 Dapr 通过端口 `5005` 上的 gRPC 与应用程序通信。

{{% /tab %}}

<!--k8s-->
{{% tab "Kubernetes" %}}

在 Kubernetes 上，在部署 YAML 中设置以下注解：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
  labels:
    app: myapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "myapp"
        dapr.io/app-protocol: "grpc"
        dapr.io/app-port: "5005"
...
```

{{% /tab %}}

{{< /tabpane >}}

## 通过 gRPC 调用 Dapr

以下步骤展示如何创建 Dapr 客户端并调用其 `SaveStateData` 操作。

1. 导入包：

    ```go
    package main
    
    import (
    	"context"
    	"log"
    	"os"
    
    	dapr "github.com/dapr/go-sdk/client"
    )
    ```

1. 创建客户端：

    ```go
    // 仅用于此演示
    ctx := context.Background()
    data := []byte("ping")
    
    // 创建客户端
    client, err := dapr.NewClient()
    if err != nil {
      log.Panic(err)
    }
    defer client.Close()
    ```
    
    3. 调用 `SaveState` 方法：
    
    ```go
    // 使用键 key1 保存状态
    err = client.SaveState(ctx, "statestore", "key1", data)
    if err != nil {
      log.Panic(err)
    }
    log.Println("data saved")
    ```

现在你可以探索 Dapr 客户端上的所有不同方法。

## 使用 Dapr 创建 gRPC 应用

以下步骤展示如何创建一个应用程序，该应用程序暴露一个可供 Dapr 通信的服务器。

1. 导入包：

    ```go
    package main
    
    import (
    	"context"
    	"fmt"
    	"log"
    	"net"
    
    	"github.com/golang/protobuf/ptypes/any"
    	"github.com/golang/protobuf/ptypes/empty"
    
    	commonv1pb "github.com/dapr/dapr/pkg/proto/common/v1"
    	pb "github.com/dapr/dapr/pkg/proto/runtime/v1"
    	"google.golang.org/grpc"
    )
    ```

1. 实现接口：

    ```go
    // server 是我们的用户应用程序
    type server struct {
         pb.UnimplementedAppCallbackServer
    }
    
    // EchoMethod 是一个简单的演示方法，用于调用
    func (s *server) EchoMethod() string {
    	return "pong"
    }
    
    // 当远程服务通过 Dapr 调用应用程序时，会调用此方法
    // 载荷包含一个用于标识方法的 Method、一组元数据属性和一个可选载荷
    func (s *server) OnInvoke(ctx context.Context, in *commonv1pb.InvokeRequest) (*commonv1pb.InvokeResponse, error) {
    	var response string
    
    	switch in.Method {
    	case "EchoMethod":
    		response = s.EchoMethod()
    	}
    
    	return &commonv1pb.InvokeResponse{
    		ContentType: "text/plain; charset=UTF-8",
    		Data:        &any.Any{Value: []byte(response)},
    	}, nil
    }
    
    // Dapr 将调用此方法以获取应用程序希望订阅的主题列表。在此示例中，我们告知 Dapr
    // 订阅一个名为 TopicA 的主题
    func (s *server) ListTopicSubscriptions(ctx context.Context, in *empty.Empty) (*pb.ListTopicSubscriptionsResponse, error) {
    	return &pb.ListTopicSubscriptionsResponse{
    		Subscriptions: []*pb.TopicSubscription{
    			{Topic: "TopicA"},
    		},
    	}, nil
    }
    
    // Dapr 将调用此方法以获取将调用应用程序的绑定列表。在此示例中，我们告知 Dapr
    // 使用名为 storage 的绑定调用我们的应用程序
    func (s *server) ListInputBindings(ctx context.Context, in *empty.Empty) (*pb.ListInputBindingsResponse, error) {
    	return &pb.ListInputBindingsResponse{
    		Bindings: []string{"storage"},
    	}, nil
    }
    
    // 每当从已注册绑定触发新事件时，都会调用此方法。消息携带绑定名称、载荷和可选元数据
    func (s *server) OnBindingEvent(ctx context.Context, in *pb.BindingEventRequest) (*pb.BindingEventResponse, error) {
    	fmt.Println("Invoked from binding")
    	return &pb.BindingEventResponse{}, nil
    }
    
    // 当消息已发布到已订阅的主题时，将触发此方法。Dapr 以 CloudEvents 0.3 信封发送已发布的消息。
    func (s *server) OnTopicEvent(ctx context.Context, in *pb.TopicEventRequest) (*pb.TopicEventResponse, error) {
    	fmt.Println("Topic message arrived")
            return &pb.TopicEventResponse{}, nil
    }
    
    ```

1. 创建服务器：

    ```go
    func main() {
    	// 创建监听器
    	lis, err := net.Listen("tcp", ":50001")
    	if err != nil {
    		log.Fatalf("failed to listen: %v", err)
    	}
    
    	// 创建 grpc 服务器
    	s := grpc.NewServer()
    	pb.RegisterAppCallbackServer(s, &server{})
    
    	fmt.Println("Client starting...")
    
    	// 然后启动...
    	if err := s.Serve(lis); err != nil {
    		log.Fatalf("failed to serve: %v", err)
    	}
    }
    ```

   这会为你的应用程序在端口 50001 上创建一个 gRPC 服务器。

## 运行应用程序

{{< tabpane text=true >}}
<!--selfhosted-->
{{% tab "Self-hosted" %}}

要在本地运行，请使用 Dapr CLI：

```bash
dapr run --app-id goapp --app-port 50001 --app-protocol grpc go run main.go
```

{{% /tab %}}

<!--k8s-->
{{% tab "Kubernetes" %}}

在 Kubernetes 上，在 Pod 规范模板中设置所需的 `dapr.io/app-protocol: "grpc"` 和 `dapr.io/app-port: "50001` 注解，如上所述。

{{% /tab %}}

{{< /tabpane >}}
    

## 其他语言

你可以将 Dapr 与 Protobuf 支持的任何语言一起使用，而不仅仅是当前可用的生成 SDK。

使用 [protoc](https://developers.google.com/protocol-buffers/docs/downloads) 工具，你可以为其他语言（如 Ruby、C++、Rust 等）生成 Dapr 客户端。

 ## 相关主题
- [服务调用构建块]({{% ref service-invocation %}})
- [服务调用 API 规范]({{% ref service_invocation_api.md %}})
