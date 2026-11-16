---
type: docs
title: "向量存储"
linkTitle: "向量存储"
weight: 60
description: "向量存储的集成"
---

Dapr Agents 内置了向量存储实现，可用于 `ConversationVectorMemory` 与 RAG 流水线。每种存储都可以从 `dapr_agents.storage.vectorstores` 导入。

向量存储共享相同的接口，可以作为 `ConversationVectorMemory` 的 `vector_store` 参数互换使用：

```python
from dapr_agents.storage.vectorstores import ChromaVectorStore  # 替换为你使用的向量存储
from dapr_agents.document.embedder.openai import OpenAIEmbedder  # 替换为你使用的嵌入模型
from dapr_agents.memory import ConversationVectorMemory

store = ChromaVectorStore(
    collection_name="my_collection",
    embedding_function=OpenAIEmbedder(),
)
memory = ConversationVectorMemory(
    vector_store=store,
    distance_metric="cosine",
)
```

为了让核心安装保持精简，向量存储的依赖必须单独安装。
