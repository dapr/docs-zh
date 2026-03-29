---
type: docs
title: "如何：使用 gRPC 调用服务"
linkTitle: "如何：使用 gRPC 调用"
description: "使用服务调用在服务之间进行调用"
weight: 30
---

本文介绍如何使用 Dapr 通过 gRPC 连接服务。

通过使用 Dapr 的 gRPC 代理能力，你可以使用现有的基于 proto 的 gRPC 服务，并让流量通过 Dapr 边车。这样做可以为开发者带来以下 [Dapr 服务调用]({{% ref service-invocation-overview %}}) 优势：

1. 双向认证
2. 追踪
3. 指标
4. 访问列表
5. 网络级别的弹性
6. 基于 API token 的认证

Dapr 允许代理各种类型的 gRPC 调用，包括一元调用和[基于流](#代理流式-rpc)的调用。

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

// server 用于实现 helloworld.GreeterServer。
type server struct {
	pb.UnimplementedGreeterServer
}

// SayHello 实现 helloworld.GreeterServer
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

此 Go 应用实现了 Greeter proto 服务，并公开了一个 `SayHello` 方法。

### 使用 Dapr CLI 运行 gRPC 服务器

```bash
dapr run --app-id server --app-port 50051 -- go run main.go
```

使用 Dapr CLI，我们通过 `--app-id` 标志为应用分配一个唯一 ID `server`。

## 步骤 2：调用服务

以下示例展示如何从 gRPC 客户端使用 Dapr 发现 Greeter 服务。
请注意，客户端不是直接在端口 `50051` 上调用目标服务，而是通过端口 `50007` 调用其本地 Dapr 边车，从而获得服务调用的所有能力，包括服务发现、追踪、mTLS 和重试。

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
	// 建立与服务器的连接。
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

以下代码行告诉 Dapr 发现并调用名为 `server` 的应用：

```go
ctx = metadata.AppendToOutgoingContext(ctx, "dapr-app-id", "server")
```

所有支持 gRPC 的语言都允许添加元数据。以下是几个示例：

{{< tabpane text=true >}}

{{% tab "Java" %}}
```java
Metadata headers = new Metadata();
Metadata.Key<String> jwtKey = Metadata.Key.of("dapr-app-id", "server");

GreeterService.ServiceBlockingStub stub = GreeterService.newBlockingStub(channel);
stub = MetadataUtils.attachHeaders(stub, header);
stub.SayHello(new HelloRequest() { Name = "Darth Malak" });
```
{{% /tab %}}

{{% tab ".NET" %}}
```csharp
var metadata = new Metadata
{
	{ "dapr-app-id", "server" }
};

var call = client.SayHello(new HelloRequest { Name = "Darth Nihilus" }, metadata);
```
{{% /tab %}}

{{% tab "Python" %}}
```python
metadata = (('dapr-app-id', 'server'),)
response = stub.SayHello(request={ name: 'Darth Revan' }, metadata=metadata)
```
{{% /tab %}}

{{% tab "JavaScript" %}}
```javascript
const metadata = new grpc.Metadata();
metadata.add('dapr-app-id', 'server');

client.sayHello({ name: "Darth Malgus" }, metadata)
```
{{% /tab %}}

{{% tab "Ruby" %}}
```ruby
metadata = { 'dapr-app-id' : 'server' }
response = service.sayHello({ 'name': 'Darth Bane' }, metadata)
```
{{% /tab %}}

{{% tab "C++" %}}
```c++
grpc::ClientContext context;
context.AddMetadata("dapr-app-id", "server");
```
{{% /tab %}}

{{< /tabpane >}}

### 使用 Dapr CLI 运行客户端

```bash
dapr run --app-id client --dapr-grpc-port 50007 -- go run main.go
```

### 查看遥测数据

如果你在本地运行 Dapr 并安装了 Zipkin，请在浏览器中打开 `http://localhost:9411` 查看客户端和服务器之间的追踪信息。

### 部署到 Kubernetes

在你的部署上设置以下 Dapr 注解：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-app
  namespace: default
  labels:
    app: grpc-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grpc-app
  template:
    metadata:
      labels:
        app: grpc-app
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "server"
        dapr.io/app-protocol: "grpc"
        dapr.io/app-port: "50051"
...
```

`dapr.io/app-protocol: "grpc"` 注解告诉 Dapr 使用 gRPC 调用应用。

如果你的应用使用 TLS 连接，你可以通过 `app-protocol: "grpcs"` 注解告诉 Dapr 通过 TLS 调用你的应用（完整列表见[这里]({{% ref arguments-annotations-overview %}})）。请注意，Dapr 不验证应用提供的 TLS 证书。

### 命名空间

在[支持命名空间的平台]({{% ref "service_invocation_api#namespace-supported-platforms" %}})上运行时，你需要在应用 ID 中包含目标应用的命名空间：`myApp.production`

例如，调用不同命名空间上的 gRPC 服务器：

```go
ctx = metadata.AppendToOutgoingContext(ctx, "dapr-app-id", "server.production")
```

有关命名空间的更多信息，请参阅[跨命名空间 API 规范]({{% ref "service_invocation_api#cross-namespace-invocation" %}})。

## 步骤 3：查看追踪和日志

上面的示例向你展示如何直接调用本地或 Kubernetes 上运行的不同服务。Dapr 输出指标、追踪和日志信息，使你能够可视化服务之间的调用图、记录错误，并可选择记录有效负载正文。

有关追踪和日志的更多信息，请参阅[可观测性]({{% ref observability-concept %}})文章。

## 代理流式 RPC

使用 Dapr 通过 gRPC 代理流式 RPC 调用时，必须设置一个额外的元数据选项 `dapr-stream`，其值为 `true`。

例如：

{{< tabpane text=true >}}

{{% tab "Go" %}}
```go
ctx = metadata.AppendToOutgoingContext(ctx, "dapr-app-id", "server")
ctx = metadata.AppendToOutgoingContext(ctx, "dapr-stream", "true")
```
{{% /tab %}}

{{% tab "Java" %}}
```java
Metadata headers = new Metadata();
Metadata.Key<String> jwtKey = Metadata.Key.of("dapr-app-id", "server");
Metadata.Key<String> jwtKey = Metadata.Key.of("dapr-stream", "true");
```
{{% /tab %}}

{{% tab ".NET" %}}
```csharp
var metadata = new Metadata
{
	{ "dapr-app-id", "server" },
	{ "dapr-stream", "true" }
};
```
{{% /tab %}}

{{% tab "Python" %}}
```python
metadata = (('dapr-app-id', 'server'), ('dapr-stream', 'true'),)
```
{{% /tab %}}

{{% tab "JavaScript" %}}
```javascript
const metadata = new grpc.Metadata();
metadata.add('dapr-app-id', 'server');
metadata.add('dapr-stream', 'true');
```
{{% /tab %}}

{{% tab "Ruby" %}}
```ruby
metadata = { 'dapr-app-id' : 'server' }
metadata = { 'dapr-stream' : 'true' }
```
{{% /tab %}}

{{% tab "C++" %}}
```c++
grpc::ClientContext context;
context.AddMetadata("dapr-app-id", "server");
context.AddMetadata("dapr-stream", "true");
```
{{% /tab %}}

{{< /tabpane >}}

### 流式 gRPC 与弹性

> 目前，通过 gRPC 进行服务调用时不支持弹性策略。

代理流式 gRPC 时，由于其长期存在的特性，[弹性]({{% ref "resiliency-overview" %}})策略仅应用于"初始握手"。因此：

- 如果流在初始握手后被中断，Dapr 不会自动重新建立它。你的应用将收到流已结束的通知，并需要重新创建它。
- 重试策略仅影响初始连接"握手"。如果你的弹性策略包含重试，Dapr 将检测建立与目标应用的初始连接时的失败，并将重试直到成功（或直到策略中定义的重试次数用尽）。
- 同样，弹性策略中定义的超时仅适用于初始"握手"。连接建立后，超时不再影响流。

## 相关链接

* [服务调用概述]({{% ref service-invocation-overview %}})
* [服务调用 API 规范]({{% ref service_invocation_api %}})
* [gRPC 代理社区呼叫视频](https://youtu.be/B_vkXqptpXY?t=70)

## 社区呼叫演示

观看此[视频](https://youtu.be/B_vkXqptpXY?t=69)，了解如何使用 Dapr 的 gRPC 代理能力：

{{< youtube id=B_vkXqptpXY start=69 >}}
