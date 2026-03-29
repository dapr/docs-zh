---
type: docs
title: "操作指南：在应用程序之间共享状态"
linkTitle: "操作指南：在应用程序之间共享状态"
weight: 400
description: "了解在不同应用程序之间共享状态的策略"
---

Dapr 提供了多种在应用程序之间共享状态的方式。

不同的架构在共享状态方面可能有不同的需求。在一种场景中，你可能希望：

- 将所有状态封装在给定应用程序内
- 让 Dapr 为你管理访问权限

在另一种场景中，你可能需要两个应用程序同时操作相同的状态，获取和保存相同的键。

为启用状态共享，Dapr 支持以下键前缀策略：

| 键前缀 | 描述 |
| ------------ | ----------- |
| `appid` | 默认策略，允许你仅通过具有指定 `appid` 的应用程序管理状态。所有状态键都将以 `appid` 为前缀，并限定在该应用程序范围内。 |
| `name` | 使用状态存储组件的名称作为前缀。多个应用程序可以共享给定状态存储的相同状态。 |
| `namespace` | 如果设置，此设置会将 `appid` 键加上配置的命名空间作为前缀，从而得到一个限定在给定命名空间范围内的键。这允许具有相同 `appid` 但在不同命名空间中的应用重用相同的状态存储。如果未配置命名空间，该设置会回退到 `appid` 策略。有关 Dapr 中命名空间的更多信息，请参阅[操作指南：将组件限定到一个或多个应用程序]({{% ref component-scopes.md %}}) |
| `none` | 不使用前缀。多个应用程序在不同状态存储之间共享状态。 |

## 指定状态前缀策略

要指定前缀策略，请在状态组件上添加名为 `keyPrefix` 的元数据键：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
  - name: keyPrefix
    value: <key-prefix-strategy>
```

## 示例

以下示例演示了使用每种支持的前缀策略进行状态检索的情况。

### `appid`（默认）

在下面的示例中，应用程序 ID 为 `myApp` 的 Dapr 应用程序正在将状态保存到名为 `redis` 的状态存储中：

```shell
curl -X POST http://localhost:3500/v1.0/state/redis \
  -H "Content-Type: application/json"
  -d '[
        {
          "key": "darth",
          "value": "nihilus"
        }
      ]'
```

该键将保存为 `myApp||darth`。

### `namespace`

在命名空间 `production` 中运行、应用程序 ID 为 `myApp` 的 Dapr 应用程序正在将状态保存到名为 `redis` 的状态存储中：

```shell
curl -X POST http://localhost:3500/v1.0/state/redis \
  -H "Content-Type: application/json"
  -d '[
        {
          "key": "darth",
          "value": "nihilus"
        }
      ]'
```

该键将保存为 `production.myApp||darth`。

### `name`

在下面的示例中，应用程序 ID 为 `myApp` 的 Dapr 应用程序正在将状态保存到名为 `redis` 的状态存储中：

```shell
curl -X POST http://localhost:3500/v1.0/state/redis \
  -H "Content-Type: application/json"
  -d '[
        {
          "key": "darth",
          "value": "nihilus"
        }
      ]'
```

该键将保存为 `redis||darth`。

### `none`

在下面的示例中，应用程序 ID 为 `myApp` 的 Dapr 应用程序正在将状态保存到名为 `redis` 的状态存储中：

```shell
curl -X POST http://localhost:3500/v1.0/state/redis \
  -H "Content-Type: application/json"
  -d '[
        {
          "key": "darth",
          "value": "nihilus"
        }
      ]'
```

该键将保存为 `darth`。
