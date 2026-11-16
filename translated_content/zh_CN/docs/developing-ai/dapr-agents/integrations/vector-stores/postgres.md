---
type: docs
title: "Postgres"
linkTitle: "Postgres"
weight: 30
description: "使用持久化的 Postgres 存储执行相似性搜索"
---

使用 [带 pgvector 的 Postgres](https://github.com/pgvector/pgvector) 进行生产级的向量相似性搜索。

## 安装

{{< tabpane text=true >}}

{{% tab header="pip" %}}

```bash
pip install "psycopg[binary,pool]" pgvector
```

{{% /tab %}}

{{% tab header="uv" %}}

```bash
uv add 'psycopg[binary,pool]' pgvector
```

{{% /tab %}}

{{< /tabpane >}}

## 用法

```python
from dapr_agents.storage.vectorstores import PostgresVectorStore
from dapr_agents.document.embedder.openai import OpenAIEmbedder  # 替换为你使用的嵌入模型

store = PostgresVectorStore(
    connection_string="postgresql://user:pass@localhost:5432/mydb",
    embedding_function=OpenAIEmbedder(),
    embedding_dimensions=1536,
)
```
