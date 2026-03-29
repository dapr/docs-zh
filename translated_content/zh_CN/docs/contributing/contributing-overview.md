---
type: docs
title: "贡献概述"
linkTitle: "概述"
weight: 10
description: >
  贡献到任何 Dapr 项目仓库的通用指南
---

感谢您对 Dapr 的关注！
本文档提供了如何通过 issue 和 pull request 为 [Dapr 项目](https://github.com/dapr) 做出贡献的指南。您还可以通过其他方式做出贡献，例如参与社区电话会议、评论 issue 或 pull request 等。

有关社区参与和社区成员资格的更多信息，请参阅 [Dapr 社区仓库](https://github.com/dapr/community)。

## Dapr 仓库索引

以下是 Dapr 组织下您可以做出贡献的仓库列表：

1. **Docs**：此[仓库](https://github.com/dapr/docs)包含 Dapr 的文档。您可以通过更新现有文档、修复错误或添加新内容来做出贡献，以改善用户体验和清晰度。请参阅[文档贡献]({{% ref contributing-docs %}})的具体指南。

2. **Quickstarts**：Quickstarts [仓库](https://github.com/dapr/quickstarts)提供简单、分步指南，帮助用户快速入门 Dapr。[此仓库的贡献](https://github.com/dapr/quickstarts/blob/master/CONTRIBUTING.md)包括创建新的快速入门指南、改进现有指南，或确保它们与最新功能保持同步。

3. **Runtime**：Dapr runtime [仓库](https://github.com/dapr/dapr)包含核心运行时组件。在这里，您可以通过修复 bug、优化性能、实现新功能或增强现有功能来做出贡献。

4. **Components-contrib**：此[仓库](https://github.com/dapr/components-contrib)托管了社区为 Dapr 贡献的组件集合。您可以通过添加新组件、改进现有组件或审查和测试社区贡献来做出贡献。

5. **SDKs**：Dapr SDK 为各种编程语言提供与 Dapr 交互的库。您可以通过改进 SDK 功能、修复 bug 或添加对新功能的支持来做出贡献。请参阅特定 SDK 的[贡献指南]({{% ref sdk-contrib %}})。

6. **CLI**：Dapr CLI 在本地开发机器或 Kubernetes 集群上设置 Dapr，用于启动和管理 Dapr 实例。对 CLI 仓库的贡献包括添加新功能、修复 bug、改善可用性，以及确保与最新 Dapr 版本的兼容性。请参阅[开发指南](https://github.com/dapr/cli/blob/master/docs/development/development.md)以帮助您开始开发 Dapr CLI。

## Issues

### Issue 类型

在大多数 Dapr 仓库中，通常有 4 种类型的 issue：

- Issue/Bug：您在代码中发现了一个 bug，想要报告它，或创建一个 issue 来跟踪该 bug。
- Issue/Discussion：您有一些想法，需要其他人通过讨论提供意见，最终形成提案。
- Issue/Proposal：用于提出新想法或功能的项目。这允许在编写代码之前获得他人的反馈。
- Issue/Question：如果您需要帮助或有疑问，请使用此 issue 类型。

### 提交之前

在提交 issue 之前，请确保您已检查以下内容：

1. 是否选择了正确的仓库？
    - Dapr 项目分布在多个仓库中。如果您不确定哪个仓库是正确的，请查看[仓库列表](https://github.com/dapr)。
1. 检查现有 issue
    - 在创建新 issue 之前，请在[开放 issue](https://github.com/dapr/dapr/issues)中进行搜索，查看是否已提交了该 issue 或功能请求。
    - 如果您发现您的 issue 已存在，请发表相关评论并添加您的[反应](https://github.com/blog/2119-add-reaction-to-pull-requests-issues-and-comments)。使用反应：
        - 👍 赞成
        - 👎 反对
1. 对于 bug
    - 检查这是否是环境问题。例如，如果在 Kubernetes 上运行，请确保已满足先决条件（状态存储、绑定等）。
    - 您拥有尽可能多的数据。这通常采用日志和/或堆栈跟踪的形式。如果在 Kubernetes 或其他环境中运行，请查看 Dapr 服务（运行时、operator、placement 服务）的日志。有关如何获取日志的更多详细信息，请参见[此处]({{% ref "logs-troubleshooting" %}})。
1. 对于提案
    - 对 Dapr 运行时的许多更改可能需要更改 API。在这种情况下，讨论潜在功能的最佳位置是主 [Dapr 仓库](https://github.com/dapr/dapr)。
    - 其他示例可能包括绑定、状态存储或全新的组件。


## Pull Requests

所有贡献都通过 pull requests 提交。要提交建议的更改，请遵循此工作流程：

1. 确保已提出 issue（bug 或提案），为您即将做出的贡献设定预期。
1. Fork 相关仓库并创建新分支
    - 某些 Dapr 仓库支持 [Codespaces]({{% ref codespaces %}})为您提供即时环境来构建和测试您的更改。
    - 有关设置 Dapr 开发环境的更多信息，请参阅[开发 Dapr 文档](https://github.com/dapr/dapr/blob/master/docs/development/developing-dapr.md)。
1. 创建您的更改
    - 代码更改需要测试
1. 更改的相关文档
1. 使用 [DCO 签署]({{% ref "contributing-overview#developer-certificate-of-origin-signing-your-work" %}})提交并打开 PR
1. 等待 CI 过程完成，确保所有检查都通过
1. 将分配一名项目维护者，您可以在几天内收到审查


#### 使用进行中的 PR 获取早期反馈

在投入太多时间之前进行交流的一个好方法是创建一个"进行中"的 PR 并与您的审查者分享。执行此操作的标准方法是在 PR 标题中添加"[WIP]"前缀并分配 **do-not-merge** 标签。这将让查看您的 PR 的人知道它还不够完善。

## 第三方代码的使用

- 第三方代码必须包含许可证。

## 开发者来源证书：签署您的工作
#### 每个提交都需要签署

开发者来源证书 (DCO) 是贡献者证明他们编写或有权提交他们贡献给项目的代码的一种轻量级方式。以下是完整的 [DCO](https://developercertificate.org/)文本，为便于阅读而重新格式化：
```
By making a contribution to this project, I certify that:
    (a) The contribution was created in whole or in part by me and I have the right to submit it under the open source license indicated in the file; or
    (b) The contribution is based upon previous work that, to the best of my knowledge, is covered under an appropriate open source license and I have the right under that license to submit that work with modifications, whether created in whole or in part by me, under the same open source license (unless I am permitted to submit under a different license), as indicated in the file; or
    (c) The contribution was provided directly to me by some other person who certified (a), (b) or (c) and I have not modified it.
    (d) I understand and agree that this project and the contribution are public and that a record of the contribution (including all personal information I submit with it, including my sign-off) is maintained indefinitely and may be redistributed consistent with this project or the open source license(s) involved.
```
贡献者通过在提交消息中添加 `Signed-off-by` 行来签署他们遵守这些要求。

```
This is my commit message
Signed-off-by: Random J Developer <random@developer.example.org>
```
Git 甚至有一个 `-s` 命令行选项可以自动将其附加到您的提交消息中：
```
$ git commit -s -m 'This is my commit message'
```

每个 Pull Request 都会检查 Pull Request 中的提交是否包含有效的 Signed-off-by 行。

#### 我没有签署我的提交，现在怎么办？！

别担心 - 您可以轻松重播您的更改、签署它们并强制推送！

```
git checkout <branch-name>
git commit --amend --no-edit --signoff
git push --force-with-lease <remote-name> <branch-name>
```

## 行为准则

请参阅 [Dapr 社区行为准则](https://github.com/dapr/community/blob/master/CODE-OF-CONDUCT.md)。
