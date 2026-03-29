---
type: docs
title: "为 JavaScript SDK 做出贡献"
linkTitle: "JavaScript SDK"
weight: 3000
description: 为 Dapr JavaScript SDK 做出贡献的指南
---

在为 [JavaScript SDK](https://github.com/dapr/js-sdk) 做出贡献时，应遵循以下规则和最佳实践。

💡 您可以运行 `npm pretty-fix` 来对所有文件运行 prettier

## 提交指南

Dapr Javascript SDK 使用 [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
规范。自动变更日志工具使用这些规范基于提交消息自动生成变更日志。以下是编写提交消息的指南，
以支持此功能：

### 格式

```
type(scope)!: subject
```

- `type`：提交类型是以下之一：

  - `feat`：新功能。
  - `fix`：bug 修复。
  - `docs`：文档变更。
  - `refactor`：特定代码部分的重构，不引入新功能或 bug 修复。
  - `style`：代码风格改进。
  - `perf`：性能改进。
  - `test`：测试套件的变更。
  - `ci`：CI 系统的变更。
  - `build`：构建系统的变更（我们还没有构建系统，所以这不适用）。
  - `chore`：其他不符合上述类型的变更。这不会出现在变更日志中。

- `scope`：提交所更改的代码库部分。如果它更改了多个部分，或者没有修改特定部分，则留空不使用括号。
  示例：

  - 添加 `test` 的提交：

  ```
  test(actors): add an actor test
  ```

  - 一次性更改多项的提交：

  ```
  style: adopt eslint
  ```

  对于示例的更改，scope 应该是示例名称加上 `examples/` 前缀：

  - ❌ `fix(agnoster): commit subject`
  - ✅ `fix(examples/http/actor): commit subject`

- `!`：放在 `scope` 之后（如果 scope 为空，则放在 `type` 之后），表示该提交引入了破坏性变更。

  可选地，您可以指定一条消息，变更日志工具将向用户显示该消息，以指示更改内容以及他们可以如何处理。
  您可以使用多行来输入此消息；变更日志解析器将继续读取，直到提交消息结束或遇到空行。

  示例（虚构）：

  ```
  style(agnoster)!: change dirty git repo glyph

  BREAKING CHANGE: the glyph to indicate when a git repository is dirty has
  changed from a Powerline character to a standard UTF-8 emoji.

  Fixes #420

  Co-authored-by: Username <email>
  ```

- `subject`：更改的简要描述。这将显示在变更日志中。如果您需要指定其他详细信息，可以使用提交正文，
  但这些内容不会可见。

  格式技巧：提交主题可能包含：

  - 通过编写 `#issue` 来链接相关问题或 PR。变更日志工具将突出显示这些内容：

    ```
    feat(archlinux): add support for aura AUR helper (#9467)
    ```

  - 通过使用反引号来格式化内联代码：反引号之间的文本也会被变更日志工具突出显示：
    ```
    feat(shell-proxy): enable unexported `DEFAULT_PROXY` setting (#9774)
    ```

### 风格

尽量保持第一行提交内容简短。使用此提交风格很难做到这一点，但要尽量简洁，
如果需要更多空间，可以使用提交正文。尽量确保提交主题清晰准确，使用户仅通过查看变更日志就能了解更改内容。

## Github Dapr Bot 命令

查看 [daprbot 文档](https://docs.dapr.io/contributing/daprbot/)，了解您可以在此仓库中运行的用于常见任务的 Github 命令。
例如，您可以运行 `/assign`（作为问题的评论）来将问题分配给用户或用户组。

## 编码规则

为确保源代码的一致性，在工作时请记住这些规则：

- 所有功能或 bug 修复**必须通过一个或多个规范（单元测试）进行测试**。
- 所有公共 API 方法**必须记录文档**。
- 我们遵循 [ESLint 推荐规则](https://eslint.org/docs/rules/)。

## 示例

`examples` 目录包含代码示例，供用户运行以试用各种 JavaScript SDK 包和扩展的特定功能。
在编写新的和更新的示例时，请记住：

- 所有示例应该能够在 Windows、Linux 和 MacOS 上运行。虽然 JavaScript 代码在操作系统之间是一致的，
  但任何示例前/后命令应该通过 [tabpane]({{% ref "contributing-docs.md#tabbed-content" %}}) 提供选项。
- 包含下载/安装任何必要先决条件的步骤。从全新操作系统安装开始的人应该能够开始示例并完成它而不会出错。
  指向外部下载页面的链接是可以的。

## 文档

`daprdocs` 目录包含 markdown 文件，这些文件被渲染到 [Dapr 文档](https://docs.dapr.io) 网站。
构建文档网站时，此仓库被克隆并配置，使其内容与文档内容一起渲染。在编写文档时，请记住：

- 除了这些规则外，还应遵循[文档指南]({{% ref contributing-docs.md %}}) 中的所有规则。
- 所有文件和目录应以 `js-` 为前缀，以确保所有文件/目录名称在所有 Dapr 文档中都是全局唯一的。
