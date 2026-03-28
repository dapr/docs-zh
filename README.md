# docs-zh

Dapr v1.17 中文翻译仓。

## 目录约定

- `translated_content/zh_CN/`：中文译文正文，按内容桶维持与源文一致的相对路径
- `data/`：翻译管理数据，作为管理台与同步流程的单一事实源
- `data/source/`：英文源文镜像，目录结构与 `translated_content/zh_CN/` 保持一致
- `data/source.json`：源文元数据索引，记录桶、相对路径、文件路径与来源信息
- 本仓仅保留数据与译文；共享脚本位于根仓 `scripts/zh-data/sync_source_documents.ts`

## 生成 zh 数据

在仓库根目录执行：

```bash
npm run zh:data:sync -- \
  --source-repo repos/v1.17 \
  --zh-repo repos/v1.17_zh \
  --version v1.17
```

脚本会刷新以下文件：

- `repos/v1.17_zh/data/sync-status.json`
- `repos/v1.17_zh/data/glossary.json`
- `repos/v1.17_zh/data/source.json`
- `repos/v1.17_zh/data/source-manifest.json`
- `repos/v1.17_zh/data/copy-log.json`
- `repos/v1.17_zh/data/source/**/*`

## JSON 字段说明

### `sync-status.json`

- `version`：当前中文仓版本
- `generatedAt`：本次状态文件生成时间
- `syncedAt`：最近一次全量同步时间
- `summary` / `sourceSummary`：`synced` / `drift` / `missingSource` 汇总
- `translationSummary`：`translated` / `staleTranslation` / `missingTranslation` / `orphanTranslation` 汇总
- `items[].bucket`：内容桶，如 `docs`、`sdks_python`
- `items[].relativePath`：桶内稳定主键，用于跨数据集关联
- `items[].sourceFile`：镜像后的源文文件路径
- `items[].status` / `items[].sourceStatus`：当前原文同步状态
- `items[].translationFile`：目标译文文件路径
- `items[].translationStatus`：译文状态；仅当 `translationUpdatedAt > syncedAt` 时记为 `translated`
- `items[].translationUpdatedAt`：译文最近更新时间
- `items[].mirroredSha256`：镜像文件当前哈希
- `items[].lastCheckedAt`：最近一次全量校验时间

### `glossary.json`

- `terms[].source`：英文术语
- `terms[].target`：中文标准译法
- `terms[].category`：术语分类
- `terms[].status`：审批状态，如 `approved` / `review`

### `source.json`

- `sourceRoot`：源文镜像根目录，固定为 `data/source`
- `buckets[]`：按内容桶聚合的文档数、原文异常数、译文状态数与镜像目录
- `items[].sourceFile`：源文镜像文件路径
- `items[].relativePath`：桶内稳定主键，用于跨数据集关联
- `items[].mimeType` / `items[].sizeBytes`：文件类型与大小元数据

### `source-manifest.json`

- `sourceRepo` / `sourceBranch`：本次快照来源
- `batchId`：复制批次标识
- `metadataFile`：当前批次关联的源文元数据文件
- `buckets[]`：按内容桶聚合的文档数、原文异常数、译文状态数与镜像目录
- `failures[]`：复制阶段的失败明细

### `copy-log.json`

- `batches[]`：追加式批次日志
- `batches[].documentCount`：本次复制的源文数量
- `batches[].bucketCount`：覆盖内容桶数量
- `batches[].failureCount`：失败文件数
- `batches[].statusSummary`：原文同步状态摘要快照
- `batches[].translationSummary`：译文状态摘要快照
