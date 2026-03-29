import { accessSync, constants, createWriteStream, existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ensureVerificationSiteDirs,
  inferSourceRepoFromZhRepo,
  renderLocalDocsVerificationConfig,
} from './render-local-docs-verification-config.mjs'

function buildPreviewUrl(host, port) {
  if (host.includes(':') && !host.startsWith('[')) {
    return `http://[${host}]:${port}/zh-hans/`
  }

  return `http://${host}:${port}/zh-hans/`
}

function parseArgs(argv) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  const defaultZhRepo = path.resolve(scriptDir, '..')
  const options = {
    sourceRepo: null,
    zhRepo: defaultZhRepo,
    host: '127.0.0.1',
    port: 1313,
    hugoBin: null,
    dryRun: false,
  }

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

    if (value === '--host') {
      const nextValue = argv[index + 1]
      if (!nextValue) {
        throw new Error('`--host` 缺少值')
      }
      options.host = nextValue
      index += 1
      continue
    }

    if (value === '--port') {
      const nextValue = argv[index + 1]
      if (!nextValue) {
        throw new Error('`--port` 缺少值')
      }
      options.port = Number.parseInt(nextValue, 10)
      index += 1
      continue
    }

    if (value === '--hugo-bin') {
      const nextValue = argv[index + 1]
      if (!nextValue) {
        throw new Error('`--hugo-bin` 缺少值')
      }
      options.hugoBin = nextValue
      index += 1
      continue
    }

    if (value === '--dry-run') {
      options.dryRun = true
      continue
    }

    throw new Error(`不支持的参数：${value}`)
  }

  const zhRepo = path.resolve(options.zhRepo)
  const sourceRepo = path.resolve(options.sourceRepo ?? inferSourceRepoFromZhRepo(zhRepo))
  if (!Number.isInteger(options.port) || options.port <= 0 || options.port > 65535) {
    throw new Error(`端口不合法：${options.port}`)
  }

  return {
    ...options,
    sourceRepo,
    zhRepo,
  }
}

function ensureDirectoryWritable(directoryPath) {
  mkdirSync(directoryPath, { recursive: true })
  accessSync(directoryPath, constants.R_OK | constants.W_OK)
  const probePath = path.join(directoryPath, '.write-test')
  writeFileSync(probePath, 'ok', 'utf8')
  unlinkSync(probePath)
}

function verifySourceRepo(sourceRepo) {
  const sourceConfigPath = path.join(sourceRepo, 'hugo.yaml')
  if (!existsSync(sourceRepo)) {
    throw new Error(`sourceRepo 不存在：${sourceRepo}`)
  }
  if (!existsSync(sourceConfigPath)) {
    throw new Error(`sourceRepo 缺少 Hugo 配置：${sourceConfigPath}`)
  }

  return sourceConfigPath
}

function verifyZhRepo(zhRepo) {
  const zhContentPath = path.join(zhRepo, 'translated_content', 'zh_CN')
  if (!existsSync(zhRepo)) {
    throw new Error(`zhRepo 不存在：${zhRepo}`)
  }
  if (!existsSync(zhContentPath) || !statSync(zhContentPath).isDirectory()) {
    throw new Error(`zhRepo 缺少译文目录：${zhContentPath}`)
  }

  return zhContentPath
}

function resolveHugoBinary(sourceRepo, explicitHugoBin) {
  const candidates = []
  if (explicitHugoBin) {
    candidates.push(path.resolve(explicitHugoBin))
  } else {
    candidates.push(path.join(sourceRepo, 'node_modules', '.bin', process.platform === 'win32' ? 'hugo.exe' : 'hugo'))
    candidates.push('hugo')
  }

  const failures = []
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    if (!result.error && result.status === 0) {
      return candidate
    }

    const reason = result.error?.message ?? result.stderr?.trim() ?? `exit=${result.status}`
    failures.push(`${candidate}: ${reason}`)
  }

  throw new Error(`hugo 可执行文件不可用。请先安装 Hugo，或通过 --hugo-bin 指定路径。尝试结果：${failures.join(' | ')}`)
}

function printDiagnostics({ sourceRepo, zhRepo, generatedConfigPath, cacheDir, previewUrl, hugoBin }) {
  console.log(`[local-docs-verification] sourceRepo=${sourceRepo}`)
  console.log(`[local-docs-verification] zhRepo=${zhRepo}`)
  console.log(`[local-docs-verification] generatedConfig=${generatedConfigPath}`)
  console.log(`[local-docs-verification] cacheDir=${cacheDir}`)
  console.log(`[local-docs-verification] hugoBin=${hugoBin}`)
  console.log(`[local-docs-verification] previewUrl=${previewUrl}`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  verifySourceRepo(options.sourceRepo)
  verifyZhRepo(options.zhRepo)

  const sitePaths = ensureVerificationSiteDirs(options.zhRepo)
  for (const directory of [
    sitePaths.siteRoot,
    sitePaths.generatedDir,
    sitePaths.cacheDir,
    sitePaths.logsDir,
    sitePaths.tmpDir,
    sitePaths.publishDir,
    sitePaths.resourceDir,
  ]) {
    ensureDirectoryWritable(directory)
  }

  const hugoBin = resolveHugoBinary(options.sourceRepo, options.hugoBin)
  const renderResult = renderLocalDocsVerificationConfig({
    sourceRepo: options.sourceRepo,
    zhRepo: options.zhRepo,
  })
  const previewUrl = buildPreviewUrl(options.host, options.port)

  printDiagnostics({
    sourceRepo: renderResult.sourceRepo,
    zhRepo: renderResult.zhRepo,
    generatedConfigPath: renderResult.generatedConfigPath,
    cacheDir: renderResult.writablePaths.cacheDir,
    previewUrl,
    hugoBin,
  })

  if (options.dryRun) {
    console.log('[local-docs-verification] mode=dry-run')
    return
  }

  const logStream = createWriteStream(renderResult.writablePaths.logFilePath, {
    flags: 'a',
  })
  const child = spawn(
    hugoBin,
    [
      'server',
      '--config',
      renderResult.generatedConfigPath,
      '--bind',
      options.host,
      '--port',
      String(options.port),
      '--cacheDir',
      renderResult.writablePaths.cacheDir,
      '--renderToMemory',
    ],
    {
      cwd: options.sourceRepo,
      stdio: ['inherit', 'pipe', 'pipe'],
    },
  )

  const pipeOutput = (stream, target) => {
    if (!stream) {
      return
    }

    stream.on('data', (chunk) => {
      target.write(chunk)
      logStream.write(chunk)
    })
  }

  pipeOutput(child.stdout, process.stdout)
  pipeOutput(child.stderr, process.stderr)

  const forwardSignal = (signal) => {
    if (!child.killed) {
      child.kill(signal)
    }
  }

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => forwardSignal(signal))
  }

  await new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code) => {
      logStream.end()
      process.exitCode = code ?? 1
      resolve()
    })
  })
}

void main().catch((error) => {
  console.error('[local-docs-verification] failed', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
