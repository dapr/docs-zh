---
type: docs
title: "Quickstart：持久化 RAG 摄取"
linkTitle: "Quickstart"
weight: 30
description: "将文档摄取到带版本的向量索引中并进行查询，全部在你的本机上运行"
---

本 Quickstart 在本机上运行一个完整的 `DurableRAGPipeline` 摄取与查询流程：文档从对象存储中被发现，经过解析和分块，使用 OpenAI 生成嵌入向量，然后写入本地的 [pgvector](https://github.com/pgvector/pgvector) 索引。随后你将查询该索引，并获得能够回答你问题的文档。

请选择与你实际部署方式相匹配的数据源。其余流水线部分（嵌入、pgvector、工作进程和 CLI 命令，以及“设置环境”之后的全部内容）无论选择哪种方式都完全相同：

- **AWS** — `S3Source` 搭配 [LocalStack](https://www.localstack.cloud/)，这是一个本地 S3 模拟器。无需 AWS 账户，同样的代码和配置结构也适用于真实的 Amazon S3。
- **Azure** — `AzureBlobSource` 搭配 [Azurite](https://github.com/Azure/Azurite)，这是 Azure 的本地存储模拟器。无需 Azure 账户，同样的代码和配置结构也适用于真实的 Azure Storage 账户。
- **通用（任意 S3 兼容存储）** — `S3Source` 搭配 [S3Mock](https://github.com/adobe/S3Mock)，这是一个精简的 S3 兼容测试服务器。使用此选项卡可以确认 `S3Source` 并非 AWS 专用：它通过相同的 API 与任何 S3 兼容端点通信，因此把 `RAG_S3_ENDPOINT_URL` 指向你自己部署的自托管对象存储（MinIO、Ceph RGW 等）同样可行，只需把下面的占位凭据换成该存储自己的真实凭据即可。

同一流水线无需修改即可用于真实的 Pinecone、Azure AI Search 和真实的 Azure OpenAI。所有受支持的组合请参阅 [RAG 概述]({{% ref rag %}})。在本 Quickstart 中，只有嵌入向量需要真实的外部账户；[OpenAI API 密钥](https://platform.openai.com/api-keys)是唯一无法在本地运行的凭据。

## 前提条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})，并已初始化 [Dapr environment]({{% ref install-dapr-selfhost.md %}})
- 已安装 [Python 3.10+](https://www.python.org/downloads/)
- 已安装 [Docker](https://docs.docker.com/get-docker/)，用于运行本地存储模拟器和 pgvector 容器
- 一个 [OpenAI API 密钥](https://platform.openai.com/api-keys)

## 设置环境

克隆 Python SDK 仓库，并进入 RAG 示例目录：

```bash
git clone https://github.com/dapr/python-sdk.git
cd python-sdk/examples/rag
```

安装示例的依赖：

```bash
pip3 install -r requirements.txt
```

启动一个支持 pgvector 的本地 Postgres，下面每种数据源都会用到它。这里使用端口 `5544`，因为 `5432` 往往已被本机安装的 Postgres 占用：

```bash
docker run -d --rm --name rag-pgvector -p 5544:5432 \
    -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ragdb pgvector/pgvector:pg16
```

复制示例的配置文件。下面每个选项卡都会编辑同一个文件：

```bash
cp .env.example .env
```

然后按照你所选数据源对应的选项卡操作：

{{< tabpane text=true >}}

{{% tab header="AWS" %}}
启动 LocalStack：

```bash
docker run -d --rm --name rag-localstack -p 4566:4566 -e SERVICES=s3 localstack/localstack:3
```

编辑 `.env` 并设置：

```bash
OPENAI_API_KEY=<your real key>
RAG_S3_ENDPOINT_URL=http://localhost:4566
RAG_PGVECTOR_CONNECTION_STRING=postgresql://postgres:postgres@localhost:5544/ragdb
```

加载它，并加上 LocalStack 要求的两个占位 AWS 变量（任何非空值都可以，真实的 AWS 部署永远不应设置这些变量）：

```bash
export $(grep -v '^#' .env | xargs)
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
```

创建存储桶并上传一个示例文档：

```bash
python3 -c "
import boto3
s3 = boto3.client('s3', endpoint_url='http://localhost:4566', region_name='us-east-1')
s3.create_bucket(Bucket='company-docs')
s3.put_object(Bucket='company-docs', Key='policies/remote-work.txt',
              Body=b'Employees may work remotely up to three days per week.')
"
```
{{% /tab %}}

{{% tab header="Azure" %}}
启动 Azurite：

```bash
docker run -d --rm --name rag-azurite -p 10000:10000 -p 10001:10001 -p 10002:10002 \
    mcr.microsoft.com/azure-storage/azurite
```

编辑 `.env` 并设置：

```bash
OPENAI_API_KEY=<your real key>
RAG_SOURCE=azure-blob
RAG_AZURE_CONNECTION_STRING=UseDevelopmentStorage=true
RAG_PGVECTOR_CONNECTION_STRING=postgresql://postgres:postgres@localhost:5544/ragdb
```

加载它：

```bash
export $(grep -v '^#' .env | xargs)
```

创建容器并上传一个示例文档：

```bash
python3 -c "
from azure.storage.blob import BlobServiceClient
client = BlobServiceClient.from_connection_string('UseDevelopmentStorage=true')
client.create_container('company-docs')
client.get_container_client('company-docs').upload_blob(
    'policies/remote-work.txt', b'Employees may work remotely up to three days per week.'
)
"
```
{{% /tab %}}

{{% tab header="通用（S3 兼容）" %}}
启动 S3Mock：

```bash
docker run -d --rm --name rag-s3mock -p 9090:9090 adobe/s3mock
```

编辑 `.env` 并设置：

```bash
OPENAI_API_KEY=<your real key>
RAG_S3_ENDPOINT_URL=http://localhost:9090
RAG_PGVECTOR_CONNECTION_STRING=postgresql://postgres:postgres@localhost:5544/ragdb
```

加载它，并加上 S3Mock 要求的两个占位 AWS 变量（任何非空值都可以；你自己部署的自托管存储需要在此处使用其自身的真实凭据）：

```bash
export $(grep -v '^#' .env | xargs)
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
```

创建存储桶并上传一个示例文档：

```bash
python3 -c "
import boto3
s3 = boto3.client('s3', endpoint_url='http://localhost:9090', region_name='us-east-1')
s3.create_bucket(Bucket='company-docs')
s3.put_object(Bucket='company-docs', Key='policies/remote-work.txt',
              Body=b'Employees may work remotely up to three days per week.')
"
```
{{% /tab %}}

{{< /tabpane >}}

{{% alert title="注意" color="info" %}}
上文中的每个 `export` 仅对当前 shell 生效。在本 Quickstart 中，每打开一个新终端来运行命令，都需要重新执行一次。
{{% /alert %}}

## 在本地运行应用

启动工作进程，并让它在此终端中保持运行，等待出现 `Worker ready.`：

```bash
dapr run --app-id rag-worker --resources-path components/ -- python3 worker.py
```

在**第二个终端**中，重新导出 `.env`，以及你所选选项卡中用到的额外凭据变量（AWS 或通用选项使用 `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`，因为这是一个新 shell，这些变量在此处尚未设置），然后开始摄取。请使用与工作进程**相同**的 `--app-id`（`rag-worker`），不要使用新的 ID。Dapr Workflow 在内部以 Dapr Actors 为基础，CLI 需要连接到工作进程所注册的同一个 Actor runtime：

```bash
export $(grep -v '^#' .env | xargs)

dapr run --app-id rag-worker --resources-path components/ -- python3 cli.py start --version v1
dapr run --app-id rag-worker --resources-path components/ -- python3 cli.py status --version v1
```

每隔几秒重新运行一次 `status` 命令，直到它显示 `"stage": "completed"` 和 `"activation_succeeded": true`。完整的响应是一份包含所有跟踪计数器的 JSON 转储（待处理、已完成和失败的文档数，已嵌入与已复用的块数，重试次数，时间戳等）。对本 Quickstart 而言，关键字段如下所示：

```json
{
  "pipeline_id": "company-knowledge",
  "requested_version": "v1",
  "stage": "completed",
  "total_documents": 1,
  "completed_documents": 1,
  "validation_succeeded": true,
  "activation_succeeded": true,
  "active_version": "v1"
}
```

现在进行查询：

```bash
dapr run --app-id rag-worker --resources-path components/ -- python3 cli.py query "What is the remote work policy?"
```

你应该会看到 `remote-work.txt` 是得分最高的匹配结果。

## 发生了什么？

1. **`worker.py`** 启动了一个 Dapr Workflow 工作进程，它承载 `rag_ingest` 编排器及其活动（`discover_and_manifest`、`process_document`、`validate_version`、`activate_version` 等）。摄取要持续推进，就必须保持这个进程运行。
2. **`cli.py start --version v1`** 为版本 `v1` 调度了一个新的 workflow instance。编排器列出了存储桶或容器，找到一个文档，下载并分块，用 OpenAI 为该块生成嵌入向量，然后把它写入 pgvector 表中的 `v1` namespace。所有这些都在 workflow 活动内完成，因此任何时刻发生崩溃，都会从最后一个已完成的步骤恢复，而不是从头开始。
3. 所有文档处理完成后，编排器会**验证** vector store 中的块数量是否与预期一致，然后**激活** `v1`，即通过一个受 ETag 保护的指针切换，使查询开始读取该版本。在验证通过之前，`v1` 永远不会对查询可见。
4. **`cli.py query`** 使用 `ActiveVersionResolver` 解析当前激活的版本（`v1`），对你的问题进行嵌入，并且只在该版本的向量中搜索。

使用 `Ctrl+C` 停止工作进程，并在使用完毕后停止容器，包括 `rag-pgvector` 以及你启动的数据源模拟器（`rag-localstack`、`rag-azurite` 或 `rag-s3mock`）：

```bash
docker stop rag-pgvector rag-localstack rag-azurite rag-s3mock
```

{{% alert title="注意" color="info" %}}
对未在运行的容器名称执行 `docker stop` 只会为该名称输出一条错误，然后继续处理其余名称。如果你只启动了三者中的一个，这没有影响。
{{% /alert %}}

{{% alert title="稍后重新运行？" color="warning" %}}
稍后再次运行时，请使用新的 `--version`（例如 `v2`），而不要再次使用 `v1`。对已使用过的版本执行 `cli.py start --version v1`，会重新连接到同一个确定性的 workflow instance，而不是启动一个全新的实例。这符合真实使用场景：版本应当对每批内容保持唯一，而不应在多次尝试之间复用。
{{% /alert %}}

## 后续步骤

- 亲自查看崩溃与恢复行为：[故障与恢复演示](https://github.com/dapr/python-sdk/tree/main/examples/rag#failure-and-resume-demo)会在运行中途终止工作进程，并展示它如何在不重新嵌入已完成工作的情况下恢复。
- 了解[事件驱动摄取]({{% ref "rag#event-driven-ingestion" %}})，即在文档变化时自动触发一次协调运行。
- 进一步在 Azure 上实践：[Azure 原生旗舰路径](https://github.com/dapr/python-sdk/tree/main/examples/rag#the-azure-native-flagship-path)会把上面的 OpenAI 和 pgvector 同样替换为 Azure OpenAI 和 Azure AI Search，最终得到一个带引用来源的有依据回答。
