---
type: docs
title: "状态生存时间 (TTL)"
linkTitle: "状态 TTL"
weight: 500
description: "使用 TTL 管理状态。"
---

Dapr 支持为每个状态设置请求级的生存时间（TTL）。这意味着应用程序可以为每个存储的状态设置 TTL，过期后将无法检索这些状态。

对于[支持的 状态存储]({{% ref supported-state-stores %}})，您只需在发布消息时设置 `ttlInSeconds` 元数据。其他 状态存储 将忽略此值。对于某些 状态存储，您可以按表/容器指定默认过期时间。

## 原生状态 TTL 支持

当 状态存储 组件原生支持状态 TTL 时，Dapr 直接转发 TTL 配置，不添加任何额外逻辑，保持可预测的行为。当组件以不同方式处理过期状态时，这非常有用。

未指定 TTL 时，将保留 状态存储 的默认行为。

## 显式持久化绕过全局定义的 TTL

持久化状态适用于所有允许为所有数据指定默认 TTL 的 状态存储，无论是：
- 通过 Dapr 组件设置全局 TTL 值，或
- 在 Dapr 外部创建 状态存储 并设置全局 TTL 值。

未指定特定 TTL 时，数据将在该全局 TTL 时间段后过期。这不由 Dapr 处理。

此外，所有 状态存储 还支持_显式_持久化数据的选项。这意味着您可以忽略默认数据库策略（可能在 Dapr 外部设置或通过 Dapr 组件设置）来无限期保留给定的数据库记录。您可以通过将 `ttlInSeconds` 设置为 `-1` 值来实现此目的。该值表示忽略任何设置的 TTL 值。

## 支持的组件

请参阅[ 状态存储 组件指南]({{% ref supported-state-stores %}})中的 TTL 列。

## 示例

您可以在 状态存储 set 请求的元数据中设置状态 TTL：

{{< tabpane text=true >}}

{{% tab "Python" %}}

<!--python-->

```python
#dependencies

from dapr.clients import DaprClient

#code

DAPR_STORE_NAME = "statestore"

with DaprClient() as client:
        client.save_state(DAPR_STORE_NAME, "order_1", str(orderId), state_metadata={
            'ttlInSeconds': '120'
        }) 

```

要启动 Dapr 边车 并运行上述示例应用程序，您需要运行类似于以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 -- python3 OrderProcessingService.py
```

{{% /tab %}}

{{% tab ".NET" %}}

<!--dotnet-->

```csharp
// dependencies

using Dapr.Client;

// code

await client.SaveStateAsync(storeName, stateKeyName, state, metadata: new Dictionary<string, string>() { 
    { 
        "ttlInSeconds", "120" 
    } 
});
```

要启动 Dapr 边车 并运行上述示例应用程序，您需要运行类似于以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 dotnet run
```

{{% /tab %}}

{{% tab "Go" %}}

<!--go-->

```go
// dependencies

import (
	dapr "github.com/dapr/go-sdk/client"
)

// code

md := map[string]string{"ttlInSeconds": "120"}
if err := client.SaveState(ctx, store, "key1", []byte("hello world"), md); err != nil {
   panic(err)
}
```

要启动 Dapr 边车 并运行上述示例应用程序，您需要运行类似于以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 go run .
```

{{% /tab %}}

{{% tab "HTTP API (Bash)" %}}

```bash
curl -X POST -H "Content-Type: application/json" -d '[{ "key": "order_1", "value": "250", "metadata": { "ttlInSeconds": "120" } }]' http://localhost:3601/v1.0/state/statestore
```

{{% /tab %}}

{{% tab "HTTP API (PowerShell)" %}}

```powershell
Invoke-RestMethod -Method Post -ContentType 'application/json' -Body '[{"key": "order_1", "value": "250", "metadata": {"ttlInSeconds": "120"}}]' -Uri 'http://localhost:3601/v1.0/state/statestore'
```

{{% /tab %}}

{{< /tabpane >}}

## 相关链接

- 查看[状态 API 参考指南]({{% ref state_api.md %}})。
- 了解[如何使用键值对持久化状态]({{% ref howto-get-save-state.md %}})。
- [状态存储 组件]({{% ref supported-state-stores %}})列表。
- 阅读[API 参考]({{% ref state_api.md %}})。
