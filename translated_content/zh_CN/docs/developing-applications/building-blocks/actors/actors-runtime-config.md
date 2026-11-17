---
type: docs
title: "Actor 运行时配置参数"
linkTitle: "运行时配置"
weight: 30
description: 修改默认的 Dapr Actor 运行时配置行为
---

您可以使用以下配置参数修改默认的 Dapr Actor 运行时行为。

| 参数 | 描述 | 默认值 |
| --------- | ----------- | ------- |
| `entities` | 此主机支持的 Actor 类型。 | N/A |
| `actorIdleTimeout` | 停用空闲 Actor 前的超时时间。每隔 `actorScanInterval` 间隔检查一次超时。 | 60 分钟 |
| `actorScanInterval` | 扫描需要停用的空闲 Actor 的频率。空闲时间超过 actor_idle_timeout 的 Actor 将被停用。 | 30 秒 |
| `drainOngoingCallTimeout` | 迁移重平衡 Actor 时 draining 进行中调用的超时时间。它指定当前活动 Actor 方法调用完成的超时时间。如果当前没有 Actor 方法调用，则忽略此参数。其生效值会根据 placement dissemination 超时时间进行 clamped（参见[Drain 超时 clamping](#drain-超时-clamping)）。 | 2 秒 |
| `drainRebalancedActors` | 如果为 true，Dapr 将等待 `drainOngoingCallTimeout` 时长，以允许当前 Actor 调用完成，然后再尝试停用 Actor。 | true |
| `reentrancy` (`ActorReentrancyConfig`) | 配置 Actor 的重入行为。如果未提供，则禁用重入。 | 禁用，false |
| `entitiesConfig` | 使用配置数组为每个 Actor 类型单独配置。在各个实体配置中指定的任何实体也必须在顶层 `entities` 字段中指定。每个实体的 `drainOngoingCallTimeout` 值同样会生效，并受与顶层值相同的 clamping 规则约束。 | N/A |

## Drain 超时 clamping

在 placement dissemination 轮次中，当 Actor 被重新平衡到新主机时（例如滚动升级），Dapr sidecar（daprd）会在至多 `drainOngoingCallTimeout` 配置的时长内，drains 被重新平衡的 Actor 类型的所有进行中请求，然后才会强制取消剩余的 Actor 请求。draining 期间，daprd 会延迟确认 placement 表的更新，因此过长的 drain 超时可能会拖慢整个 dissemination 轮次。

此 drain 窗口受两个不同的 dissemination 超时时间约束：

- daprd 的 dissemination 超时时间，通过 `--actors-disseminate-timeout` 参数（`dapr.io/actors-disseminate-timeout` 注解）设置，默认为 30 秒。如果一轮分发超过该时间，daprd 会重置自身的 placement gRPC 流，并停止其承载的 Actor。
- Placement 服务的 dissemination 超时时间，通过 placement 的 `--disseminate-timeout` 参数（`dapr_placement.disseminateTimeout` Helm 值）设置，默认为 8 秒。在此期限内未确认更新的 Dapr sidecar 会被视为无响应，其 gRPC 流会被 Placement 重置。

{{% alert title="注意" color="primary" %}}
在默认设置下，Placement 服务的 8 秒期限总是先触发，因为它远低于 daprd 的 30 秒。daprd 侧的超时是一道兜底：当 dissemination 轮次卡住时（例如 Placement 服务在轮次中途失去响应），它能让 daprd 自行发现并恢复，方式是重置流并停止其承载的 Actor。
{{% /alert %}}

自 Dapr v1.17.7 起，Dapr sidecar 会将*生效的* drain 超时时间与其自身的 dissemination 超时时间进行比对并 clamps：

- 如果 `drainOngoingCallTimeout` 小于 `actors-disseminate-timeout`，则原样使用配置的值。
- 如果 `drainOngoingCallTimeout` 大于或等于 `actors-disseminate-timeout`，daprd 会记录一条警告，并将生效值降低为该 dissemination 超时时间的 **80%**，且下限为 2 秒。使用默认的 30 秒 dissemination 超时时间时，clamp 上限为 24 秒。默认的 2 秒 drain 超时时间永远不会被 clamped，它只作用于显式配置的值。

clamp 同时作用于两个注册位置：全局的 `drainOngoingCallTimeout`，以及通过 SDK 在 `entitiesConfig` 下设置的各 Actor 类型 `drainOngoingCallTimeout`。应用通过 Actor 配置端点上报给 daprd 的配置值保持不变，只有 drain 期间实际使用的生效值会被 clamped。

clamping 只能保护 daprd 不会重置自身的 placement 流。如果 drain 超时未被 clamped，它仍可能超过 Placement 服务的 dissemination 超时时间（默认 8 秒），这时 Placement 会将该 sidecar 移出本轮分发并重置其 gRPC 流，从而产生大量无谓的重连和重新调度。建议将 `drainOngoingCallTimeout` 保持在 Placement 的 `disseminateTimeout` 之下并留有余量（例如 5 秒或更低），或者提高 `dapr_placement.disseminateTimeout` 以容纳更长的 drain 时间。

大多数 Dapr SDK 在应用未显式配置时会保持 `drainOngoingCallTimeout` 未设置，因此使用默认的 2 秒。.NET Actors.Next SDK 是例外：它默认设置为 30 秒，恰好位于 clamp 边界上，因此请显式配置一个更小的值。

> **注意：** 此处讨论的 daprd 侧 placement dissemination 超时时间（默认 30 秒）与 control plane 的 dissemination 轮次超时时间不同：一是 Placement 服务上的 `dapr_placement.disseminateTimeout`，二是 [Scheduler 承载 placement 时]({{% ref "placement#serving-placement-from-the-scheduler-service" %}}) Scheduler 上的 `--placement-disseminate-timeout`。两者默认均为 `8s`。

## Pod 终止时的 Draining

`drainOngoingCallTimeout` 和 `drainRebalancedActors` 只有在 sidecar 仍能访问你的应用时才会生效。在 Kubernetes 上，使用默认的 sidecar 注入时，两个容器会同时收到 `SIGTERM`，因此如果应用迅速退出，那么在 sidecar drains 之前应用已经不存在，这两项设置便无从作用。使用原生 sidecar 时，应用总是先于 sidecar 被终止。请配置应用容器，使其存活时间超过 sidecar 的关闭过程：参见 [Actor 宿主的优雅关闭]({{% ref "kubernetes-production.md#graceful-shutdown-for-actor-hosts" %}})。

## 示例

{{< tabpane text=true >}}

{{% tab ".NET" %}}
```csharp
// In Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    // 向 DI 注册 Actor 运行时
    services.AddActors(options =>
    {
        // 注册 Actor 类型并配置 Actor 设置
        options.Actors.RegisterActor<MyActor>();

        // 配置默认设置
        options.ActorIdleTimeout = TimeSpan.FromMinutes(60);
        options.ActorScanInterval = TimeSpan.FromSeconds(30);
        options.DrainOngoingCallTimeout = TimeSpan.FromSeconds(5);
        options.DrainRebalancedActors = true;
        options.ReentrancyConfig = new() { Enabled = false };

        // 为特定 Actor 类型添加配置。
        // 该 Actor 类型必须在顶层 'entities' 字段中有对应的值，否则该配置将被忽略。
        // 如果存在对应的实体，此处的值将覆盖根配置中指定的值。
        // 在此示例中，`ReentrantActor` 启用了重入；而 'MyActor' 则不启用重入。
        options.Actors.RegisterActor<ReentrantActor>(typeOptions: new()
        {
            ReentrancyConfig = new()
            {
                Enabled = true,
            }
        });
    });

    // 注册与 Actor 配合使用的其他服务
    services.AddSingleton<BankService>();
}
```
[参阅 .NET SDK 关于注册 Actor 的文档]({{% ref "dotnet-actors-usage#registring-actors" %}}).

{{% /tab %}}

{{% tab "JavaScript" %}}

<!--javascript-->

```js
import { CommunicationProtocolEnum, DaprClient, DaprServer } from "@dapr/dapr";

// 使用 DaprClientOptions 配置 Actor 运行时。
const clientOptions = {
  actor: {
    actorIdleTimeout: "1h",
    actorScanInterval: "30s",
    drainOngoingCallTimeout: "5s",
    drainRebalancedActors: true,
    reentrancy: {
      enabled: true,
      maxStackDepth: 32,
    },
  },
};

// 创建 DaprServer 和 DaprClient 时使用这些选项。

// 注意：DaprServer 内部会创建一个 DaprClient，它需要使用 clientOptions 进行配置。
const server = new DaprServer(serverHost, serverPort, daprHost, daprPort, clientOptions);

const client = new DaprClient(daprHost, daprPort, CommunicationProtocolEnum.HTTP, clientOptions);
```

[参阅使用 JavaScript SDK 编写 Actor 的文档]({{% ref "js-actors#registering-actors" %}}).

{{% /tab %}}

{{% tab "Python" %}}

<!--python-->

```python
from datetime import timedelta
from dapr.actor.runtime.config import ActorRuntimeConfig, ActorReentrancyConfig

ActorRuntime.set_actor_config(
    ActorRuntimeConfig(
        actor_idle_timeout=timedelta(hours=1),
        actor_scan_interval=timedelta(seconds=30),
        drain_ongoing_call_timeout=timedelta(seconds=5),
        drain_rebalanced_actors=True,
        reentrancy=ActorReentrancyConfig(enabled=False),
    )
)
```

[参阅使用 Python SDK 运行 Actor 的文档]({{% ref "python-actor" %}})

{{% /tab %}}

{{% tab "Java" %}}

<!--java-->

```java
// import io.dapr.actors.runtime.ActorRuntime;
// import java.time.Duration;

ActorRuntime.getInstance().getConfig().setActorIdleTimeout(Duration.ofMinutes(60));
ActorRuntime.getInstance().getConfig().setActorScanInterval(Duration.ofSeconds(30));
ActorRuntime.getInstance().getConfig().setDrainOngoingCallTimeout(Duration.ofSeconds(5));
ActorRuntime.getInstance().getConfig().setDrainBalancedActors(true);
ActorRuntime.getInstance().getConfig().setActorReentrancyConfig(false, null);
```

[参阅使用 Java SDK 编写 Actor 的文档]({{% ref "java#actors" %}}).

{{% /tab %}}

{{% tab "Go" %}}
<!--go-->

```go
const (
    defaultActorType = "basicType"
    reentrantActorType = "reentrantType"
)

type daprConfig struct {
	Entities                []string                `json:"entities,omitempty"`
	ActorIdleTimeout        string                  `json:"actorIdleTimeout,omitempty"`
	ActorScanInterval       string                  `json:"actorScanInterval,omitempty"`
	DrainOngoingCallTimeout string                  `json:"drainOngoingCallTimeout,omitempty"`
	DrainRebalancedActors   bool                    `json:"drainRebalancedActors,omitempty"`
	Reentrancy              config.ReentrancyConfig `json:"reentrancy,omitempty"`
	EntitiesConfig          []config.EntityConfig   `json:"entitiesConfig,omitempty"`
}

var daprConfigResponse = daprConfig{
	Entities:                []string{defaultActorType, reentrantActorType},
	ActorIdleTimeout:        actorIdleTimeout,
	ActorScanInterval:       actorScanInterval,
	DrainOngoingCallTimeout: drainOngoingCallTimeout,
	DrainRebalancedActors:   drainRebalancedActors,
	Reentrancy:              config.ReentrancyConfig{Enabled: false},
	EntitiesConfig: []config.EntityConfig{
		{
            // 为特定 Actor 类型添加配置。
            // 该 Actor 类型必须在顶层 'entities' 字段中有对应的值，否则该配置将被忽略。
            // 如果存在对应的实体，此处的值将覆盖根配置中指定的值。
            // 在此示例中，`reentrantActorType` 启用了重入；而 'defaultActorType' 则不启用重入。
			Entities: []string{reentrantActorType},
			Reentrancy: config.ReentrancyConfig{
				Enabled:       true,
				MaxStackDepth: &maxStackDepth,
			},
		},
	},
}

func configHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(daprConfigResponse)
}
```

[参阅使用 Go SDK 的 Actor 示例](https://github.com/dapr/go-sdk/tree/main/examples/actor).

{{% /tab %}}

{{< /tabpane >}}

## 相关链接

- 参阅 [Dapr SDK 文档和示例]({{% ref "developing-applications/sdks/_index.md#sdk-languages" %}})。
- [Actor API 参考]({{% ref actors_api %}})
- [Actor 概述]({{% ref actors-overview %}})
