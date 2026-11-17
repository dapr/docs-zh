---
type: docs
title: "文本"
linkTitle: "文本"
weight: 10
description: "将文本文档切分为块"
---

Text Splitter 模块是 Dapr Agents 中的一项基础集成，用于预处理文档，以便在 [检索增强生成（RAG）](https://en.wikipedia.org/wiki/Retrieval-augmented_generation) workflow 及其他上下文学习应用中使用。它的主要作用是把大型文档切分为较小的、有意义的块，使这些块可以被嵌入、建立索引，并根据用户查询高效地检索。

通过关注可管理的块大小，并借助重叠来保持上下文的完整性，Text Splitter 能够以支持下游任务（例如问答、摘要和文档检索）的方式处理文档。

### 为什么要使用文本切分器？

在构建 RAG 管道时，将文本切分为较小的块有以下几个关键作用：

* **支持高效索引**：块会被嵌入并存储到向量数据库中，从而可以根据与用户查询的相似度进行检索。
* **保持语义连贯**：重叠的块有助于在各个切分之间保留上下文，确保系统能够关联相关的信息片段。
* **应对模型限制**：许多模型都有输入长度上限。切分可以确保文本符合这些限制，同时保持其意义完整。

这一步对于把知识整理成可嵌入、可检索的格式至关重要，是基于检索的 workflow 的基础。

### 文本切分策略

Text Splitter 支持多种策略，以有效处理不同类型的文档。这些策略需要在每个块的大小与保持上下文之间取得平衡。

#### 1. 基于字符数的长度

* **工作方式**：统计每个块中的字符数。
* **适用场景**：简单有效，无需依赖外部分词工具即可进行文本切分。

示例：

```python
from dapr_agents.document.splitter.text import TextSplitter

# 基于字符的切分器（默认）
splitter = TextSplitter(chunk_size=1024, chunk_overlap=200)
```

#### 2. 基于词元（Token）数的长度

* **工作方式**：统计词元（Token）的数量。词元是语言模型使用的语义单位，例如单词或子词。
* **适用场景**：确保与 GPT 等对词元上限有严格要求的模型兼容。

**示例**：

```python
import tiktoken
from dapr_agents.document.splitter.text import TextSplitter

enc = tiktoken.get_encoding("cl100k_base")

def length_function(text: str) -> int:
    return len(enc.encode(text))

splitter = TextSplitter(
    chunk_size=1024,
    chunk_overlap=200,
    chunk_size_function=length_function
)
```

通过自定义块大小的计算函数，Text Splitter 能够适应各种不同的场景。

### 块重叠

为了保留上下文，Text Splitter 提供了块重叠功能。它确保一个块的部分内容会延续到下一个块中，从而在按顺序处理各个块时保持连贯性。

示例：

* 当 `chunk_size=1024` 且 `chunk_overlap=200` 时，一个块的最后 `200` 个词元或字符会出现在下一个块的开头。
* 这一设计有助于文本生成等任务，这类任务中保持跨块的上下文至关重要。

### 如何使用 Text Splitter

下面是使用 Text Splitter 处理 PDF 文档的实际示例：

#### 步骤 1：加载 PDF

```python
import requests
from pathlib import Path

# 下载 PDF
pdf_url = "https://arxiv.org/pdf/2412.05265.pdf"
local_pdf_path = Path("arxiv_paper.pdf")

if not local_pdf_path.exists():
    response = requests.get(pdf_url)
    response.raise_for_status()
    with open(local_pdf_path, "wb") as pdf_file:
        pdf_file.write(response.content)
```

#### 步骤 2：读取文档

在本示例中，我们使用 Dapr Agents 的 `PyPDFReader`。

{{% alert title="注意" color="primary" %}}
PyPDF Reader 依赖 [pypdf Python 库](https://pypi.org/project/pypdf/)，该库不包含在 Dapr Agents 核心模块中。这一设计有助于保持模块化，并避免为不需要该功能的用户添加不必要的依赖。要使用 PyPDF Reader，请单独安装该库。
{{% /alert %}}

{{< tabpane text=true >}}

{{% tab header="pip" %}}

```bash
pip install pypdf
```

{{% /tab %}}

{{% tab header="uv" %}}

```bash
uv add pypdf
```

{{% /tab %}}

{{< /tabpane >}}

然后，初始化 reader 以加载 PDF 文件。

```python
from dapr_agents.document.reader.pdf.pypdf import PyPDFReader

reader = PyPDFReader()
documents = reader.load(local_pdf_path)
```

#### 步骤 3：切分文档

```python
import tiktoken
from dapr_agents.document.splitter.text import TextSplitter

enc = tiktoken.get_encoding("cl100k_base")

def length_function(text: str) -> int:
    return len(enc.encode(text))

splitter = TextSplitter(
    chunk_size=1024,
    chunk_overlap=200,
    chunk_size_function=length_function
)
chunked_documents = splitter.split_documents(documents)
```

#### 步骤 4：分析结果

```python
print(f"Original document pages: {len(documents)}")
print(f"Total chunks: {len(chunked_documents)}")
print(f"First chunk: {chunked_documents[0]}")
```

### 主要特性

* **分层切分**：先按分隔符（例如段落）切分文本，必要时再进一步细化块。
* **可自定义块大小**：支持基于字符和基于词元的长度计算函数。
* **通过重叠保留上下文**：将一个块的部分内容保留到下一个块中，以保持连贯性。
* **metadata 保留**：每个块都会保留页码、起止索引等 metadata，便于建立映射。

理解并善用 `Text Splitter`，你就能有效地预处理大型文档，使其为在 RAG 管道等高级 workflow 中进行嵌入、索引和检索做好准备。
