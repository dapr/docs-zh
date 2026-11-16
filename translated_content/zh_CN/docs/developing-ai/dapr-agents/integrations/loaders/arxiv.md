---
type: docs
title: "arXiv"
linkTitle: "arXiv"
weight: 10
description: "使用 arXiv API 加载研究论文"
---

Dapr Agents 中的 Arxiv Fetcher 模块提供了一个功能强大的接口，用于与 [arXiv API](https://info.arxiv.org/help/api/index.html) 交互。它旨在帮助用户以编程方式在 arXiv 上搜索、检索和下载科学论文。凭借高级查询能力、元数据提取以及对 PDF 文件下载的支持，Arxiv Fetcher 非常适合研究人员、开发者以及从事学术文献工作的团队。

### 为什么使用 Arxiv Fetcher？

Arxiv Fetcher 简化了获取研究论文的过程，提供以下功能：

* **自动化文献搜索**：按主题、关键词或作者查询 arXiv。
* **元数据检索**：提取结构化元数据，例如标题、摘要、作者、类别和提交日期。
* **精确过滤**：按日期范围限制搜索结果（例如获取某个领域的最新研究）。
* **PDF 下载**：获取论文的完整 PDF，以便离线阅读。

### 如何使用 Arxiv Fetcher

#### 步骤 1：安装所需模块

{{% alert title="注意" color="primary" %}}
Arxiv Fetcher 依赖于一个[轻量级 Python 封装库](https://github.com/lukasschwab/arxiv.py)来访问 arXiv API，该库不包含在 Dapr Agents 核心模块中。这一设计有助于保持模块化，并避免为不需要此功能的用户增加不必要的依赖。要使用 Arxiv Fetcher，请确保另行安装该[库](https://pypi.org/project/arxiv/)。
{{% /alert %}}

{{< tabpane text=true >}}

{{% tab header="pip" %}}

```bash
pip install arxiv
```

{{% /tab %}}

{{% tab header="uv" %}}

```bash
uv add arxiv
```

{{% /tab %}}

{{< /tabpane >}}

#### 步骤 2：初始化 Fetcher

设置 `ArxivFetcher`，开始与 arXiv API 交互。

```python
from dapr_agents.document import ArxivFetcher

# 初始化 fetcher
fetcher = ArxivFetcher()
```

#### 步骤 3：执行搜索

**基于查询字符串的基本搜索**

使用简单的关键词搜索论文。结果以 Document 对象的形式返回，每个对象包含：

* `text`：论文的摘要。
* `metadata`：结构化元数据，例如标题、作者、类别和提交日期。

```python
# 搜索与 "machine learning" 相关的论文
results = fetcher.search(query="machine learning", max_results=5)

# 显示元数据和摘要
for doc in results:
    print(f"Title: {doc.metadata['title']}")
    print(f"Authors: {', '.join(doc.metadata['authors'])}")
    print(f"Summary: {doc.text}\n")
```

**高级查询**

使用 AND、OR、NOT 等逻辑运算符优化搜索，或执行特定字段的搜索，例如按作者搜索。

示例：

搜索同时包含 "agents" 和 "cybersecurity" 的论文：

```python
results = fetcher.search(query="all:(agents AND cybersecurity)", max_results=10)
```

排除特定词（例如包含 "quantum" 但不包含 "computing" 的论文）：

```python
results = fetcher.search(query="all:(quantum NOT computing)", max_results=10)
```

按特定作者搜索论文：

```python
results = fetcher.search(query='au:"John Doe"', max_results=10)
```

**按日期过滤论文**

将搜索结果限制在特定的时间范围内，例如最近 24 小时内提交的论文。

```python
from datetime import datetime, timedelta

# 计算日期范围
last_24_hours = (datetime.now() - timedelta(days=1)).strftime("%Y%m%d")
today = datetime.now().strftime("%Y%m%d")

# 搜索最新论文
recent_results = fetcher.search(
    query="all:(agents AND cybersecurity)",
    from_date=last_24_hours,
    to_date=today,
    max_results=5
)

# 显示元数据
for doc in recent_results:
    print(f"Title: {doc.metadata['title']}")
    print(f"Authors: {', '.join(doc.metadata['authors'])}")
    print(f"Published: {doc.metadata['published']}")
    print(f"Summary: {doc.text}\n")
```

#### 步骤 4：下载 PDF

获取论文的完整 PDF，以便离线使用。元数据会与下载的文件一同保留。

```python
import os
from pathlib import Path

# 创建下载目录
os.makedirs("arxiv_papers", exist_ok=True)

# 下载 PDF
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

使用 `Dapr Agents` 中的 `PyPDFReader` 从下载的 PDF 中提取内容。每一页都会被视为一个带有元数据的独立 Document 对象。

```python
from pathlib import Path
from dapr_agents.document import PyPDFReader

reader = PyPDFReader()
docs_read = []

for paper in download_results:
    local_pdf_path = Path(paper["file_path"])
    documents = reader.load(local_pdf_path, additional_metadata=paper)
    docs_read.extend(documents)

# 验证结果
print(f"Extracted {len(docs_read)} documents.")
print(f"First document text: {docs_read[0].text}")
print(f"Metadata: {docs_read[0].metadata}")
```

### 实际应用

Arxiv Fetcher 可用于多种研究和开发场景：

* **文献综述**：快速检索并整理某个主题或某位作者的相关论文。
* **趋势分析**：通过筛选最新提交的论文，了解某个领域的最新研究动态。
* **离线研究工作流**：下载并处理 PDF，以便进行本地分析和归档。

### 后续步骤

Arxiv Fetcher 提供了可靠的论文检索与处理功能，其输出还可以集成到更高级的工作流中：

* **构建可搜索的知识库**：将获取的论文与文本切分和嵌入向量等集成相结合，实现更高级的搜索能力。
* **检索增强生成（RAG）**：将处理后的论文作为 RAG 流水线的输入，为问答系统提供支持。
* **自动化文献综述**：基于获取和处理的研究成果生成摘要或洞察。
