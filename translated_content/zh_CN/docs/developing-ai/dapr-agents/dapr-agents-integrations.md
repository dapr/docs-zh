---
type: docs
title: "集成"
linkTitle: "集成"
weight: 60
description: "Dapr Agents 中可用的各种集成和工具"
aliases:
  - /developing-applications/dapr-agents/dapr-agents-integrations
---

# 开箱即用工具

## 文本分割器

文本分割器模块是 `Dapr Agents` 中的一个基础集成，专为 [检索增强生成（RAG）](https://en.wikipedia.org/wiki/Retrieval-augmented_generation) 工作流和其他 `上下文学习` 应用预处理文档而设计。其主要目的是将大型文档拆分为更小的、有意义的块，以便进行嵌入、索引和基于用户查询的高效检索。

通过关注可管理的块大小并通过重叠保留上下文完整性，文本分割器确保文档的处理方式能够支持问答、摘要和文档检索等下游任务。

### 为什么要使用文本分割器？

在构建 RAG 管道时，将文本拆分为更小的块有以下几个关键目的：

* **实现有效索引**：块被嵌入并存储在向量数据库中，使其能够基于与用户查询的相似性进行检索。
* **保持语义连贯性**：重叠的块有助于在分割之间保留上下文，确保系统能够连接相关信息。
* **处理模型限制**：许多模型有输入大小限制。拆分确保文本在这些限制范围内同时保持有意义。

这一步对于将知识准备为可嵌入的搜索格式至关重要，是基于检索的工作流的基础。

### 文本拆分策略

文本分割器支持多种策略来有效处理不同类型的文档。这些策略在每个块的大小和保持上下文的需求之间取得平衡。

#### 1. 基于字符的长度

* **工作原理**：计算每个块中的字符数。
* **适用场景**：简单有效，无需依赖外部分词工具即可进行文本拆分。

示例：

```python
from dapr_agents.document.splitter.text import TextSplitter

# 基于字符的分割器（默认）
splitter = TextSplitter(chunk_size=1024, chunk_overlap=200)
```

#### 2. 基于令牌的长度

* **工作原理**：计算令牌数量，即语言模型使用的语义单元（例如单词或子词）。
* **适用场景**：确保与 GPT 等模型的兼容性，令牌限制至关重要。

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

定义块大小函数的灵活性使文本分割器能够适应各种场景。

### 块重叠

为了保留上下文，文本分割器包含块重叠功能。这确保了一个块的部分内容延续到下一个块，有助于在顺序处理块时保持连续性。

示例：

* 当 `chunk_size=1024` 且 `chunk_overlap=200` 时，一个块的最后 `200` 个令牌或字符会出现在下一个块的开头。
* 这种设计有助于文本生成等任务，在这些任务中跨块保持上下文至关重要。

### 如何使用文本分割器

以下是使用文本分割器处理 PDF 文档的实用示例：

#### 步骤 1：加载 PDF

```python
import requests
from pathlib import Path

# Download PDF
pdf_url = "https://arxiv.org/pdf/2412.05265.pdf"
local_pdf_path = Path("arxiv_paper.pdf")

if not local_pdf_path.exists():
    response = requests.get(pdf_url)
    response.raise_for_status()
    with open(local_pdf_path, "wb") as pdf_file:
        pdf_file.write(response.content)
```

#### 步骤 2：读取文档

在此示例中，我们使用 Dapr Agents 的 `PyPDFReader`。

{{% alert title="注意" color="primary" %}}
PyPDF Reader 依赖于 [pypdf python 库](https://pypi.org/project/pypdf/)，该库未包含在 Dapr Agents 核心模块中。这一设计选择有助于保持模块化，避免为不需要此功能的用户添加不必要的依赖。要使用 PyPDF Reader，请确保单独安装该库。
{{% /alert %}}

```python
pip install pypdf
```

然后，初始化读取器以加载 PDF 文件。

```python
from dapr_agents.document.reader.pdf.pypdf import PyPDFReader

reader = PyPDFReader()
documents = reader.load(local_pdf_path)
```

#### 步骤 3：拆分文档

```python
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

### 关键特性

* **分层拆分**：按分隔符（例如段落）拆分文本，然后在需要时进一步细化块。
* **可自定义的块大小**：支持基于字符和基于令牌的长度函数。
* **重叠以保持上下文**：在下一个块中保留前一个块的部分内容以保持连续性。
* **元数据保留**：每个块保留元数据，如页码和起始/结束索引，以便于映射。

通过理解和利用 `文本分割器`，您可以有效地预处理大型文档，确保它们准备好在 RAG 管道等高级工作流中进行嵌入、索引和检索。

## Arxiv 获取器

`Dapr Agents` 中的 Arxiv 获取器模块提供了与 [arXiv API](https://info.arxiv.org/help/api/index.html) 交互的强大接口。它旨在帮助用户以编程方式搜索、检索和下载来自 arXiv 的科学论文。凭借高级查询功能、元数据提取和 PDF 文件下载支持，Arxiv 获取器非常适合处理学术文献的研究人员、开发人员团队。

### 为什么要使用 Arxiv 获取器？

Arxiv 获取器简化了访问研究论文的过程，提供以下功能：

* **自动化文献搜索**：按特定主题、关键词或作者查询 arXiv。
* **元数据检索**：提取结构化元数据，如标题、摘要、作者、类别和提交日期。
* **精确过滤**：按日期范围限制搜索结果（例如，检索某一领域的最新研究）。
* **PDF 下载**：获取论文的全文 PDF 以供离线使用。

### 如何使用 Arxiv 获取器

#### 步骤 1：安装所需模块

{{% alert title="注意" color="primary" %}}
Arxiv 获取器依赖于 arXiv API 的[轻量级 Python 封装](https://github.com/lukasschwab/arxiv.py)，该封装未包含在 Dapr Agents 核心模块中。这一设计选择有助于保持模块化，避免为不需要此功能的用户添加不必要的依赖。要使用 Arxiv 获取器，请确保单独安装该[库](https://pypi.org/project/arxiv/)。
{{% /alert %}}
```python
pip install arxiv
```

#### 步骤 2：初始化获取器

设置 `ArxivFetcher` 以开始与 arXiv API 交互。

```python
from dapr_agents.document import ArxivFetcher

# Initialize the fetcher
fetcher = ArxivFetcher()
```

#### 步骤 3：执行搜索

**基于查询字符串的基本搜索**

使用简单关键词搜索论文。结果以 Document 对象形式返回，每个对象包含：

* `text`：论文的摘要。
* `metadata`：结构化元数据，如标题、作者、类别和提交日期。

```python
# Search for papers related to "machine learning"
results = fetcher.search(query="machine learning", max_results=5)

# Display metadata and summaries
for doc in results:
    print(f"Title: {doc.metadata['title']}")
    print(f"Authors: {', '.join(doc.metadata['authors'])}")
    print(f"Summary: {doc.text}\n")
```

**高级查询**

使用 AND、OR 和 NOT 等逻辑运算符细化搜索，或执行特定字段搜索（如按作者搜索）。

示例：

搜索关于"agents"和"cybersecurity"的论文：

```python
results = fetcher.search(query="all:(agents AND cybersecurity)", max_results=10)
```

排除特定术语（例如"quantum"但不包括"computing"）：

```python
results = fetcher.search(query="all:(quantum NOT computing)", max_results=10)
```

搜索特定作者的论文：

```python
results = fetcher.search(query='au:"John Doe"', max_results=10)
```

**按日期过滤论文**

将搜索结果限制在特定时间范围内，例如过去 24 小时内提交的论文。

```python
from datetime import datetime, timedelta

# Calculate the date range
last_24_hours = (datetime.now() - timedelta(days=1)).strftime("%Y%m%d")
today = datetime.now().strftime("%Y%m%d")

# Search for recent papers
recent_results = fetcher.search(
    query="all:(agents AND cybersecurity)",
    from_date=last_24_hours,
    to_date=today,
    max_results=5
)

# Display metadata
for doc in recent_results:
    print(f"Title: {doc.metadata['title']}")
    print(f"Authors: {', '.join(doc.metadata['authors'])}")
    print(f"Published: {doc.metadata['published']}")
    print(f"Summary: {doc.text}\n")
```

#### 步骤 4：下载 PDF

获取论文的全文 PDF 以供离线使用。元数据与下载的文件一起保存。

```python
import os
from pathlib import Path

# Create a directory for downloads
os.makedirs("arxiv_papers", exist_ok=True)

# Download PDFs
download_results = fetcher.search(
    query="all:(agents AND cybersecurity)",
    max_results=5,
    download=True,
    dirpath=Path("arxiv_papers")
)

for paper in download_results:
    print(f"Downloaded Paper: {paper['title']}")
    print(f"File Path: {paper['file_path']}\n")
```

#### 步骤 5：提取和处理 PDF 内容

使用 `Dapr Agents` 的 `PyPDFReader` 从下载的 PDF 中提取内容。每一页被视为一个单独的 Document 对象，并附带元数据。

```python
from pathlib import Path
from dapr_agents.document import PyPDFReader

reader = PyPDFReader()
docs_read = []

for paper in download_results:
    local_pdf_path = Path(paper["file_path"])
    documents = reader.load(local_pdf_path, additional_metadata=paper)
    docs_read.extend(documents)

# Verify results
print(f"Extracted {len(docs_read)} documents.")
print(f"First document text: {docs_read[0].text}")
print(f"Metadata: {docs_read[0].metadata}")
```

### 实际应用

Arxiv 获取器为研究人员和开发人员实现了各种用例：

* **文献综述**：快速检索和组织关于给定主题或特定作者的相关论文。
* **趋势分析**：通过过滤近期提交内容来识别某一领域的最新研究。
* **离线研究工作流**：下载和处理 PDF 以供本地分析和归档。

### 下一步

虽然 Arxiv 获取器提供了检索和处理研究论文的强大功能，但其输出可以集成到高级工作流中：

* **构建可搜索的知识库**：将获取的论文与文本分割和向量嵌入等集成相结合，以实现高级搜索功能。
* **检索增强生成（RAG）**：使用处理后的论文作为 RAG 管道的输入，为问答系统提供支持。
* **自动化文献调查**：基于获取和处理后的研究生成摘要或见解。

## 向量存储

Dapr Agents 包含内置的向量存储实现，可用于 `ConversationVectorMemory` 和 RAG 管道。每个存储都可以从 `dapr_agents.storage.vectorstores` 获取。

### ChromaVectorStore

使用 [ChromaDB](https://www.trychroma.com/) 进行内存或持久化向量搜索。开发环境无需额外的基础设施。

```python
from dapr_agents.storage.vectorstores import ChromaVectorStore
from dapr_agents.document.embedder.openai import OpenAIEmbedder

store = ChromaVectorStore(
    collection_name="my_collection",
    embedding_function=OpenAIEmbedder(),
)
```

### PostgresVectorStore

使用 [PostgreSQL 和 pgvector](https://github.com/pgvector/pgvector) 进行生产级向量相似性搜索。

```python
from dapr_agents.storage.vectorstores import PostgresVectorStore
from dapr_agents.document.embedder.openai import OpenAIEmbedder

store = PostgresVectorStore(
    connection_string="postgresql://user:pass@localhost:5432/mydb",
    embedding_function=OpenAIEmbedder(),
    embedding_dimensions=1536,
)
```

### RedisVectorStore

通过 `redisvl` 库使用 [Redis Stack](https://redis.io/docs/latest/develop/ai/search-and-query/vectors/) 进行向量相似性搜索。

{{% alert title="注意" color="warning" %}}
`dapr init` 启动的 Redis 实例是**普通 Redis 服务器**，不包含 Redis Stack 所需的 Search/向量模块。要使用 `RedisVectorStore`，必须单独运行 [Redis Stack](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/)（或启用了 `RediSearch` 模块的 Redis 部署）。
{{% /alert %}

需要 `redisvl`（`pip install redisvl`）。

```python
from dapr_agents.storage.vectorstores import RedisVectorStore
from dapr_agents.document.embedder.openai import OpenAIEmbedder

store = RedisVectorStore(
    url="redis://localhost:6379",
    index_name="my_agent",
    embedding_function=OpenAIEmbedder(),
    embedding_dimensions=1536,
    distance_metric="cosine",  # "cosine", "l2", or "ip"
    storage_type="hash",       # "hash" or "json"
)
```

三种向量存储共享相同的接口，可互换地作为 `ConversationVectorMemory` 的 `vector_store` 参数使用：

```python
from dapr_agents.memory import ConversationVectorMemory

memory = ConversationVectorMemory(
    vector_store=store,
    distance_metric="cosine",
)
```

## 工具

### 将 Agent 作为工具

Dapr Agents 支持在 `DurableAgent` 推理循环中将其他 Agent 作为工具调用，包括来自其他框架的 Agent（如 OpenAI Agents、LangGraph 和 CrewAI）。有关完整文档和代码示例，请参阅 [将 Agent 作为工具]({{% ref "dapr-agents-core-concepts.md#agents-as-tools" %}})。

### 数据库的 MCP 工具箱

Dapr Agents 支持通过实现一个封装器来与 [MCP Toolbox for Databases](https://googleapis.github.io/genai-toolbox/getting-started/introduction/) 集成，该封装器将可用工具加载到 Dapr Agents 使用的 `Tool` 模型中。

要集成该工具箱，请按如下方式加载工具：

```python
from toolbox_core import ToolboxSyncClient
client = ToolboxSyncClient("http://127.0.0.1:5000")
agent_tools = AgentTool.from_toolbox_many(client.load_toolset("your-tools-name-here"))
agent = DurableAgent(
    ..
    tools=agent_tools
)

..
# Remember to close the tool
finally:
    client.close()
```

或将代码包装在 `with` 语句中：

```python
from toolbox_core import ToolboxSyncClient
with ToolboxSyncClient("http://127.0.0.1:5000") as client:
    agent_tools = AgentTool.from_toolbox_many(client.load_toolset("your-tools-name-here"))
    agent = DurableAgent(
        ..
        tools=agent_tools
    )
```
