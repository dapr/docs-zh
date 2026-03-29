---
type: docs
weight: 5000
title: "如何：在 GitHub Actions 工作流中使用 Dapr CLI"
linkTitle: "GitHub Actions"
description: "将 Dapr CLI 添加到 GitHub Actions 中，以便在你的环境中部署和管理 Dapr。"
---

Dapr 可以通过 GitHub Marketplace 中的 [Dapr tool installer](https://github.com/marketplace/actions/dapr-tool-installer) 与 GitHub Actions 集成。该安装程序将 Dapr CLI 添加到你的工作流，使你能够在各个环境中部署、管理和升级 Dapr。

## 通过 Dapr 工具安装程序安装 Dapr CLI

将以下安装程序代码片段复制并粘贴到应用程序的 YAML 文件中：

```yaml
- name: Dapr tool installer
  uses: dapr/setup-dapr@v1
```

[`dapr/setup-dapr` action](https://github.com/dapr/setup-dapr) 会在 macOS、Linux 和 Windows 运行器上安装指定版本的 Dapr CLI。安装完成后，你可以运行任何 [Dapr CLI 命令]({{% ref cli %}}) 来管理 Dapr 环境。

有关所有输入的详细信息，请参阅 [`action.yml` 元数据文件](https://github.com/dapr/setup-dapr/blob/main/action.yml)。

## 示例

例如，对于使用 [Azure Kubernetes Service (AKS) 的 Dapr 扩展]({{% ref azure-kubernetes-service-extension.md %}}) 的应用程序，应用程序 YAML 将如下所示：

```yaml
- name: Install Dapr
  uses: dapr/setup-dapr@v1
  with:
    version: '{{% dapr-latest-version long="true" %}}'

- name: Initialize Dapr
  shell: bash
  run: |
    # Get the credentials to K8s to use with dapr init
    az aks get-credentials --resource-group ${{ env.RG_NAME }} --name "${{ steps.azure-deployment.outputs.aksName }}"

    # Initialize Dapr    
    # Group the Dapr init logs so these lines can be collapsed.
    echo "::group::Initialize Dapr"
    dapr init --kubernetes --wait --runtime-version ${{ env.DAPR_VERSION }}
    echo "::endgroup::"

    dapr status --kubernetes
  working-directory: ./demos/demo3
```

## 后续步骤

- 了解更多关于 [GitHub Actions](https://docs.github.com/en/actions) 的信息。
