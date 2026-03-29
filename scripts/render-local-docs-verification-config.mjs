import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const ZH_MOUNT_PREFIX = 'translations/docs-zh/translated_content/zh_CN/'
const GENERATED_CONFIG_NAME = 'hugo.verification.yaml'

function toPosixPath(value) {
  return value.split(path.sep).join(path.posix.sep)
}

export function inferSourceRepoFromZhRepo(zhRepo) {
  const repoName = path.basename(zhRepo)
  if (!repoName.endsWith('_zh')) {
    throw new Error(`无法从 zh 仓路径推导 sourceRepo：${zhRepo}`)
  }

  return path.join(path.dirname(zhRepo), repoName.slice(0, -3))
}

export function getVerificationSitePaths(zhRepo) {
  const normalizedZhRepo = path.resolve(zhRepo)
  const siteRoot = path.join(normalizedZhRepo, 'site')
  const generatedDir = path.join(siteRoot, '.generated')
  const cacheDir = path.join(siteRoot, '.cache')
  const logsDir = path.join(siteRoot, 'logs')
  const tmpDir = path.join(siteRoot, 'tmp')

  return {
    siteRoot,
    generatedDir,
    cacheDir,
    logsDir,
    tmpDir,
    generatedConfigPath: path.join(generatedDir, GENERATED_CONFIG_NAME),
    logFilePath: path.join(logsDir, 'hugo.verification.log'),
    publishDir: path.join(tmpDir, 'public'),
    resourceDir: path.join(tmpDir, 'resources'),
  }
}

export function ensureVerificationSiteDirs(zhRepo) {
  const sitePaths = getVerificationSitePaths(zhRepo)
  for (const directory of [
    sitePaths.siteRoot,
    sitePaths.generatedDir,
    sitePaths.cacheDir,
    sitePaths.logsDir,
    sitePaths.tmpDir,
    sitePaths.publishDir,
    sitePaths.resourceDir,
  ]) {
    mkdirSync(directory, { recursive: true })
  }

  return sitePaths
}

function rewriteMounts(mounts, zhRepo) {
  let rewrittenMountCount = 0
  const zhContentRoot = path.join(path.resolve(zhRepo), 'translated_content', 'zh_CN')

  const rewrittenMounts = mounts.map((mount) => {
    if (!mount || typeof mount !== 'object') {
      return mount
    }

    if (typeof mount.source !== 'string' || !mount.source.startsWith(ZH_MOUNT_PREFIX)) {
      return mount
    }

    const relativeSource = mount.source.slice(ZH_MOUNT_PREFIX.length)
    rewrittenMountCount += 1

    return {
      ...mount,
      source: toPosixPath(path.join(zhContentRoot, relativeSource)),
    }
  })

  if (rewrittenMountCount === 0) {
    throw new Error('未在 sourceRepo/hugo.yaml 中找到可重写的简体中文 mount')
  }

  return {
    rewrittenMounts,
    rewrittenMountCount,
  }
}

export function renderLocalDocsVerificationConfig(options = {}) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  const defaultZhRepo = path.resolve(scriptDir, '..')
  const zhRepo = path.resolve(options.zhRepo ?? defaultZhRepo)
  const sourceRepo = path.resolve(options.sourceRepo ?? inferSourceRepoFromZhRepo(zhRepo))
  const sourceConfigPath = path.join(sourceRepo, 'hugo.yaml')
  const rawSourceConfig = readFileSync(sourceConfigPath, 'utf8')
  const sourceConfig = yaml.load(rawSourceConfig, { json: true })

  if (!sourceConfig || typeof sourceConfig !== 'object') {
    throw new Error(`无法解析 Hugo 配置：${sourceConfigPath}`)
  }

  const sitePaths = ensureVerificationSiteDirs(zhRepo)
  const existingModule = sourceConfig.module
  const existingMounts = Array.isArray(existingModule?.mounts) ? existingModule.mounts : null
  if (!existingMounts) {
    throw new Error(`sourceRepo/hugo.yaml 缺少 module.mounts：${sourceConfigPath}`)
  }

  const { rewrittenMounts, rewrittenMountCount } = rewriteMounts(existingMounts, zhRepo)
  const generatedConfig = {
    ...sourceConfig,
    publishDir: toPosixPath(sitePaths.publishDir),
    resourceDir: toPosixPath(sitePaths.resourceDir),
    module: {
      ...existingModule,
      mounts: rewrittenMounts,
    },
  }

  const serializedConfig = yaml.dump(generatedConfig, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  })

  writeFileSync(sitePaths.generatedConfigPath, serializedConfig, 'utf8')

  return {
    sourceRepo,
    zhRepo,
    sourceConfigPath,
    generatedConfigPath: sitePaths.generatedConfigPath,
    rewrittenMountCount,
    writablePaths: {
      generatedDir: sitePaths.generatedDir,
      cacheDir: sitePaths.cacheDir,
      logsDir: sitePaths.logsDir,
      tmpDir: sitePaths.tmpDir,
      publishDir: sitePaths.publishDir,
      resourceDir: sitePaths.resourceDir,
      logFilePath: sitePaths.logFilePath,
    },
  }
}

function parseArgs(argv) {
  const options = {}

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--source-repo') {
      const nextValue = argv[index + 1]
      if (!nextValue) {
        throw new Error('`--source-repo` 缺少值')
      }
      options.sourceRepo = nextValue
      index += 1
      continue
    }

    if (value === '--zh-repo') {
      const nextValue = argv[index + 1]
      if (!nextValue) {
        throw new Error('`--zh-repo` 缺少值')
      }
      options.zhRepo = nextValue
      index += 1
      continue
    }

    throw new Error(`不支持的参数：${value}`)
  }

  return options
}

function main() {
  const result = renderLocalDocsVerificationConfig(parseArgs(process.argv.slice(2)))
  console.log(JSON.stringify(result, null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main()
  } catch (error) {
    console.error('[local-docs-verification:render] failed', error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
