---
type: docs
title: "为 Dapr Agents 贡献"
linkTitle: "Dapr Agents"
weight: 85
description: 为 Dapr Agents 贡献的指南
---

在为 Dapr Agents 贡献时，应遵循以下规则和最佳实践。

## 示例

examples 目录包含供用户运行的代码示例，用于试用各个 Dapr Agents 包和扩展的特定功能。编写新的和更新的示例时请牢记：

- 所有示例应能在 Windows、Linux 和 MacOS 上运行。虽然 Python 代码在各操作系统间保持一致，但任何示例前后的命令都应通过 [codetabs]({{< ref "contributing-docs.md#tabbed-content" >}}) 提供选项
- 包含下载/安装任何所需先决条件的步骤。即使是刚从操作系统全新安装的用户也应该能够开始运行示例并顺利完成，而不会出错。链接到外部下载页面是可以的。

## 依赖

本项目使用现代化的 Python 打包方式，通过 `pyproject.toml` 管理依赖。依赖管理如下：

- 主要依赖位于 `[project.dependencies]`
- 测试依赖位于 `[project.optional-dependencies.test]`
- 开发依赖位于 `[project.optional-dependencies.dev]`

### 生成 requirements 文件

如果需要生成 requirements 文件（例如用于部署或特定环境）：

```bash
# Generate requirements.txt
pip-compile pyproject.toml

# Generate dev-requirements.txt
pip-compile pyproject.toml --extra dev
```

### 安装依赖

```bash
# Install main package with test dependencies
pip install -e ".[test]"

# Install main package with development dependencies
pip install -e ".[dev]"

# Install main package with all optional dependencies
pip install -e ".[test,dev]"
```

## 测试

本项目使用 pytest 进行测试。运行测试：

```bash
# Run all tests
tox -e pytest

# Run specific test file
tox -e pytest tests/test_random_orchestrator.py

# Run tests with coverage
tox -e pytest --cov=dapr_agents
```

## 代码质量

本项目使用多种工具来维护代码质量：

```bash
# Run linting
tox -e flake8

# Run code formatting
tox -e ruff

# Run type checking
tox -e type
```

## 开发工作流程

1. 安装开发依赖：
   ```bash
   pip install -e ".[dev]"
   ```

2. 在进行更改之前运行测试：
   ```bash
   tox -e pytest
   ```

3. 进行更改

4. 运行代码质量检查：
   ```bash
   tox -e flake8
   tox -e ruff
   tox -e type
   ```

5. 再次运行测试：
   ```bash
   tox -e pytest
   ```

6. 提交您的更改

## GitHub Dapr Bot 命令

请查看 [daprbot 文档]({{< ref "daprbot.md" >}}) 了解您可以在此仓库中运行的 GitHub 命令，以完成常见任务。例如，您可以运行 `/assign`（作为 issue 的评论）来将 issue 分配给一个或一组用户。

## 反馈

此页面对您是否有帮助？
