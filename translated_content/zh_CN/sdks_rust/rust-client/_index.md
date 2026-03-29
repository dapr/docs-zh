---
type: docs
title: "开始使用 Dapr 客户端 Rust SDK"
linkTitle: "Client"
weight: 20000
description: 如何开始使用 Dapr Rust SDK
no_list: true
---

Dapr 客户端包允许您从 Rust 应用程序与其他 Dapr 应用程序进行交互。

{{% alert title="注意" color="primary" %}}
Dapr Rust SDK 目前处于 Alpha 阶段。我们正在努力将其推向稳定版本，期间可能会涉及破坏性变更。
{{% /alert %}

## 前置条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- 已安装 [Rust](https://www.rust-lang.org/tools/install)

## 导入客户端包

将 Dapr 添加到您的 `cargo.toml`

```toml
[dependencies]
dapr = "0.16"
```

您可以直接引用 `dapr::Client` 或将完整路径绑定到新名称，如下所示：

```rust
use dapr::Client as DaprClient;
```

## 实例化 Dapr 客户端

```rust
let addr = "https://127.0.0.1".to_string();

let mut client = dapr::Client::<dapr::client::TonicClient>::connect(addr,
port).await?;
```

或者，如果您想指定自定义端口，可以使用此 connect 方法：

```rust
let mut client = dapr::Client::<dapr::client::TonicClient>::connect_with_port(addr, "3500".to_string()).await?;
```

## 构建块

Rust SDK 允许您与 [Dapr 构建块]({{% ref building-blocks %}}) 进行交互。

### 服务调用 (gRPC)

要在运行 Dapr 边车的另一个服务上调用特定方法，Dapr 客户端提供两个选项：

调用 (gRPC) 服务

```rust
let response = client
    .invoke_service("service-to-invoke", "method-to-invoke", Some(data))
    .await
    .unwrap();
```

有关服务调用的完整指南，请访问[如何操作：调用服务]({{% ref howto-invoke-discover-services.md %}})。

### 状态管理

Dapr 客户端提供对这些状态管理方法的访问：`save_state`、`get_state`、`delete_state`，可以像这样使用：

```rust
let store_name = String::from("statestore");

let key = String::from("hello");
let val = String::from("world").into_bytes();

// save key-value pair in the state store
client
    .save_state(store_name, key, val, None, None, None)
    .await?;

let get_response = client
    .get_state("statestore", "hello", None)
    .await?;

// delete a value from the state store
client
    .delete_state("statestore", "hello", None)
    .await?;
```

可以使用 `save_bulk_states` 方法发送多个状态。

有关状态管理的完整指南，请访问[如何操作：保存和获取状态]({{% ref howto-get-save-state.md %}})。

### 发布消息

要将数据发布到主题，Dapr 客户端提供了一个简单的方法：

```rust
let pubsub_name = "pubsub-name".to_string();
let pubsub_topic = "topic-name".to_string();
let pubsub_content_type = "text/plain".to_string();

let data = "content".to_string().into_bytes();
client
    .publish_event(pubsub_name, pubsub_topic, pubsub_content_type, data, None)
    .await?;
```

有关发布订阅的完整指南，请访问[如何操作：发布和订阅]({{% ref howto-publish-subscribe.md %}})。

## 相关链接

[Rust SDK 示例](https://github.com/dapr/rust-sdk/tree/master/examples)
