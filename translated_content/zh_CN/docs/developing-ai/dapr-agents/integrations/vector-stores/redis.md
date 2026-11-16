---
type: docs
title: "Redis"
linkTitle: "Redis"
weight: 50
description: "使用内存或持久化的 Redis 存储执行相似性搜索"
---

通过 `redisvl` 库使用 [Redis Stack](https://redis.io/docs/latest/develop/ai/search-and-query/vectors/) 进行向量相似性搜索。

## 安装

{{% alert title="注意" color="primary" %}}
通过 `dapr init` 启动的 Redis 实例是**原版 Redis 服务器**，**不包含** Redis Stack 所需的搜索/向量模块。要使用 `RedisVectorStore`，你必须单独运行 [Redis Stack](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/)（或启用了 `RediSearch` 模块的 Redis 部署）。
{{% /alert %}}

{{< tabpane text=true >}}

{{% tab header="pip" %}}

```bash
pip install redisvl
```

{{% /tab %}}

{{% tab header="uv" %}}

```bash
uv add redisvl
```

{{% /tab %}}

{{< /tabpane >}}

## 使用

```python
from dapr_agents.storage.vectorstores import RedisVectorStore
from dapr_agents.document.embedder.openai import OpenAIEmbedder  # 替换为你的嵌入模型

store = RedisVectorStore(
    url="redis://localhost:6379",
    index_name="my_agent",
    embedding_function=OpenAIEmbedder(),
    embedding_dimensions=1536,
    distance_metric="cosine",  # "cosine"、"l2" 或 "ip"
    storage_type="hash",       # "hash" 或 "json"
)
```
