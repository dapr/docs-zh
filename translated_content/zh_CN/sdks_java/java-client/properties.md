---
type: docs
title: "属性"
linkTitle: "属性"
weight: 3001
description: 用于配置 Dapr Java SDK 的全局属性，支持环境变量和系统属性
---

# 属性

Dapr Java SDK 提供了一组控制 SDK 行为的全局属性。这些属性可以通过环境变量或系统属性进行配置。系统属性可以在运行 Java 应用程序时使用 `-D` 标志进行设置。

这些属性会影响整个 SDK，包括客户端和运行时。它们控制的方面包括：
- 边车连接（端点、端口）
- 安全设置（TLS、API 令牌）
- 性能调优（超时、连接池）
- 协议设置（gRPC、HTTP）
- 字符串编码

## 环境变量

以下环境变量可用于配置 Dapr Java SDK：

### 边车端点

当设置这些变量时，客户端将自动使用它们连接到 Dapr 边车。

| 环境变量 | 描述 | 默认值 |
|---------------------|-------------|---------|
| `DAPR_GRPC_ENDPOINT` | Dapr 边车的 gRPC 端点 | `localhost:50001` |
| `DAPR_HTTP_ENDPOINT` | Dapr 边车的 HTTP 端点 | `localhost:3500` |
| `DAPR_GRPC_PORT` | Dapr 边车的 gRPC 端口（已弃用，`DAPR_GRPC_ENDPOINT` 优先级更高） | `50001` |
| `DAPR_HTTP_PORT` | Dapr 边车的 HTTP 端口（已弃用，`DAPR_HTTP_ENDPOINT` 优先级更高） | `3500` |

### API 令牌

Dapr 支持两种类型的 API 令牌来保护通信：

| 环境变量 | 描述 | 默认值 |
|---------------------|-------------|---------|
| `DAPR_API_TOKEN` | 用于验证**从你的应用向 Dapr 边车发起**请求的 API 令牌。当使用 `DaprClient` 时，Java SDK 会自动在请求中包含此令牌。 | `null` |
| `APP_API_TOKEN` | 用于验证**从 Dapr 向你的应用发起**请求的 API 令牌。当设置此变量时，Dapr 在调用你的应用程序时（例如发布订阅订阅者、输入绑定或任务触发器），会在 `dapr-api-token` 请求头/元数据中包含此令牌。你的应用程序必须验证此令牌。 | `null` |

有关实现示例，请参阅 [App API Token Authentication]({{% ref "java-client#app-api-token-authentication" %}})。更多详情请参阅 [Dapr API token authentication](https://docs.dapr.io/operations/security/api-token/)。

### gRPC 配置

#### TLS 设置
为了安全地进行 gRPC 通信，你可以使用以下环境变量配置 TLS 设置：

| 环境变量 | 描述 | 默认值 |
|---------------------|-------------|---------|
| `DAPR_GRPC_TLS_INSECURE` | 当设置为 "true" 时，启用不安全的 TLS 模式，该模式仍然使用 TLS 但不验证证书。这会使用 InsecureTrustManagerFactory 来信任所有证书。应仅用于测试或安全环境。 | `false` |
| `DAPR_GRPC_TLS_CA_PATH` | CA 证书文件的路径。用于与具有自签名证书的服务器建立 TLS 连接。 | `null` |
| `DAPR_GRPC_TLS_CERT_PATH` | 用于客户端认证的 TLS 证书文件路径。 | `null` |
| `DAPR_GRPC_TLS_KEY_PATH` | 用于客户端认证的 TLS 私钥文件路径。 | `null` |

#### Keepalive 设置
使用以下环境变量配置 gRPC keepalive 行为：

| 环境变量 | 描述 | 默认值 |
|---------------------|-------------|---------|
| `DAPR_GRPC_ENABLE_KEEP_ALIVE` | 是否启用 gRPC keepalive | `false` |
| `DAPR_GRPC_KEEP_ALIVE_TIME_SECONDS` | gRPC keepalive 时间（秒） | `10` |
| `DAPR_GRPC_KEEP_ALIVE_TIMEOUT_SECONDS` | gRPC keepalive 超时（秒） | `5` |
| `DAPR_GRPC_KEEP_ALIVE_WITHOUT_CALLS` | 是否在没有调用时保持 gRPC 连接存活 | `true` |

#### 入站消息设置
使用以下环境变量配置 gRPC 入站消息设置：

| 环境变量 | 描述 | 默认值 |
|---------------------|-------------|---------|
| `DAPR_GRPC_MAX_INBOUND_MESSAGE_SIZE_BYTES` | Dapr 的 gRPC 最大入站消息大小（字节）。此值设置应用程序可以接收的 gRPC 消息的最大大小	| `4194304` |
| `DAPR_GRPC_MAX_INBOUND_METADATA_SIZE_BYTES` | Dapr 的 gRPC 最大入站元数据大小（字节） | `8192` |

### HTTP 客户端配置

这些属性控制用于与 Dapr 边车通信的 HTTP 客户端的行为：

| 环境变量 | 描述 | 默认值 |
|---------------------|-------------|---------|
| `DAPR_HTTP_CLIENT_READ_TIMEOUT_SECONDS` | HTTP 客户端读取操作的超时时间（秒）。这是等待 Dapr 边车响应的最长时间。 | `60` |
| `DAPR_HTTP_CLIENT_MAX_REQUESTS` | 可以同时执行的最大 HTTP 请求数。超过此限制后，请求将在内存中排队等待正在运行的调用完成。 | `1024` |
| `DAPR_HTTP_CLIENT_MAX_IDLE_CONNECTIONS` | HTTP 连接池中的最大空闲连接数。这是池中可以保持空闲的最大连接数。 | `128` |

### API 配置

这些属性控制通过 SDK 发起的 API 调用的行为：

| 环境变量 | 描述 | 默认值 |
|---------------------|-------------|---------|
| `DAPR_API_MAX_RETRIES` | 向 Dapr 边车发起 API 调用时，可重试异常的最大重试次数 | `0` |
| `DAPR_API_TIMEOUT_MILLISECONDS` | 向 Dapr 边车发起 API 调用的超时时间（毫秒）。值为 0 表示无超时。 | `0` |

### 字符串编码

| 环境变量 | 描述 | 默认值 |
|---------------------|-------------|---------|
| `DAPR_STRING_CHARSET` | SDK 中用于字符串编码/解码的字符集。必须是有效的 Java 字符集名称。 | `UTF-8` |

### 系统属性

所有环境变量都可以使用 `-D` 标志设置为系统属性。以下是可用的系统属性的完整列表：

| 系统属性 | 描述 | 默认值 |
|----------------|-------------|---------|
| `dapr.sidecar.ip` | Dapr 边车的 IP 地址 | `localhost` |
| `dapr.http.port` | Dapr 边车的 HTTP 端口 | `3500` |
| `dapr.grpc.port` | Dapr 边车的 gRPC 端口 | `50001` |
| `dapr.grpc.tls.cert.path` | gRPC TLS 证书的路径 | `null` |
| `dapr.grpc.tls.key.path` | gRPC TLS 密钥的路径 | `null` |
| `dapr.grpc.tls.ca.path` | gRPC TLS CA 证书的路径 | `null` |
| `dapr.grpc.tls.insecure` | 是否使用不安全的 TLS 模式 | `false` |
| `dapr.grpc.endpoint` | 远程边车的 gRPC 端点 | `null` |
| `dapr.grpc.enable.keep.alive` | 是否启用 gRPC keepalive | `false` |
| `dapr.grpc.keep.alive.time.seconds` | gRPC keepalive 时间（秒） | `10` |
| `dapr.grpc.keep.alive.timeout.seconds` | gRPC keepalive 超时（秒） | `5` |
| `dapr.grpc.keep.alive.without.calls` | 是否在没有调用时保持 gRPC 连接存活 | `true` |
| `dapr.http.endpoint` | 远程边车的 HTTP 端点 | `null` |
| `dapr.api.maxRetries` | API 调用的最大重试次数 | `0` |
| `dapr.api.timeoutMilliseconds` | API 调用的超时时间（毫秒） | `0` |
| `dapr.api.token` | 用于身份验证的 API 令牌 | `null` |
| `dapr.string.charset` | SDK 中使用的字符串编码 | `UTF-8` |
| `dapr.http.client.readTimeoutSeconds` | HTTP 客户端读取的超时时间（秒） | `60` |
| `dapr.http.client.maxRequests` | 最大并发 HTTP 请求数 | `1024` |
| `dapr.http.client.maxIdleConnections` | 最大空闲 HTTP 连接数 | `128` |

## 属性解析顺序

属性按以下顺序解析：
1. 覆盖值（如果在创建 Properties 实例时提供）
2. 系统属性（通过 `-D` 设置）
3. 环境变量
4. 默认值

SDK 按顺序检查每个来源。如果某个值对属性类型无效（例如，数值属性为非数字），SDK 将记录警告并尝试下一个来源。例如：

```bash
# 无效的布尔值 - 将被忽略
java -Ddapr.grpc.enable.keep.alive=not-a-boolean -jar myapp.jar

# 有效的布尔值 - 将被使用
export DAPR_GRPC_ENABLE_KEEP_ALIVE=false
```

在这种情况下，将使用环境变量，因为系统属性值无效。但是，如果两个值都有效，系统属性优先：

```bash
# 有效的布尔值 - 将被使用
java -Ddapr.grpc.enable.keep.alive=true -jar myapp.jar

# 有效的布尔值 - 将被忽略
export DAPR_GRPC_ENABLE_KEEP_ALIVE=false
```

可以通过 `DaprClientBuilder` 以两种方式设置覆盖值：

1. 使用单个属性覆盖（大多数情况下推荐）：
```java
import io.dapr.config.Properties;

// 设置单个属性覆盖
DaprClient client = new DaprClientBuilder()
    .withPropertyOverride(Properties.GRPC_ENABLE_KEEP_ALIVE, "true")
    .build();

// 或设置多个属性覆盖
DaprClient client = new DaprClientBuilder()
    .withPropertyOverride(Properties.GRPC_ENABLE_KEEP_ALIVE, "true")
    .withPropertyOverride(Properties.HTTP_CLIENT_READ_TIMEOUT_SECONDS, "120")
    .build();
```

2. 使用 Properties 实例（当你需要一次设置多个属性时很有用）：
```java
// 创建属性覆盖的映射
Map<String, String> overrides = new HashMap<>();
overrides.put("dapr.grpc.enable.keep.alive", "true");
overrides.put("dapr.http.client.readTimeoutSeconds", "120");

// 创建带有覆盖的 Properties 实例
Properties properties = new Properties(overrides);

// 在创建客户端时使用这些属性
DaprClient client = new DaprClientBuilder()
    .withProperties(properties)
    .build();
```

对于大多数用例，你会使用系统属性或环境变量。覆盖值主要用于在同一应用程序中需要为 SDK 的不同实例设置不同的属性值时。

## 代理配置

你可以使用系统属性为 Java 应用程序配置代理设置。这些是 Java 网络层（`java.net` 包）的标准 Java 系统属性，并非 Dapr 特有。它们会被 Java 的网络栈使用，包括 Dapr SDK 使用的 HTTP 客户端。

有关 Java 代理配置的详细信息，包括所有可用属性及其用法，请参阅 [Java Networking Properties documentation](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/net/doc-files/net-properties.html)。


例如，以下是配置代理的方法：

```bash
# 配置 HTTP 代理 - 替换为你的实际代理服务器详细信息
java -Dhttp.proxyHost=your-proxy-server.com -Dhttp.proxyPort=8080 -jar myapp.jar

# 配置 HTTPS 代理 - 替换为你的实际代理服务器详细信息
java -Dhttps.proxyHost=your-proxy-server.com -Dhttps.proxyPort=8443 -jar myapp.jar
```

将 `your-proxy-server.com` 替换为你的实际代理服务器主机名或 IP 地址，并调整端口号以匹配你的代理服务器配置。

这些代理设置会影响 Java 应用程序发起的所有 HTTP/HTTPS 连接，包括与 Dapr 边车的连接。
