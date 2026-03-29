---
type: docs
title: "贡献概述"
linkTitle: "概述"
weight: 10
description: >
  向任何 Dapr 项目仓库贡献代码的通用指南
---

感谢您对 Dapr 的关注！
本文档提供了如何通过 Issues 和 Pull Requests 为 [Dapr 项目](https://github.com/dapr) 做贡献的指南。贡献还可以通过其他方式进行，例如参与社区电话会议、在 Issues 或 Pull Requests 中发表评论等。

有关社区参与和社区成员资格的更多信息，请参阅 [Dapr 社区仓库](https://github.com/dapr/community)。

## Dapr 仓库索引

以下是 Dapr 组织下可进行贡献的仓库列表：

1. **Docs**：此[仓库](https://github.com/dapr/docs)包含 Dapr 的文档。您可以通过更新现有文档、修复错误或添加新内容来改善用户体验和清晰度来做出贡献。请参阅 [文档贡献的具体指南]({{% ref contributing-docs %}})。

2. **Quickstarts**：Quickstarts [仓库](https://github.com/dapr/quickstarts) 提供了简单的分步指南，帮助用户快速入门 Dapr。[此仓库中的贡献](https://github.com/dapr/quickstarts/blob/master/CONTRIBUTING.md)包括创建新的快速入门教程、改进现有教程或确保它们与最新功能保持同步。

3. **Runtime**：Dapr 运行时[仓库](https://github.com/dapr/dapr)包含核心运行时组件。在这里，您可以通过修复错误、优化性能、实现新功能或增强现有功能来做出贡献。

4. **Components-contrib**：此[仓库](https://github.com/dapr/components-contrib)托管了 Dapr 的社区贡献组件集合。您可以通过添加新组件、改进现有组件或审查和测试社区贡献来做出贡献。

5. **SDKs**：Dapr SDK 为各种编程语言提供库，以便与 Dapr 交互。您可以通过改进 SDK 功能、修复错误或为新功能添加支持来做出贡献。请参阅特定 SDK 的[贡献指南]({{% ref sdk-contrib %}})。

6. **CLI**：Dapr CLI 在本地开发机器或 Kubernetes 集群上设置 Dapr，用于启动和管理 Dapr 实例。对 CLI 仓库的贡献包括添加新功能、修复错误、改进可用性以及确保与最新 Dapr 版本兼容。请参阅[开发指南](https://github.com/dapr/cli/blob/master/docs/development/development.md)以获取有关开始开发 Dapr CLI 的帮助。

## Issues

### Issue 类型

大多数 Dapr 仓库通常有 4 种类型的 Issue：

- Issue/Bug：您发现了代码中的错误，想要报告它，或创建一个 Issue 来跟踪该错误。
- Issue/Discussion：您有一些想法，需要其他人在讨论中提供意见，然后才能最终作为提案体现。
- Issue/Proposal：用于提议新想法或功能的条目。这允许在编写代码之前从其他人那里获得反馈。
- Issue/Question：如果您需要帮助或有疑问，请使用此 Issue 类型。

### 提交之前

在提交 Issue 之前，请确保已检查以下内容：

1. 是否是正确的仓库？
    - Dapr 项目分布在多个仓库中。如果不确定哪个仓库是正确的，请查看[仓库](https://github.com/dapr)列表。
1. 检查现有 Issue
    - 在创建新 Issue 之前，请在[开放的 Issue](https://github.com/dapr/dapr/issues) 中进行搜索，查看该 Issue 或功能请求是否已被提交。
    - 如果发现您的 Issue 已存在，请发表相关评论并添加您的[表情反应](https://github.com/blog/2119-add-reaction-to-pull-requests-issues-and-comments)。使用表情反应：
        - 👍 赞成
        - 👎 反对
1. 对于 Bug
    - 检查它不是环境问题。例如，如果在 Kubernetes 上运行，请确保前提条件已就位。（状态存储、绑定等）
    - 您应尽可能多地提供数据。这通常以日志和/或堆栈跟踪的形式提供。如果在 Kubernetes 或其他环境中运行，请查看 Dapr 服务（运行时、operator、placement service）的日志。获取日志的更多详细信息可以在[此处]({{% ref "logs-troubleshooting" %}})找到。
1. 对于提案
    - Dapr 运行时的许多更改可能需要 API 的更改。在这种情况下，讨论潜在功能的最佳地方是主 [Dapr 仓库](https://github.com/dapr/dapr)。
    - 其他示例可能包括绑定、状态存储或全新组件。

## Pull Requests

所有贡献都通过 Pull Requests 进行。要提交拟议的更改，请遵循此工作流程：

1. 确保已提出了一个 Issue（Bug 或提案），它为即将进行的贡献设定了预期。
1. Fork 相关的仓库并创建一个新分支
    - 一些 Dapr 仓库支持 [Codespaces]({{% ref codespaces %}}) 为您提供即时环境来构建和测试您的更改。
    - 有关设置 Dapr 开发环境的更多信息，请参阅[开发 Dapr 文档](https://github.com/dapr/dapr/blob/master/docs/development/developing-dapr.md)。
1. 创建您的更改
    - 代码更改需要测试
1. 为更改更新相关文档
1. 使用 [DCO 签名]({{% ref "contributing-overview#developer-certificate-of-origin-signing-your-work" %}})提交并打开 PR
1. 等待 CI 流程完成并确保所有检查都通过
1. 将分配项目维护者，您可以期待在几天内收到审查

#### 使用进行中的 PR 获取早期反馈

在投入太多时间之前进行沟通的好方法是创建一个"进行中"PR 并与您的审查者分享。标准做法是在 PR 标题中添加"[WIP]"前缀并分配 **do-not-merge** 标签。这将让查看您的 PR 的人知道它还没有完全成熟。

## 第三方代码的使用

- 第三方代码必须包含许可证。

## 开发者原创证书：签署您的工作

#### 每个提交都需要签名

开发者原创证书 (DCO) 是一种轻量级的方式，让贡献者证明他们编写了或有权利提交他们正在为项目贡献的代码。以下是 [DCO](https://developercertificate.org/) 的完整文本，为便于阅读进行了重新格式化：
```
By making a contribution to this project, I certify that:
    (a) The contribution was created in whole or in part by me and I have the right to submit it under the open source license indicated in the file; or
    (b) The contribution is based upon previous work that, to the best of my knowledge, is covered under an appropriate open source license and I have the right under that license to submit that work with modifications, whether created in whole or in part by me, under the same open source license (unless I am permitted to submit under a different license), as indicated in the file; or
    (c) The contribution was provided directly to me by some other person who certified (a), (b) or (c) and I have not modified it.
    (d) I understand and agree that this project and the contribution are public and that a record of the contribution (including all personal information I submit with it, including my sign-off) is maintained indefinitely and may be redistributed consistent with this project or the open source license(s) involved.
```
贡献者通过在提交消息中添加 `Signed-off-by` 行来签名证明他们遵守这些要求。

```
This is my commit message
Signed-off-by: Random J Developer <random@developer.example.org>
```
Git 甚至有一个 `-s` 命令行选项可以自动将此内容附加到您的提交消息中：
```
$ git commit -s -m 'This is my commit message'
```

每个 Pull Request 都会被检查是否包含有效的 Signed-off-by 行。

#### 我没有签署我的提交，现在怎么办？！

不用担心 - 您可以轻松地重新应用您的更改、签名并强制推送！

```
git checkout <branch-name>
git commit --amend --no-edit --signoff
git push --force-with-lease <remote-name> <branch-name>
```

## 行为准则

请参阅 [Dapr 社区行为准则](https://github.com/dapr/community/blob/master/CODE-OF-CONDUCT.md)。
