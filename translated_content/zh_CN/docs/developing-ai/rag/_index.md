---
type: docs
title: "RAG"
linkTitle: "RAG"
weight: 26
description: "使用 Dapr Workflow 将文档持久化摄取到带版本的向量索引中，用于检索增强生成"
---

### 什么是持久化 RAG 摄取？

为文档语料建立检索增强生成（RAG）索引，需要下载、解析、切分并嵌入可能成千上万的文档，然后将结果写入向量索引。这一过程可能持续数小时，并会遇到长时间运行的作业可能面临的各种故障：嵌入服务提供方对你进行限流、网络调用超时、工作进程因内存不足（OOM）被强制终止，或 Pod 在运行中途被重新调度。

Dapr Python SDK 的 `dapr.ext.rag` 扩展通过 `DurableRAGPipeline` 解决了这一问题：这是一个完全基于 [Dapr Workflow]({{% ref workflow-overview %}}) 构建的文档摄取流水线。这一基础提供了两项保证：

- **崩溃后续跑，而不是重头开始。** 工作流会在每个活动处持久化检查点，因此工作进程崩溃后，会从上一个已完成的文档批次继续，而不是从头开始——已嵌入的内容不会被重复处理，也不会丢失。
- **查询永远不会看到构建了一半的索引。** 每次摄取运行都会构建一个独立的、非活动的索引*版本*。只有该版本经验证确认完整后，才会切换为活动状态——因此，正在进行中的写入对于读取当前索引的查询永远不可见。

## 工作原理

{{< diagram rag-overview >}}

所有会访问网络或文件系统的步骤——列出存储桶、下载文档、调用嵌入 API、写入向量——都在 Dapr Workflow 活动中运行，而不是在编排器本身中运行。正是这一点使整个运行具备重放安全性，并可在崩溃后恢复，与任何其他 Dapr Workflow 一样。

## 支持的提供方

任意数据源都可以与任意嵌入器和任意向量存储搭配使用：

| 关注点 | 可选项 |
|---|---|
| 文档源 | Amazon S3、Azure Blob Storage |
| 解析器 | 文本、Markdown、PDF、HTML、DOCX（通过 `unstructured`） |
| 嵌入器 | OpenAI、Azure OpenAI |
| 向量存储 | PostgreSQL + pgvector、Pinecone、Azure AI Search |

摄取也可以随文档变化自动触发：S3 或 Azure Blob 事件通过 Dapr 发布订阅流入带去抖（debounced）的协调运行，而无需在每次添加或更新文档时手动调用重新摄取接口。

## 开始使用

- **[快速入门]({{% ref rag-quickstart.md %}})**——在几分钟内，使用 LocalStack 作为 S3、本地 Postgres 作为 pgvector，在本地运行一个完整的摄取与查询流程。
- **[Python SDK 文档](/developing-applications/sdks/python/)**——Python SDK 的其余部分，包括 [Dapr Workflow]({{% ref python-workflow-ext %}})，`dapr.ext.rag` 即构建于其之上。

{{< button text="试用 RAG 快速入门" page="rag-quickstart.md" >}}

## 安装

`dapr.ext.rag` 随主 `dapr` 包一同发布，作为一组可选依赖（extras）提供：一组用于嵌入器与核心流水线，每个数据源和向量存储各一组。因此安装时不会拉取你用不到的云 SDK 或数据库驱动：

```bash
pip install "dapr[rag,rag-s3,rag-pgvector]"
```

根据所需的组合，可替换为 `rag-azure`（Azure Blob）、`rag-pinecone`（Pinecone）或 `rag-azure-search`（Azure AI Search）。完整的可运行示例请参阅[快速入门]({{% ref rag-quickstart.md %}})。

## 启动、检查和查询流水线

```python
from dapr.ext.rag import (
    ActiveVersionResolver, DurableRAGPipeline, OpenAIEmbedder, PgVectorStore, S3Source,
    TextSplitter, UnstructuredParser,
)

pipeline = DurableRAGPipeline(
    source=S3Source(bucket="company-docs", prefix="policies/"),
    parser=UnstructuredParser(),
    splitter=TextSplitter(chunk_size=1000, chunk_overlap=150),
    embedder=OpenAIEmbedder(model="text-embedding-3-small"),
    vector_store=PgVectorStore(connection_string="postgresql://...", collection="company_knowledge"),
    state_store_name="rag-pipeline-state",
)
pipeline.run_worker()  # 仅在应执行该工作流的进程中运行

instance_id = pipeline.start(version="2026-09", activate_when_complete=True)
status = pipeline.get_status("2026-09")

# 查询时（独立的短生命周期进程，无需源端凭据）：
resolver = ActiveVersionResolver(
    pipeline_id="company_knowledge", state_store_name="rag-pipeline-state",
    vector_store=PgVectorStore(connection_string="postgresql://...", collection="company_knowledge"),
    embedder=OpenAIEmbedder(model="text-embedding-3-small"),
)
matches = resolver.query("What is the remote work policy?", top_k=5)
```

`resolver.query(...)` 总会在搜索前重新解析当前的活动版本，因此读取方不会冒险读取仍在构建中的版本。

## 事件驱动的摄取

无需手动调用 `pipeline.start()`，变更通知即可自动触发摄取：S3 Event Notification 或 Azure Event Grid/Service Bus 事件通过 Dapr 发布订阅到达，按事件 ID 去重，并在一个短暂的去抖窗口吸收一连串相关变更后，为受影响的前缀启动一次协调运行。判断哪些内容需要建立索引，仍以真实数据源的发现结果为准；事件只决定*何时*去检查。每个提供方完整、可运行的订阅者示例，请参阅 Python SDK 仓库中的[示例发布订阅触发器](https://github.com/dapr/python-sdk/tree/main/examples/rag)。

## 了解更多

- [Python SDK RAG 示例](https://github.com/dapr/python-sdk/tree/main/examples/rag)——涵盖每种受支持的数据源、嵌入器与向量存储组合的可运行示例，以及一个崩溃与恢复演示。
- [`dapr.ext.rag` 参考文档](https://github.com/dapr/python-sdk/tree/main/docs/rag)——完整的配置参考、身份验证、版本激活，以及 Azure 原生旗舰路径（Azure Blob → Azure OpenAI → Azure AI Search → 带引用的有据可依的回答）。
