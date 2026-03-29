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
| `actorScanInterval` | 扫描需要停用的空闲 Actor 的频率。空闲时间超过 `actor_idle_timeout` 的 Actor 将被停用。 | 30 秒 |
| `drainOngoingCallTimeout` | 正在迁移重平衡 Actor 时的持续时间。这指定了当前活动 Actor 方法完成的超时时间。如果没有当前 Actor 方法调用，则忽略此参数。 | 60 秒 |
| `drainRebalancedActors` | 如果为 true，Dapr 将等待 `drainOngoingCallTimeout` 持续时间，以允许当前 Actor 调用完成，然后再尝试停用 Actor。 | true |
| `reentrancy` (`ActorReentrancyConfig`) | 配置 Actor 的重入行为。如果未提供，则禁用重入。 | 禁用，false |
| `entitiesConfig` | 使用配置数组为每个 Actor 类型单独配置。在各个实体配置中指定的任何实体也必须在顶层 `entities` 字段中指定。 | N/A |

## 示例

{{< tabpane text=true >}}

{{% tab ".NET" %}}
```csharp
// In Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    // Register actor runtime with DI
    services.AddActors(options =>
    {
        // Register actor types and configure actor settings
        options.Actors.RegisterActor<MyActor>();

        // Configure default settings
        options.ActorIdleTimeout = TimeSpan.FromMinutes(60);
        options.ActorScanInterval = TimeSpan.FromSeconds(30);
        options.DrainOngoingCallTimeout = TimeSpan.FromSeconds(60);
        options.DrainRebalancedActors = true;
        options.ReentrancyConfig = new() { Enabled = false };

        // Add a configuration for a specific actor type.
        // This actor type must have a matching value in the base level 'entities' field. If it does not, the configuration will be ignored.
        // If there is a matching entity, the values here will be used to overwrite any values specified in the root configuration.
        // In this example, `ReentrantActor` has reentrancy enabled; however, 'MyActor' will not have reentrancy enabled.
        options.Actors.RegisterActor<ReentrantActor>(typeOptions: new()
        {
            ReentrancyConfig = new()
            {
                Enabled = true,
            }
        });
    });

    // Register additional services for use with actors
    services.AddSingleton<BankService>();
}
```
[参阅 .NET SDK 关于注册 Actor 的文档]({{% ref "dotnet-actors-usage#registring-actors" %}}).

{{% /tab %}}

{{% tab "JavaScript" %}}
```js
import { CommunicationProtocolEnum, DaprClient, DaprServer } from "@dapr/dapr";

// Configure the actor runtime with the DaprClientOptions.
const clientOptions = {
  actor: {
    actorIdleTimeout: "1h",
    actorScanInterval: "30s",
    drainOngoingCallTimeout: "1m",
    drainRebalancedActors: true,
    reentrancy: {
      enabled: true,
      maxStackDepth: 32,
    },
  },
};

// Use the options when creating DaprServer and DaprClient.

// Note, DaprServer creates a DaprClient internally, which needs to be configured with clientOptions.
const server = new DaprServer(serverHost, serverPort, daprHost, daprPort, clientOptions);

const client = new DaprClient(daprHost, daprPort, CommunicationProtocolEnum.HTTP, clientOptions);
```

[参阅使用 JavaScript SDK 编写 Actor 的文档]({{% ref "js-actors#registering-actors" %}}).

{{% /tab %}}


% tab "Python" %}}

```python
from datetime import timedelta
from dapr.actor.runtime.config import ActorRuntimeConfig, ActorReentrancyConfig

ActorRuntime.set_actor_config(
    ActorRuntimeConfig(
        actor_idle_timeout=timedelta(hours=1),
        actor_scan_interval=timedelta(seconds=30),
        drain_ongoing_call_timeout=timedelta(minutes=1),
        drain_rebalanced_actors=True,
        reentrancy=ActorReentrancyConfig(enabled=False),
    )
)
```

[参阅使用 Python SDK 运行 Actor 的文档]({{% ref "python-actor" %}})

{{% /tab %}}


% tab "Java" %}}

```java
// import io.dapr.actors.runtime.ActorRuntime;
// import java.time.Duration;

ActorRuntime.getInstance().getConfig().setActorIdleTimeout(Duration.ofMinutes(60));
ActorRuntime.getInstance().getConfig().setActorScanInterval(Duration.ofSeconds(30));
ActorRuntime.getInstance().getConfig().setDrainOngoingCallTimeout(Duration.ofSeconds(60));
ActorRuntime.getInstance().getConfig().setDrainBalancedActors(true);
ActorRuntime.getInstance().getConfig().setActorReentrancyConfig(false, null);
```

[参阅使用 Java SDK 编写 Actor 的文档]({{% ref "java#actors" %}}).

{{% /tab %}}


% tab "Go" %}}
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
            // Add a configuration for a specific actor type.
            // This actor type must have a matching value in the base level 'entities' field. If it does not, the configuration will be ignored.
            // If there is a matching entity, the values here will be used to overwrite any values specified in the root configuration.
            // In this example, `reentrantActorType` has reentrancy enabled; however, 'defaultActorType' will not have reentrancy enabled.
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


/tabpane >}}

## 相关链接

- 参阅 [Dapr SDK 文档和示例]({{% ref "developing-applications/sdks/_index.md#sdk-languages" %}})。
- [Actor API 参考]({{% ref actors_api %}})
- [Actor 概述]({{% ref actors-overview %}})
