---
type: docs
title: "维护者指南"
linkTitle: "维护者指南"
weight: 20
description: "开始成为 Dapr 文档维护者和审批者。"
---

在本指南中，您将学习如何执行日常的 Dapr 文档维护者和审批者职责。为了成功完成这些任务，您需要在 [`dapr/docs`](https://github.com/dapr/docs) 仓库中拥有审批者或维护者身份。

要了解如何为 Dapr 文档做出贡献，请参阅[贡献者指南]({{% ref contributing-docs %}})。

## 分支指南

Dapr 文档的分支处理方式与大多数代码仓库不同。它没有 `main` 分支，每个分支都标记为与运行时发布的主版本号和次版本号相匹配。

有关完整列表，请访问 [Docs 仓库](https://github.com/dapr/docs#branch-guidance)。

阅读[贡献者指南]({{% ref "contributing-docs#branch-guidance" %}})以了解有关发布分支的更多信息。

## 从当前发布分支向上合并到预发布分支

作为文档审批者或维护者，您需要执行常规向上合并，以保持预发布分支与当前发布分支的更新保持一致。建议每周将当前分支向上合并到预发布分支中一次。

在以下步骤中，将 `v1.0` 视为当前发布版本，将 `v1.1` 视为即将发布的版本。

1. 打开 Visual Studio Code 并切换到 Dapr 文档仓库。
1. 在本地仓库中，切换到最新分支（`v1.0`）并同步更改：

   ```bash
   git pull upstream v1.0
   git push origin v1.0
   ```

1. 切换到即将发布的分支（`v1.1`）并同步更改：

   ```bash
   git pull upstream v1.1
   git push origin v1.1
   ```

1. 基于即将发布的版本创建一个新分支：

   ```bash
   git checkout -b upmerge_MM-DD
   ```

1. 打开终端，暂存从最新发布版本到向上合并分支的合并：

   ```bash
   git merge --no-ff --no-commit v1.0
   ```

1. 在终端中，确保包含的文件看起来准确无误。在 VS Code 中检查任何合并冲突。删除不需要合并的配置更改或版本信息。
1. 提交暂存的更改并推送到向上合并分支（`upmerge_MM-DD`）。
1. 从向上合并分支向即将发布的分支（`v1.1`）打开一个 PR。
1. 审查该 PR 并仔细检查没有将非预期的更改推送到向上合并分支。

## 发布流程

Dapr 文档必须与 Dapr 项目发布中包含的功能和更新保持一致。在 Dapr 发布日期之前，请确保：

- 所有新功能或更新都已充分记录并经过审查。
- 即将发布的文档 PR 指向发布分支。

在以下步骤中，将 `v1.0` 视为最新发布版本，将 `v1.1` 视为即将发布的版本。

文档的发布流程需要以下内容：

- 将最新发布版本向上合并到即将发布的分支
- 更新最新和即将发布的 Hugo 配置文件
- 为下一个版本创建新的 Azure 静态 Web 应用
- 为下一个版本的网站创建新的 DNS 条目
- 为下一个版本创建新的 git 分支

### 向上合并

首先，执行从最新发布版本到即将发布分支的[文档向上合并](#从当前发布分支向上合并到预发布分支)。

### 更新 Hugo 配置

向上合并后，为发布准备文档分支。在两个独立的 PR 中，您需要：

- 归档最新发布版本。
- 将预览/发布分支作为文档的当前实时版本。
- 创建一个新的预览分支。

#### 最新发布版本

这些步骤将为归档准备最新发布分支。

1. 打开 VS Code 并切换到 Dapr 文档仓库。
1. 切换到最新分支（`v1.0`）并同步更改：

   ```bash
   git pull upstream v1.0
   git push origin v1.0
   ```

1. 基于最新发布版本创建一个新分支：

   ```bash
   git checkout -b release_v1.0
   ```

1. 在 VS Code 中，导航到位于根目录的 `hugo.yaml`。
1. 将以下配置添加到 `# Versioning` 部分（大约第 121 行及以后）：

   ```yaml
   version_menu: "v1.0"
   version: "v1.0"
   archived_version: true
   url_latest_version: "https://docs.dapr.io"

   versions:
    - version: v1.2 (preview)
      url: https://v1-2.docs.dapr.io
    - version: v1.1 (latest)
      url: "#"
    - version: v1.0
      url: https://v1-0.docs.dapr.io
   ```

1. 删除 `.github/workflows/website-root.yml`。
1. 提交暂存的更改并推送到您的分支（`release_v1.0`）。
1. 从 `release_v1.0` 向 `v1.0` 打开一个 PR。
1. 请文档维护者或审批者进行审查。等待发布后再合并该 PR。

#### 即将发布的版本

这些步骤将为即将发布分支准备提升为最新发布版本。

1. 打开 VS Code 并切换到 Dapr 文档仓库。
1. 切换到即将发布的分支（`v1.1`）并同步更改：

   ```bash
   git pull upstream v1.1
   git push origin v1.1
   ```

1. 基于即将发布的版本创建一个新分支：

   ```bash
   git checkout -b release_v1.1
   ```

1. 在 VS Code 中，导航到位于根目录的 `hugo.yaml`。
1. 将第 1 行更新为 `baseURL: https://docs.dapr.io/`。
1. 更新 `# Versioning` 部分（大约第 121 行及以后）以显示正确的版本和标签：

   ```yaml
   # Versioning
   version_menu: "v1.1 (latest)"
   version: "v1.1"
   archived_version: false
   url_latest_version: https://docs.dapr.io
   github_branch: v1.1

   versions:
    - version: v1.2 (preview)
      url: https://v1-2.docs.dapr.io
    - version: v1.1 (latest)
      url: "#"
    - version: v1.0
      url: https://v1-0.docs.dapr.io
   ```

1. 导航到 `.github/workflows/website-root.yml`。
1. 更新触发工作流的分支：

   ```yml
   name: Azure Static Web App Root

   on:
     push:
       branches:
         - v1.1
     pull_request:
       types: [opened, synchronize, reopened, closed]
       branches:
         - v1.1
   ```

1. 导航到 `/README.md`。
1. 更新版本表：

```markdown
| Branch                                                       | Website                    | Description                                                                                      |
| ------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------ |
| [v1.1](https://github.com/dapr/docs) (primary)               | https://docs.dapr.io       | Latest Dapr release documentation. Typo fixes, clarifications, and most documentation goes here. |
| [v1.2](https://github.com/dapr/docs/tree/v1.2) (pre-release) | https://v1-2.docs.dapr.io/ | Pre-release documentation. Doc updates that are only applicable to v1.2+ go here.                |
```

1. 更新 `support-release-policy.md` 中的 _Supported versions_ 表；在表顶部添加一行新的运行时和 SDK 版本。将早于 n-2 的发布版本更改为 `Unsupported`。
1. 将 `dapr-latest-version.html` shortcode partial 更新为新的次版本/补丁版本（在此示例中为 `1.1.0` 和 `1.1`）。
1. 提交暂存的更改并推送到您的分支（`release_v1.1`）。
1. 从 `release/v1.1` 向 `v1.1` 打开一个 PR。
1. 请文档维护者或审批者进行审查。等待发布后再合并该 PR。

#### 未来预览分支

##### 创建预览分支

1. 在 GitHub UI 中，选择分支下拉菜单并选择 **View all branches**。
1. 点击 **New branch**。
1. 在 **New branch name** 中，输入预览分支版本号。在此示例中，应该是 `v1.2`。
1. 选择 **v1.1** 作为源。
1. 点击 **Create new branch**。

##### 配置预览分支

1. 在终端窗口中，导航到 `docs` 仓库。
1. 切换到即将发布的分支（`v1.1`）并同步更改：

   ```bash
   git pull upstream v1.1
   git push origin v1.1
   ```

1. 基于 `v1.1` 创建一个新分支并将其命名为 `v1.2`：

  ```bash
  git checkout -b release_v1.1
  ```

1. 将 `.github/workflows/website-v1-1.yml` 重命名为 `.github/workflows/website-v1-2.yml`。
1. 在 VS Code 中打开 `.github/workflows/website-v1-2.yml` 并更新名称、触发器和部署目标为 1.2：

   ```yml
   name: Azure Static Web App v1.2
   
   on:
     push:
       branches:
         - v1.2
     pull_request:
       types: [opened, synchronize, reopened, closed]
       branches:
         - v1.2
   
    ...
   
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_V1_2 }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
   
    ...
   
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_V1_2 }}
          skip_deploy_on_missing_secrets: true
   ```

1. 导航到 `daprdocs/config.toml` 并更新 `baseURL` 以指向新的预览网站：

   ```toml
   baseURL = "https://v1-2.docs.dapr.io"
   ```

1. 更新 `# GitHub Information` 和 `# Versioning` 部分（大约第 148 行）以显示正确的版本和标签：

   ```toml
   # GitHub Information
   github_repo = "https://github.com/dapr/docs"
   github_project_repo = "https://github.com/dapr/dapr"
   github_subdir = "daprdocs"
   github_branch = "v1.2"
   
   # Versioning
   version_menu = "v1.2 (preview)"
   version = "v1.2"
   archived_version = false
   url_latest_version = "https://docs.dapr.io"
   
   [[params.versions]]
     version = "v1.2 (preview)"
     url = "#"
   [[params.versions]]
     version = "v1.1 (latest)"
     url = "https://docs.dapr.io"
   [[params.versions]]
     version = "v1.0"
     url = "https://v1-0.docs.dapr.io"
   ```

1. 提交暂存的更改并针对 v1.2 分支推送到一个新的 PR。
1. 在发布和其他 `v1.0` 和 `v1.1` PR 合并之前，暂缓合并该 PR。

### 为未来发布创建新网站

接下来，为未来的 Dapr 发布创建一个新网站。为此，您需要：

- 部署 Azure 静态 Web 应用。
- 通过 CNCF 请求配置 DNS。

#### 先决条件

- 在 `dapr/docs` 仓库中拥有文档维护者身份。
- 访问活动 Dapr Azure 订阅，具有贡献者或所有者访问权限以创建资源。
- 在您的机器上安装 [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd?tabpane=winget-windows%2Cbrew-mac%2Cscript-linux&pivots=os-windows)。
- 将您自己的 [`dapr/docs` 仓库](https://github.com/dapr/docs) fork 克隆到您的机器上。

#### 部署 Azure 静态 Web 应用

为未来的 Dapr 发布部署一个新的 Azure 静态 Web 应用。在此示例中，我们使用 v1.1 作为未来发布版本。

1. 在终端窗口中，导航到 `dapr/docs` 目录中的 `iac/swa` 文件夹。

   ```bash
   cd .github/iac/swa
   ```

1. 使用 Dapr Azure 订阅登录 Azure Developer CLI (`azd`)。

   ```bash
   azd login
   ```

1. 在浏览器提示中，验证您以 Dapr 身份登录并完成登录。

1. 在同一终端中，设置这些环境变量：

   ```bash
   export AZURE_RESOURCE_GROUP=docs-website
   export IDENTITY_RESOURCE_GROUP=dapr-identities
   export AZURE_STATICWEBSITE_NAME==daprdocs-v1-1
   ```

其中 `daprdocs-v1-1` 应更新为新的预览版本。

1. 创建一个新的 [`azd` 环境](https://learn.microsoft.com/azure/developer/azure-developer-cli/faq#what-is-an-environment-name)。

   ```bash
   azd env new
   ```

1. 出现提示时，输入一个新的环境名称。在此示例中，您可以将环境命名为：`dapr-docs-v1-1`。

1. 创建环境后，使用以下命令将 Dapr 文档 SWA 部署到新环境中：

   ```bash
   azd up
   ```

1. 出现提示时，选择一个 Azure 订阅（Dapr Tests）和部署位置（West US 2）。

#### 在 Azure 门户中配置 SWA

前往 [Azure 门户](https://portal.azure.com) 中的 Dapr 订阅，并验证您的新 Dapr 文档站点是否已部署。

可选地，使用门户中的 **Static Web App** > **Access control (IAM)** 边栏选项卡，为入站发布和出站访问依赖项授予正确的最小权限。

#### 配置 DNS

1. 在 Azure 门户中，从您刚创建的新 SWA 中，从左侧菜单导航到 **Custom domains**。
1. 复制 Web 应用的 "CNAME" 值。
1. 使用您自己的账户，[提交 CNCF 工单](https://jira.linuxfoundation.org/secure/Dashboard.jspa)以创建一个映射到您复制的 CNAME 值的新域名。在此示例中，要为 Dapr v1.1 创建一个新域名，您需要请求映射到 `v1-1.docs.dapr.io`。

   请求解析可能需要一些时间。

1. 确认新域名后，返回门户中的静态 Web 应用。
1. 导航到 **Custom domains** 边栏选项卡并选择 **+ Add**。
1. 选择 **Custom domain on other DNS**。
1. 在 **Domain name** 下输入 `v1-1.docs.dapr.io`。点击 **Next**。
1. 将 **Hostname record type** 保留为 `CNAME`，并复制 **Value** 的值。
1. 点击 **Add**。
1. 导航到 `https://v1-1.docs.dapr.io` 并验证空白网站是否正确加载。

您可以对任何预览版本重复这些步骤。

### 在新的 Dapr 发布日期

1. 等待所有代码/容器/Helm chart 发布完成。
1. 将从 `release_v1.0` 到 `v1.0` 的 PR 合并。删除 release/v1.0 分支。
1. 将从 `release_v1.1` 到 `v1.1` 的 PR 合并。删除 release/v1.1 分支。
1. 将从 `release_v1.2` 到 `v1.2` 的 PR 合并。删除 release/v1.2 分支。

恭喜新的文档发布！🚀 🎉 🎈

## 拉取 SDK 文档更新

SDK 文档位于各个 SDK 仓库中。对 SDK 文档所做的更改会被推送到相关的 SDK 仓库。例如，要更新 Go SDK 文档，您需要将更改推送到 `dapr/go-sdk` 仓库。在您将最新的 `dapr/go-sdk` 提交拉取到 `dapr/docs` 当前版本分支之前，您的 Go SDK 文档更新不会反映在 Dapr 文档站点上。

要将 SDK 文档更新实时同步到 Dapr 文档站点，您需要执行一个简单的 `git pull`。此示例指的是 Go SDK，但适用于所有 SDK。

1. 将最新的上游拉取到本地 `dapr/docs` 版本分支中。

1. 更改到 `dapr/docs` 目录的根目录。

1. 更改到 Go SDK 仓库。此命令将您带出 `dapr/docs` 上下文并进入 `dapr/go-sdk` 上下文。

   ```bash
   cd sdkdocs/go
   ```

1. 切换到 `dapr/go-sdk` 中的 `main` 分支。

   ```bash
   git checkout main
   ```

1. 拉取最新的 Go SDK 提交。

   ```bash
   git pull upstream main
   ```

1. 更改到 `dapr/docs` 上下文以提交、推送和创建 PR。

## 后续步骤
