---
type: docs
weight: 5000
title: "操作指南：在 GitHub Actions 工作流中使用 Dapr CLI"
linkTitle: "GitHub Actions"
description: "将 Dapr CLI 添加到你的 GitHub Actions 中，以便在你的环境中部署和管理 Dapr。"
aliases:
  - /zh-hans/developing-applications/integrations/github_actions/
---

Dapr 可以通过 GitHub Marketplace 中提供的 [Dapr tool installer](https://github.com/marketplace/actions/dapr-tool-installer) 与 GitHub Actions 集成。该安装程序会将 Dapr CLI 添加到你的工作流中，使你能够跨环境部署、管理和升级 Dapr。

## 通过 Dapr tool installer 安装 Dapr CLI

将以下安装程序代码片段复制并粘贴到你的应用程序 YAML 文件中：

```yaml
- name: Dapr tool installer
  uses: dapr/setup-dapr@v1
```

[`dapr/setup-dapr` action](https://github.com/dapr/setup-dapr) 会在 macOS、Linux 和 Windows 运行器上安装指定版本的 Dapr CLI。安装完成后，你可以运行任意 [Dapr CLI 命令]({{% ref cli %}}) 来管理你的 Dapr 环境。

有关所有输入参数的详细信息，请参阅 [`action.yml` 元数据文件](https://github.com/dapr/setup-dapr/blob/main/action.yml)。

## 示例

例如，对于使用 [Dapr extention for Azure Kubernetes Service (AKS)]({{% ref azure-kubernetes-service-extension.md %}}) 的应用程序，你的应用 YAML 文件将如下所示：

```yaml
- name: Install Dapr
  uses: dapr/setup-dapr@v1
  with:
    version: '{{% dapr-latest-version long="true" %}}'

- name: Initialize Dapr
  shell: bash
  run: |
    # 获取用于 dapr init 的 K8s 凭据
    az aks get-credentials --resource-group ${{ env.RG_NAME }} --name "${{ steps.azure-deployment.outputs.aksName }}"

    # 初始化 Dapr
    # 将 Dapr 初始化日志分组，以便这些行可以折叠。
    echo "::group::Initialize Dapr"
    dapr init --kubernetes --wait --runtime-version ${{ env.DAPR_VERSION }}
    echo "::endgroup::"

    dapr status --kubernetes
  working-directory: ./demos/demo3
```

## 后续步骤

- 进一步了解 [GitHub Actions](https://docs.github.com/en/actions)。
