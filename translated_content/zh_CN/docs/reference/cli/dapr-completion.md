---
type: docs
title: "completion CLI 命令参考"
linkTitle: "completion"
description: "completion CLI 命令的详细信息"
---

### Description

生成 shell 自动补全脚本

### Usage

```bash
dapr completion [flags]
dapr completion [command]
```

### Flags

| 名称           | 环境变量 | 默认值 | 描述              |
| -------------- | -------------------- | ------- | ------------------------ |
| `--help`, `-h` |                      |         | 显示此帮助信息 |

### Examples

#### 在 macOS 上使用 Homebrew 安装 bash 自动补全

如果运行 macOS 附带的 Bash 3.2：

```bash
brew install bash-completion
```

或者，如果运行 Bash 4.1+：

```bash
brew install bash-completion@2
```

将自动补全添加到你的自动补全目录：

```bash
dapr completion bash > $(brew --prefix)/etc/bash_completion.d/dapr
source ~/.bash_profile
```

#### 在 Linux 上安装 bash 自动补全

如果 Linux 上未安装 bash-completion，请通过你的发行版的包管理器安装 'bash-completion' 包。

将 dapr 的 bash 自动补全代码加载到当前 shell：

```bash
source <(dapr completion bash)
```

将 bash 自动补全代码写入文件并从 .bash_profile 加载：

```bash
dapr completion bash > ~/.dapr/completion.bash.inc
printf "source '$HOME/.dapr/completion.bash.inc'" >> $HOME/.bash_profile
source $HOME/.bash_profile
```

#### 在 macOS 上使用 Homebrew 安装 zsh 自动补全

如果 macOS 上未安装 zsh-completion，请安装 'zsh-completion' 包：

```bash
brew install zsh-completions
```

设置 dapr 的 zsh[1] 自动补全代码在启动时自动加载：
```bash
dapr completion zsh > "${fpath[1]}/_dapr"
source ~/.zshrc
```

#### 在 Linux 上安装 zsh 自动补全

如果 Linux 上未安装 zsh-completion，请通过你的发行版的包管理器安装 'zsh-completion' 包。

将 dapr 的 zsh 自动补全代码加载到当前 shell：

```bash
source <(dapr completion zsh)
```

设置 dapr 的 zsh[1] 自动补全代码在启动时自动加载：

```bash
dapr completion zsh > "${fpath[1]}/_dapr"
```

#### 在 Windows 上安装 Powershell 自动补全

如果 $PROFILE 不存在则创建：

```bash
if (!(Test-Path -Path $PROFILE )){ New-Item -Type File -Path $PROFILE -Force }
```

将自动补全添加到你的配置文件：

```bash
dapr completion powershell >> $PROFILE
```

### Available Commands

```txt
bash        生成 bash 自动补全脚本
powershell  生成 powershell 自动补全脚本
zsh         生成 zsh 自动补全脚本
```
