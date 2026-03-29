---
type: docs
title: "为 Dapr Agents 做贡献"
linkTitle: "Dapr Agents"
weight: 85
description: 为 Dapr Agents 做贡献的指南
---

在为 Dapr Agents 做贡献时，应遵循以下规则和最佳实践。

## 示例

examples 目录包含代码示例，供用户运行以尝试各种 Dapr Agents 包和扩展的特定功能。在编写新的和更新的示例时，请记住：

- 所有示例都应能在 Windows、Linux 和 MacOS 上运行。虽然 Python 代码在操作系统之间保持一致，但任何示例前/后命令应通过 [codetabs]({{< ref "contributing-docs.md#tabbed-content" >}}) 提供选项
- 包含下载/安装任何必需先决条件的步骤。刚完成操作系统安装的用户应该能够开始示例并无误完成。链接到外部下载页面是可以的。

## 依赖项

此项目使用带有 `pyproject.toml` 的现代 Python 打包。依赖项管理如下：

- 主要依赖项在 `[project.dependencies]` 中
- 测试依赖项在 `[project.optional-dependencies.test]` 中
- 开发依赖项在 `[project.optional-dependencies.dev]` 中

### 生成 Requirements 文件

如果需要生成 requirements 文件（例如，用于部署或特定环境）：

```bash
# Generate requirements.txt
pip-compile pyproject.toml

# Generate dev-requirements.txt
pip-compile pyproject.toml --extra dev
```

### 安装依赖项

```bash
# Install main package with test dependencies
pip install -e ".[test]"

# Install main package with development dependencies
pip install -e ".[dev]"

# Install main package with all optional dependencies
pip install -e ".[test,dev]"
```

## 测试

项目使用 pytest 进行测试。要运行测试：

```bash
# Run all tests
tox -e pytest

# Run specific test file
tox -e pytest tests/test_random_orchestrator.py

# Run tests with coverage
tox -e pytest --cov=dapr_agents
```

## 代码质量

项目使用多种工具来维护代码质量：

```bash
# Run linting
tox -e flake8

# Run code formatting
tox -e ruff

# Run type checking
tox -e type
```

## 开发工作流

1. 安装开发依赖项：
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

6. 提交更改

## GitHub Dapr Bot 命令

查看 [daprbot 文档]({{< ref "daprbot.md" >}}) 以了解您可以在此仓库中运行的用于常见任务的 GitHub 命令。例如，您可以运行 `/assign`（作为 issue 上的评论）将 issue 分配给用户或用户组。

## 反馈

此页面是否有帮助？
