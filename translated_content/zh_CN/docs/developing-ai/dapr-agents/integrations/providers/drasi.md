---
type: docs
title: "Drasi"
linkTitle: "Drasi"
weight: 10
description: "Drasi 集成"
---

{{% alert title="注意" color="primary" %}}
此集成目前处于 alpha 阶段；重大变更可能随时发生。
{{% /alert %}}

Dapr Agents 中的 Drasi 扩展使 `DurableAgent` 的运行可以由 Drasi 事件触发。

## 为什么使用 Drasi？

许多系统需要近实时地响应其他系统产生的变化。传统轮询无法检测“没有变化”这一情况，也无法在不对源系统造成不必要负载的前提下捕获频率极高的变化（即便不考虑网络延迟）。原始变化通常不能直接利用，需要自定义的变更数据捕获（CDC）管道大规模处理这些变化，并把它们转换为有意义的领域事件。然而，这类管道若采用托管服务则成本高昂，若自托管则难以部署和维护。

对于许多用例而言，[Drasi](https://drasi.io/) 是一个可行的替代方案。Drasi 是一个 **CNCF Sandbox** 项目，它以围绕变化检测与响应构建的简单架构解决了上述问题：
- **Sources**：从现有系统中摄取变化
- **Queries**：允许在多种数据源之上定义高层的“业务条件”，当这些条件满足时发出事件
- **Reactions**：将事件推送给下游消费者

## 安装

{{< tabpane text=true >}}

{{% tab header="pip" %}}

```bash
pip install "dapr-agents[drasi]"
```

{{% /tab %}}

{{% tab header="uv" %}}

```bash
uv add dapr-agents[drasi]
```

{{% /tab %}}

{{< /tabpane >}}

## 用法

```python
from dapr_agents import AgentRunner, DurableAgent
from dapr_agents.agents.configs import AgentPubSubConfig

from dapr_agents.ext.drasi import drasi_trigger

agent = DurableAgent(
    name="InventoryAgent",
    pubsub=AgentPubSubConfig(
        pubsub_name="pubsub",           # 替换为你的 pub/sub component
        agent_topic="inventory-agent",  # 替换为你的代理 pub/sub 主题
    ),
)

drasi_trigger(
    agent,
    query_id="low-stock-products",      # 替换为你的 Drasi 查询 ID
)

AgentRunner().serve(agent)
```

## API

### `drasi_trigger`

`drasi_trigger` 会创建一个对 Drasi 查询的静态订阅，并允许代理通过 Dapr pub/sub 被 Drasi 事件触发。

#### 参数

参数 | 类型 | 必填 | 详情 | 示例
--------- | ---- | -------- | ------- | -------
`agent` | `DurableAgent` | 是 | 目标代理。 | 无
`query_id` | `str` | 是 | 要订阅的 Drasi 查询 ID。 | `"low-stock-products"`
`pubsub` | `str` | 否 | 要使用的 Dapr pub/sub component 名称。默认为代理的 pub/sub component。 | `"pubsub"`
`topic` | `str` | 否 | 要订阅的主题。默认为 `"drasi-events-" + query_id`。 | 无
`dead_letter_topic` | `str` | 否 | 用于发布处理失败消息的死信主题。 | `"low-stock-events-dlq"`
`task_mapper` | `Callable[[DrasiChangeEvent, MessageContext], TriggerAction]` | 否 | 用于将 Drasi 变更事件映射为代理任务消息的可调用对象。默认指示代理原样返回序列化后的 Drasi 事件。 | 无
`operations` | `DrasiOperation \| str \| list[DrasiOperation \| str]` | 否 | 用于过滤变更事件的 Drasi 操作。接受 `DrasiOperation` 或等价的字符串字面量。 | 无
`change_model` | `type[Any]` | 否 | 用于校验 Drasi 事件中变更数据的模型。 | 无

### `DrasiOperation`

`DrasiOperation` 是一个枚举，表示受支持的 Drasi 变更操作。

#### 操作

操作 | 值 | 详情
--------- | ----- | -------
`DrasiOperation.i` | `"i"` | 记录被添加到 Drasi 查询所跟踪的结果集中。
`DrasiOperation.u` | `"u"` | 记录在 Drasi 查询所跟踪的结果集中被更新。
`DrasiOperation.d` | `"d"` | 记录从 Drasi 查询所跟踪的结果集中被删除。

### `DrasiChangeEvent`

`DrasiChangeEvent` 是一个 Pydantic 模型，表示查询发出的变更事件。

#### 属性

属性 | 类型 | 必填 | 详情 | 示例
--------- | ---- | -------- | ------- | -------
`op` | `DrasiOperation` | 是 | 变更事件的操作（插入、更新、删除）。 | `DrasiOperation.u`
`ts_ms` | `int` | 是 | 变更事件的时间戳，单位为毫秒。 | `42`
`seq` | `int` | 是 | 变更事件的序列号。 | `1`
`payload` | `dict[str, Any]` | 是 | 变更事件的变更数据。 | `{"source": {"queryId": "low-stock-products", "ts_ms": 42}, "before": {"a": 1}, "after": {"a": 2}}`

#### 示例结构

```json
{
    "op": "u",
    "ts_ms": 42,
    "seq": 1,
    "payload": {
        "source": {
            "queryId": "low-stock-products",
            "ts_ms": 42
        },
        "before": {"a": 1},
        "after": {"a": 2}
    }
}
```

## 示例

查看 [扩展示例]({{< ref "developing-ai/dapr-agents/dapr-agents-quickstarts.md#extension-examples" >}})，获取 Drasi 扩展的可用示例列表。
