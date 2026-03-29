---
type: docs
title: "安装 Dapr CLI"
linkTitle: "安装 Dapr CLI"
weight: 10
description: "安装 Dapr CLI 作为运行 Dapr 相关任务的主要工具"
---

您将使用 Dapr CLI 作为各种 Dapr 相关任务的主要工具。您可以使用它来：

- 使用 Dapr 边车运行应用程序。
- 查看边车日志。
- 列出运行中的服务。
- 运行 Dapr 仪表板。

Dapr CLI 同时支持 [自托管]({{% ref self-hosted %}}) 和 [Kubernetes]({{% ref Kubernetes %}}) 环境。

{{% alert title="开始之前" color="primary" %}}
在 Docker Desktop 的高级选项中，请确认您已允许使用默认的 Docker socket。如果您在 Windows 上使用 WSL 集成，则此选项不可用。
   <img src="/images/docker-desktop-setting.png" width=800 style="padding-bottom:15px;">
{{% /alert %}}

### 步骤 1：安装 Dapr CLI

{{< tabpane text=true >}}

{{% tab header="Linux" text=true %}}

#### 从终端安装

将最新的 Linux Dapr CLI 安装到 `/usr/local/bin`：

```bash
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash
```

##### 安装特定 CLI 版本

以下示例展示如何安装 CLI 版本 `{{% dapr-latest-version cli="true" %}}`。您也可以通过指定版本号来安装候选版本（例如 `1.10.0-rc.3`）。

```bash
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash -s {{% dapr-latest-version cli="true" %}}
```


#### 不使用 `sudo` 安装

如果您没有 `sudo` 命令的访问权限，或者您的用户名不在 `sudoers` 文件中，您可以通过 `DAPR_INSTALL_DIR` 环境变量将 Dapr 安装到备用目录。该目录必须已存在且当前用户可访问。

```bash
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | DAPR_INSTALL_DIR="$HOME/dapr" /bin/bash
```

##### 不使用 `sudo` 安装特定 CLI 版本

以下示例展示如何安装 CLI 版本 `{{% dapr-latest-version cli="true" %}}`。您也可以通过指定版本号来安装候选版本（例如 `1.10.0-rc.3`）。

```bash
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | DAPR_INSTALL_DIR="$HOME/dapr" /bin/bash -s {{% dapr-latest-version cli="true" %}}
```

{{% /tab %}}

{{% tab header="Windows" text=true %}}

#### 从命令提示符安装

将最新的 Windows Dapr CLI 安装到 `$Env:SystemDrive\dapr`，并将此目录添加到用户 PATH 环境变量：

```powershell
powershell -Command "iwr -useb https://raw.githubusercontent.com/dapr/cli/master/install/install.ps1 | iex"
```

**注意：** PATH 更新可能需要重启终端应用程序后才能生效。

##### 安装特定 CLI 版本

以下示例展示如何安装 CLI 版本 `{{% dapr-latest-version cli="true" %}}`。您也可以通过指定版本号来安装候选版本（例如 `1.10.0-rc.3`）。

```powershell
powershell -Command "$script=iwr -useb https://raw.githubusercontent.com/dapr/cli/master/install/install.ps1; $block=[ScriptBlock]::Create($script); invoke-command -ScriptBlock $block -ArgumentList {{% dapr-latest-version cli="true" %}}"
```

#### 不使用管理员权限安装

如果您没有管理员权限，可以通过 `DAPR_INSTALL_DIR` 环境变量将 Dapr 安装到备用目录。如果目录不存在，以下脚本会创建该目录。

```powershell
$Env:DAPR_INSTALL_DIR = "<your_alt_install_dir_path>"
$script=iwr -useb https://raw.githubusercontent.com/dapr/cli/master/install/install.ps1; $block=[ScriptBlock]::Create($script); invoke-command -ScriptBlock $block -ArgumentList "", "$Env:DAPR_INSTALL_DIR"
```

#### 不使用管理员权限安装特定 CLI 版本

以下示例展示如何安装 CLI 版本 `{{% dapr-latest-version cli="true" %}}`。您也可以通过指定版本号来安装候选版本（例如 `1.10.0-rc.3`）。

```powershell
$Env:DAPR_INSTALL_DIR = "<your_alt_install_dir_path>"
$script=iwr -useb https://raw.githubusercontent.com/dapr/cli/master/install/install.ps1; $block=[ScriptBlock]::Create($script); invoke-command -ScriptBlock $block -ArgumentList "{{% dapr-latest-version cli="true" %}}", "$Env:DAPR_INSTALL_DIR"
```

#### 使用 winget 安装

将最新的 Windows Dapr CLI 安装到 `$Env:SystemDrive\dapr`，并将此目录添加到用户 PATH 环境变量：

```powershell
winget install Dapr.CLI
```

**预览版本：**

安装最新的预览版本：

```powershell
winget install Dapr.CLI.Preview
```

#### 使用 MSI 安装程序安装

每个 Dapr CLI 版本都包含 Windows 安装程序。您可以手动下载 MSI：

1. 从最新的 [Dapr Release](https://github.com/dapr/cli/releases) 下载 MSI 安装包 `dapr.msi`。
2. 导航到下载的 MSI 文件并双击运行。
3. 按照安装提示接受许可协议并选择安装目录。所选文件夹将被添加到用户 PATH 环境变量。默认值为 `$Env:SystemDrive\dapr`。
4. 点击 `Install` 开始安装。安装完成后，您会看到最终消息。

{{% /tab %}}

{{% tab header="MacOS" text=true %}}

### 从终端安装

将最新的 Darwin Dapr CLI 安装到 `/usr/local/bin`：

```bash
curl -fsSL https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | /bin/bash
```

##### 安装特定 CLI 版本

以下示例展示如何安装 CLI 版本 `{{% dapr-latest-version cli="true" %}}`。您也可以通过指定版本号来安装候选版本（例如 `1.10.0-rc.3`）。

```bash
curl -fsSL https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | /bin/bash -s {{% dapr-latest-version cli="true" %}}
```

**对于 ARM64 Mac：**

从终端安装时，提供原生 ARM64 二进制文件。

要安装 Rosetta 模拟：

```bash
softwareupdate --install-rosetta
```

#### 使用 Homebrew 安装

通过 [Homebrew](https://brew.sh) 安装：

```bash
brew install dapr/tap/dapr-cli
```

**对于 ARM64 Mac：**

对于 ARM64 Mac，支持 Homebrew 3.0 及更高版本。请将 Homebrew 更新到 3.0.0 或更高版本，然后运行以下命令：

```bash
arch -arm64 brew install dapr/tap/dapr-cli
```

#### 不使用 `sudo` 安装
如果您没有 `sudo` 命令的访问权限，或者您的用户名不在 `sudoers` 文件中，您可以通过 `DAPR_INSTALL_DIR` 环境变量将 Dapr 安装到备用目录。该目录必须已存在且当前用户可访问。

```bash
curl -fsSL https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | DAPR_INSTALL_DIR="$HOME/dapr" /bin/bash
```

##### 不使用 `sudo` 安装特定 CLI 版本

以下示例展示如何安装 CLI 版本 `{{% dapr-latest-version cli="true" %}}`。您也可以通过指定版本号来安装候选版本（例如 `1.10.0-rc.3`）。

```bash
curl -fsSL https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | DAPR_INSTALL_DIR="$HOME/dapr" -s {{% dapr-latest-version cli="true" %}}
```

{{% /tab %}}

{{% tab header="二进制文件" text=true %}}
每个 Dapr CLI 版本都包含各种操作系统和架构。您可以手动下载并安装这些二进制版本。

1. 从最新的 [Dapr Release](https://github.com/dapr/cli/releases) 下载所需的 Dapr CLI。
2. 解压缩文件（例如 dapr_linux_amd64.tar.gz、dapr_windows_amd64.zip）。
3. 将其移动到您想要的位置。
   - 对于 Linux/MacOS，建议使用 `/usr/local/bin`。
   - 对于 Windows，创建一个目录并将其添加到系统 PATH。例如：
     - 创建一个名为 `C:\dapr` 的目录。
     - 通过编辑系统环境变量，将新创建的目录添加到用户 PATH。

{{% /tab %}}

{{< /tabpane >}}


### 步骤 2：验证安装

通过重启终端/命令提示符并运行以下命令来验证 CLI 是否已安装：

```bash
dapr -h
```

**输出：**

```md
         __
    ____/ /___ _____  _____
   / __  / __ '/ __ \/ ___/
  / /_/ / /_/ / /_/ / /
  \__,_/\__,_/ .___/_/
              /_/

===============================
分布式应用运行时

Usage:
  dapr [command]

Available Commands:
  completion     生成 shell 自动补全脚本
  components     列出所有 Dapr 组件。支持平台：Kubernetes
  configurations 列出所有 Dapr 配置。支持平台：Kubernetes
  dashboard      启动 Dapr 仪表板。支持平台：Kubernetes 和自托管
  help           显示任意命令的帮助信息
  init           在支持的托管平台上安装 Dapr。支持平台：Kubernetes 和自托管
  invoke         调用给定 Dapr 应用的方法。支持平台：自托管
  list           列出所有 Dapr 实例。支持平台：Kubernetes 和自托管
  logs           获取应用的 Dapr 边车日志。支持平台：Kubernetes
  mtls           检查是否启用了 mTLS。支持平台：Kubernetes
  publish        发布发布订阅事件。支持平台：自托管
  run            并排运行 Dapr 和（可选的）您的应用。支持平台：自托管
  status         显示 Dapr 服务的健康状态。支持平台：Kubernetes
  stop           停止 Dapr 实例及其关联的应用。支持平台：自托管
  uninstall      卸载 Dapr 运行时。支持平台：Kubernetes 和自托管
  upgrade        升级集群中的 Dapr 控制平面安装。支持平台：Kubernetes
  version        打印 Dapr 运行时和 CLI 版本

Flags:
  -h, --help      dapr 的帮助信息
  -v, --version   dapr 的版本

使用 "dapr [command] --help" 获取有关命令的更多信息。
```

{{< button text="下一步：初始化 Dapr >>" page="install-dapr-selfhost.md" >}}
