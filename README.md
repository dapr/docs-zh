# docs-zh

Dapr v1.17 中文翻译仓。

## 目录约定

- `translated_content/zh_CN/`：中文译文正文，按内容桶维持与源文一致的相对路径
- `data/`：翻译管理数据，作为管理台与同步流程的单一事实源
- `data/source/`：英文源文镜像，目录结构与 `translated_content/zh_CN/` 保持一致
- `data/source.json`：源文元数据索引，记录桶、相对路径、文件路径与来源信息
- `site/.generated/`：本地验证站点生成的 Hugo 配置
- `site/.cache/`：本地验证站点缓存目录
- `site/logs/`：本地验证站点日志目录
- `site/tmp/`：本地验证站点临时输出目录
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
- `repos/v1.17_zh/data/source/**/*`

## 本地验证站点

前置条件：

- `repos/v1.17` 已存在，且保留原站 `hugo.yaml`
- `repos/v1.17_zh/translated_content/zh_CN/` 已有待验证译文
- 本机可执行 `hugo`；若未放入 PATH，可改传 `--hugo-bin`

在根仓执行：

```bash
node repos/v1.17_zh/scripts/run-local-docs-verification-site.mjs \
  --source-repo repos/v1.17 \
  --zh-repo repos/v1.17_zh
```

常用参数：

- `--host 127.0.0.1`：绑定地址，默认 `127.0.0.1`
- `--port 1313`：预览端口，默认 `1313`
- `--hugo-bin /path/to/hugo`：显式指定 Hugo 可执行文件
- `--dry-run`：只做预检与配置生成，不真正启动服务

启动成功后，会稳定输出：

- `sourceRepo`
- `zhRepo`
- `generatedConfig`
- `cacheDir`
- `hugoBin`
- `previewUrl`

重点是：脚本以 `repos/v1.17` 作为 Hugo 工作目录，但所有生成物只写入 `repos/v1.17_zh/site/**`。生成配置固定落在 `repos/v1.17_zh/site/.generated/hugo.verification.yaml`，中文 mount 会自动改写到当前 zh 仓的 `translated_content/zh_CN/**`。

### 常见故障排查

- 提示 `sourceRepo 缺少 Hugo 配置`：确认 `--source-repo` 指向 Dapr 文档源仓根目录
- 提示 `zhRepo 缺少译文目录`：确认 `translated_content/zh_CN/` 已同步或已创建
- 提示 `hugo 可执行文件不可用`：先安装 Hugo，或追加 `--hugo-bin`
- 端口冲突或浏览器打不开：改传 `--port`，再看终端输出的 `previewUrl`

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
