---
type: docs
title: "Chroma"
linkTitle: "Chroma"
weight: 10
description: "使用内存或持久化的 Chroma 存储执行相似性搜索"
---

使用 [ChromaDB](https://www.trychroma.com/) 进行内存或持久化的向量搜索。

## 安装

{{< tabpane text=true >}}

{{% tab header="pip" %}}

```bash
pip install chromadb
```

{{% /tab %}}

{{% tab header="uv" %}}

```bash
uv add chromadb
```

{{% /tab %}}

{{< /tabpane >}}

## 用法

```python
from dapr_agents.storage.vectorstores import ChromaVectorStore
from dapr_agents.document.embedder.openai import OpenAIEmbedder  # 替换为你的嵌入模型

store = ChromaVectorStore(
    collection_name="my_collection",
    embedding_function=OpenAIEmbedder(),
)
```
