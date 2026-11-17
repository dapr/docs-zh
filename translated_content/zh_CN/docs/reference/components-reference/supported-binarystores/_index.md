---
type: docs
title: "Binary Store component 规格"
linkTitle: "Binary Store"
description: "与 Dapr 对接的受支持 Binary Store"
weight: 10000
aliases:
  - "/zh-hans/reference/components-reference/supported-binarystore/"
no_list: true
---

下表列出了[Binary Store building block]({{% ref "developing-applications/building-blocks/binarystore/binarystore-overview.md" %}})支持的 component。有关使用该 building block 的说明，请参阅[Binary Store 操作指南]({{% ref "developing-applications/building-blocks/binarystore/howto-use-binary-store.md" %}})。

| component | component 类型 | 状态 | 描述 |
|------|----------|------|------|
| [In-memory]({{% ref "reference/components-reference/supported-binarystores/binarystore-in-memory.md" %}}) | `binarystore.in-memory` | alpha | 用于本地开发和测试的易失性存储。 |
| [AWS S3]({{% ref "reference/components-reference/supported-binarystores/binarystore-s3.md" %}}) | `binarystore.aws.s3` | alpha | Amazon S3 及兼容 S3 的对象存储。 |
| [Azure Blob Storage]({{% ref "reference/components-reference/supported-binarystores/binarystore-azure-blobstorage.md" %}}) | `binarystore.azure.blobstorage` | alpha | Azure Blob Storage 容器。 |
| [Azure Data Lake Storage Gen2]({{% ref "reference/components-reference/supported-binarystores/binarystore-azure-datalake.md" %}}) | `binarystore.azure.datalake` | alpha | Azure Data Lake Storage Gen2 文件系统。 |
| [Google Cloud Storage]({{% ref "reference/components-reference/supported-binarystores/binarystore-gcp-bucket.md" %}}) | `binarystore.gcp.bucket` | alpha | Google Cloud Storage 存储桶。 |
| [OCI Object Storage]({{% ref "reference/components-reference/supported-binarystores/binarystore-oci-objectstorage.md" %}}) | `binarystore.oci.objectstorage` | alpha | Oracle Cloud Infrastructure Object Storage 存储桶。 |

Binary Store API 目前处于 alpha。有关 component 状态的详细信息，请参阅[Component Certification Lifecycle]({{% ref "operations/components/certification-lifecycle.md" %}})。
