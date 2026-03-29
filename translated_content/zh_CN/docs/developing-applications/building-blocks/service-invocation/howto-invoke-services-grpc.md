---
type: docs
title: "如何：使用 gRPC 调用服务"
linkTitle: "如何：使用 gRPC 调用"
description: "使用服务调用在服务之间进行调用"
weight: 30
---

本文描述了如何使用 Dapr 通过 gRPC 连接服务。

通过使用 Dapr 的 gRPC 代理功能，你可以使用现有的基于 proto 的 gRPC 服务，并让流量通过 Dapr 边车传输。这样可以为开发者带来以下 [Dapr 服务调用]({{% ref service-invocation-overview %}}) 优势：

1. 双向身份验证
2. 追踪
3. 指标
4. 访问列表
5. 网络级弹性
6. 基于 API 令牌的身份验证

Dapr 允许代理各种 gRPC 调用，包括 unary 和[基于流的](#proxying-of-streaming-rpcs) 调用。

## 步骤 1：运行 gRPC 服务器

以下示例取自 ["hello world" grpc-go 示例](https://github.com/grpc/grpc-go/tree/master/examples/helloworld)。虽然此示例使用 Go，但相同的概念适用于 gRPC 支持的所有编程语言。

```go
package main

import (
	"context"
	"log"
	"net"

	"google.golang.org/grpc"
	pb "google.golang.org/grpc/examples/helloworld/helloworld"
)

const (
	port = ":50051"
)

// server is used to implement helloworld.GreeterServer.
type server struct {
	pb.UnimplementedGreeterServer
}

// SayHello implements helloworld.GreeterServer
func (s *server) SayHello(ctx context.Context, in *pb.HelloRequest) (*pb.HelloReply, error) {
	log.Printf("Received: %v", in.GetName())
	return &pb.HelloReply{Message: "Hello " + in.GetName()}, nil
}

func main() {
	lis, err := net.Listen("tcp", port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	s := grpc.NewServer()
	pb.RegisterGreeterServer(s, &server{})
	log.Printf("server listening at %v", lis.Addr())
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
```

此 Go 应用实现了 Greeter proto 服务，并暴露了 `SayHello` 方法。

### 使用 Dapr CLI 运行 gRPC 服务器

```bash
dapr run --app-id server --app-port 50051 -- go run main.go
```

使用 Dapr CLI，我们使用 `--app-id` 标志为应用分配了一个唯一 ID `server`。

## 步骤 2：调用服务

以下示例展示了如何从 gRPC 客户端使用 Dapr 发现 Greeter 服务。
请注意，客户端不是直接在端口 `50051` 上调用目标服务，而是通过端口 `50007` 调用其本地 Dapr 边车，然后由边车提供所有服务调用能力，包括服务发现、追踪、mTLS 和重试。

```go
package main

import (
	"context"
	"log"
	"time"

	"google.golang.org/grpc"
	pb "google.golang.org/grpc/examples/helloworld/helloworld"
	"google.golang.org/grpc/metadata"
)

const (
	address = "localhost:50007"
)

func main() {
	// Set up a connection to the server.
	conn, err := grpc.Dial(address, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()
	c := pb.NewGreeterClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*2)
	defer cancel()

	ctx = metadata.AppendToOutgoingContext(ctx, "dapr-app-id", "server")
	r, err := c.SayHello(ctx, &pb.HelloRequest{Name: "Darth Tyrannus"})
	if err != nil {
		log.Fatalf("could not greet: %v", err)
	}

	log.Printf("Greeting: %s", r.GetMessage())
}
```

以下行告诉 Dapr 发现并调用名为 `server` 的应用：

```go
ctx = metadata.AppendToOutgoingContext(ctx, "dapr-app-id", "server")
```

gRPC 支持的所有语言都允许添加元数据。以下是一些示例：

{{< tabpane text=true >}}

{{% tab "Java" %}}
```java
Metadata headers = new Metadata();
Metadata.Key<String> jwtKey = Metadata.Key.of("dapr-app-id", "server");

GreeterService.ServiceBlockingStub stub = GreeterService.newBlockingStub(channel);
stub = MetadataUtils.attachHeaders(stub, header);
stub.SayHello(new HelloRequest() { Name = "Darth Malak" });
```
{{% /tab率为0。超时策略仅应用于初始"握手"。连接建立后，超时不再影响流。

## 相关链接

* [服务调用概述]({{% ref service-invocation-overview %})
* [服务调用 API 规范]({{% ref service_invocation_api %})
* [gRPC 代理社区视频](https://youtu.be/B_vkXqptpXY?t=70)

## 社区演示

观看此[视频](https://youtu.be/B_vkXqptpXY?t=69)，了解如何使用 Dapr 的 gRPC 代理功能：

{{< youtube id=B_vkXqptpXY start=69 >}}
