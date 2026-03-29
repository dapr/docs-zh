---
type: docs
title: "支持的运行时和 SDK 版本"
linkTitle: "支持的版本"
weight: 2000
description: "运行时和 SDK 版本支持以及升级策略"
---

## 简介

本主题详细介绍了 Dapr 版本的支持版本、升级策略，以及如何在所有 Dapr 仓库（运行时、CLI、SDK 等）的 1.x 及以上版本中传达弃用和重大更改。

Dapr 版本使用 `MAJOR.MINOR.PATCH` 版本控制。例如，1.0.0。

| 版本控制 | 描述 |
| ---------- | ----------- |
| `MAJOR`    | 当运行时发生不向后兼容的更改（例如 API 更改）时更新。当发生被认为重要的功能添加/更改需要与先前版本区分时，也可能发生 `MAJOR` 版本发布。 |
| `MINOR`    | 作为定期发布节奏的一部分更新，包括新功能、错误和安全修复。 |
| `PATCH`    | 针对关键问题（P0）和安全热修复进行递增。 |

支持的版本意味着：

- 如果版本存在关键问题（如主线中断场景或安全问题），则会发布热修复补丁。每个问题都会根据具体情况进行审查。
- 会对支持的版本调查问题。如果版本不再受支持，您需要升级到较新的版本并确定问题是否仍然相关。

从 1.8.0 版本开始，支持三个（3）版本的 Dapr；当前版本和前两个（2）版本。通常是 `MINOR` 版本更新。这意味着支持的版本有一个向前移动的滚动窗口，保持与这些受支持版本的最新状态是您的运营责任。如果您使用的是较旧版本的 Dapr，您可能需要进行中间升级才能到达受支持的版本。

主要.次要版本发布之间至少有 13 周（3 个月）的时间，为用户从非支持版本升级提供至少 9 个月的滚动窗口。有关发布流程的更多详细信息，请阅读[发布周期和节奏](https://github.com/dapr/community/blob/master/release-process.md)

补丁支持适用于支持的版本（当前和先前版本）。

## 构建变体

Dapr 的边车镜像发布到 [GitHub Container Registry](https://github.com/dapr/dapr/pkgs/container/daprd) 和 [Docker Registry](https://hub.docker.com/r/daprio/daprd/tags)。默认镜像包含所有组件。从 1.11 版本开始，Dapr 还提供了一种边车镜像变体，仅包含稳定组件。

* 默认边车镜像：`daprio/daprd:<version>` 或 `ghcr.io/dapr/daprd:<version>`（例如 `ghcr.io/dapr/daprd:1.11.1`）
* 稳定组件边车镜像：`daprio/daprd:<version>-stablecomponents` 或 `ghcr.io/dapr/daprd:<version>-stablecomponents`（例如 `ghcr.io/dapr/daprd:1.11.1-stablecomponents`）

在 Kubernetes 上，可以使用 `dapr.io/sidecar-image` 注解覆盖应用程序 Deployment 资源的边车镜像。有关 [Dapr 的参数和注解]({{% ref "arguments-annotations-overview.md" %}}) 的更多信息。如果未指定，则使用默认的 'daprio/daprd:latest' 镜像。

了解有关 [Dapr 组件认证生命周期]({{% ref "certification-lifecycle.md" %}}) 的更多信息。

## 支持的版本

下表显示已经过一起测试并构成"打包"版本的 Dapr 版本。不支持任何其他版本组合。

| 发布日期 | 运行时     | CLI  | SDK  | 仪表盘  | 状态 | 发布说明 |
|--------------------|:--------:|:--------|---------|---------|---------|------------|
| 2026 年 3 月 19 日 | 1.17.2</br> | 1.17.0 | Java 1.17.0 </br>Go 1.14.2 </br>PHP 1.2.0 </br>Python 1.17.0 </br>.NET 1.17.5 </br>JS 3.6.0 </br>Rust 0.17.0 | 0.15.0 | 支持（当前） | [v1.17.2 发布说明](https://github.com/dapr/dapr/releases/tag/v1.17.2)   |
| 2026 年 3 月 9 日 | 1.17.1</br> | 1.17.0 | Java 1.17.0 </br>Go 1.14.1 </br>PHP 1.2.0 </br>Python 1.17.0 </br>.NET 1.17.3 </br>JS 3.6.0 </br>Rust 0.17.0 | 0.15.0 | 支持 | [v1.17.1 发布说明](https://github.com/dapr/dapr/releases/tag/v1.17.1)   |
| 2026 年 2 月 26 日 | 1.17.0</br> | 1.17.0 | Java 1.17.0 </br>Go 1.14.0 </br>PHP 1.2.0 </br>Python 1.17.0 </br>.NET 1.17.0 </br>JS 3.6.0 </br>Rust 0.17.0 | 0.15.0 | 支持 | [v1.17.0 发布说明](https://github.com/dapr/dapr/releases/tag/v1.17.0)   |
| 2026 年 2 月 12 日 | 1.16.9</br> | 1.16.5 | Java 1.16.0 </br>Go 1.13.0 </br>PHP 1.2.0 </br>Python 1.16.0 </br>.NET 1.16.0 </br>JS 3.6.0 </br>Rust 0.17.0 | 0.15.0 | 支持 | [v1.16.9 发布说明](https://github.com/dapr/dapr/releases/tag/v1.16.9)   |
| 2026 年 1 月 26 日 | 1.16.8</br> | 1.16.5 | Java 1.16.0 </br>Go 1.13.0 </br>PHP 1.2.0 </br>Python 1.16.0 </br>.NET 1.16.0 </br>JS 3.6.0 </br>Rust 0.17.0 | 0.15.0 | 支持 | [v1.16.8 发布说明](https://github.com/dapr/dapr/releases/tag/v1.16.8)   |
| 2026 年 1 月 20 日 | 1.16.7</br> | 1.16.5 | Java 1.16.0 </br>Go 1.13.0 </br>PHP 1.2.0 </br>Python 1.16.0 </br>.NET 1.16.0 </br>JS 3.6.0 </br>Rust 0.17.0 | 0.15.0 | 支持 | [v1.16.7 发布说明](https://github.com/dapr/dapr/releases/tag/v1.16.7)   |
| 2026 年 1 月 20 日 | 1.16.7</br> | 1.16.5 | Java 1.16.0 </br>Go 1.13.0 </br>PHP 1.2.0 </br>Python 1.16.0 </br>.NET 1.16.0 </br>JS 3.6.0 </br>Rust 0.17.0 | 0.15.0 | 支持 | [v1.16.7 发布说明](https://github.com/dapr/dapr/releases/tag/v1.16.7)   |
| 2026 年 1 月 9 日 | 1.16.6</br> | 1.16.5 | Java 1.16.0 </br>Go 1.13.0 </br>PHP 1.2.0 </br>Python 1.16.0 </br>.NET 1.16.0 </br>JS 3.6.0 </br>Rust 0.17.0 | 0.15.0 | 支持 | [v1.16.6 发布说明](https://github.com/dapr/dapr/releases/tag/v1.16.6)   |
| 2025 年 12 月 19 日 | 1.16.5</br> | 1.16.5 | Java 1.16.0 </br>Go 1.13.0 </br>PHP 1.2.0 </br>Python 1.16.0 </br>.NET 1.16.0 </br>JS 3.6.0 </br>Rust 0.17.0 | 0.15.0 | 支持 | [v1.16.5 发布说明](https://github.com/dapr/dapr/releases/tag/v1.16.5)   |
| 2025 年 12 月 8 日 | 1.16.4</br> | 1.16.5 | Java 1.16.0 </br>Go 1.13.0 </br>PHP 1.2.0 </br>Python 1.16.0 </br>.NET 1.16.0 </br>JS 3.6.0 </br>Rust 0.17.0 | 0.15.0 | 支持 | [v1.16.4 发布说明](https://github.com/dapr/dapr/releases/tag/v1.16.4)   |
| 2025 年 11 月 21 日| 1.16.3</br> | 1.16.4 | Java 1.16.0 </br>Go 1.13.0 </br>PHP 1.2.0 </br>Python 1.16.0 </br>.NET 1.16.0 </br>JS 3.6.0 </br>Rust 0.17.0 | 0.15.0 | 支持 | [v1.16.3 发布说明](https://github.com/dapr/dapr/releases/tag/v1.16.3)   |
| 2025 年 10 月 30 日 | 1.16.2</br>  | 1.16.3 | Java 1.16.0 </br>Go 1.13.0 </br>PHP 1.2.0 </br>Python 1.16.0 </br>.NET 1.16.0 </br>JS 3.6.0 </br>Rust 0.17.0 | 0.15.0 | 支持 | [v1.16.2 发布说明](https://github.com/dapr/dapr/releases/tag/v1.16.2) |
| 2025 年 10 月 6 日 | 1.16.1</br>  | 1.16.1 | Java 1.16.0 </br>Go 1.13.0 </br>PHP 1.2.0 </br>Python 1.16.0 </br>.NET 1.16.0 </br>JS 3.6.0 </br>Rust 0.17.0 | 0.15.0 | 支持 | [v1.16.1 发布说明](https://github.com/dapr/dapr/releases/tag/v1.16.1) |
| 2025 年 9 月 16 日 | 1.16.0</br>  | 1.16.0 | Java 1.16.0 </br>Go 1.13.0 </br>PHP 1.2.0 </br>Python 1.16.0 </br>.NET 1.16.0 </br>JS 3.6.0 </br>Rust 0.17.0 | 0.15.0 | 支持 | [v1.16.0 发布说明](https://github.com/dapr/dapr/releases/tag/v1.16.0) |
| 2025 年 9 月 17 日 | 1.15.12</br>  | 1.15.0 | Java 1.14.2, 1.15.0 </br>Go 1.12.0 </br>PHP 1.2.0 </br>Python 1.15.0 </br>.NET 1.15.4 </br>JS 3.5.2 </br>Rust 0.16.1 | 0.15.0 | 支持 | [v1.15.12 发布说明](https://github.com/dapr/dapr/releases/tag/v1.15.12) |
| 2025 年 8 月 28 日 | 1.15.11</br>  | 1.15.0 | Java 1.14.2, 1.15.0 </br>Go 1.12.0 </br>PHP 1.2.0 </br>Python 1.15.0 </br>.NET 1.15.4 </br>JS 3.5.2 </br>Rust 0.16.1 | 0.15.0 | 支持 | [v1.15.11 发布说明](https://github.com/dapr/dapr/releases/tag/v1.15.11) |
| 2025 年 8 月 21 日 | 1.15.10</br>  | 1.15.0 | Java 1.14.2, 1.15.0 </br>Go 1.12.0 </br>PHP 1.2.0 </br>Python 1.15.0 </br>.NET 1.15.4 </br>JS 3.5.2 </br>Rust 0.16.1 | 0.15.0 | 支持 | [v1.15.10 发布说明](https://github.com/dapr/dapr/releases/tag/v1.15.10) |
| 2025 年 7 月 31 日 | 1.15.9</br>  | 1.15.0 | Java 1.14.2, 1.15.0 </br>Go 1.12.0 </br>PHP 1.2.0 </br>Python 1.15.0 </br>.NET 1.15.4 </br>JS 3.5.2 </br>Rust 0.16.1 | 0.15.0 | 支持 | [v1.15.9 发布说明](https://github.com/dapr/dapr/releases/tag/v1.15.9) |
| 2025 年 7 月 18 日 | 1.15.8</br>  | 1.15.0 | Java 1.14.2, 1.15.0 </br>Go 1.12.0 </br>PHP 1.2.0 </br>Python 1.15.0 </br>.NET 1.15.4 </br>JS 3.5.2 </br>Rust 0.16.1 | 0.15.0 | 支持 | [v1.15.8 发布说明](https://github.com/dapr/dapr/releases/tag/v1.15.8) |
| 2025 年 7 月 16 日 | 1.15.7</br>  | 1.15.0 | Java 1.14.1, 1.15.0 </br>Go 1.12.0 </br>PHP 1.2.0 </br>Python 1.15.0 </br>.NET 1.15.4 </br>JS 3.5.2 </br>Rust 0.16.1 | 0.15.0 | 支持 | [v1.15.7 发布说明](https://github.com/dapr/dapr/releases/tag/v1.15.7) |
| 2025 年 6 月 20 日 | 1.15.6</br>  | 1.15.0 | Java 1.14.1, 1.15.0 </br>Go 1.12.0 </br>PHP 1.2.0 </br>Python 1.15.0 </br>.NET 1.15.4 </br>JS 3.5.2 </br>Rust 0.16.1 | 0.15.0 | 支持 | [v1.15.6 发布说明](https://github.com/dapr/dapr/releases/tag/v1.15.6) |
| 2025 年 5 月 5 日 | 1.15.5</br>  | 1.15.0 | Java 1.14.1, 1.15.0 </br>Go 1.12.0 </br>PHP 1.2.0 </br>Python 1.15.0 </br>.NET 1.15.4 </br>JS 3.5.2 </br>Rust 0.16.1 | 0.15.0 | 支持 | [v1.15.5 发布说明](https://github.com/dapr/dapr/releases/tag/v1.15.5) |
| 2025 年 4 月 4 日 | 1.15.4</br>  | 1.15.0 | Java 1.14.0, 1.15.0 </br>Go 1.12.0 </br>PHP 1.2.0 </br>Python 1.15.0 </br>.NET 1.15.4 </br>JS 3.5.2 </br>Rust 0.16.1 | 0.15.0 | 支持 | [v1.15.4 发布说明](https://github.com/dapr/dapr/releases/tag/v1.15.4) |
| 2025 年 3 月 5 日 | 1.15.3</br>  | 1.15.0 | Java 1.14.0, 1.15.0 </br>Go 1.12.0 </br>PHP 1.2.0 </br>Python 1.15.0 </br>.NET 1.15.4 </br>JS 3.5.2 </br>Rust 0.16.1 | 0.15.0 | 支持 | [v1.15.3 发布说明](https://github.com/dapr/dapr/releases/tag/v1.15.3) |
| 2025 年 3 月 3 日 | 1.15.2</br>  | 1.15.0 | Java 1.14.0, 1.15.0 </br>Go 1.12.0 </br>PHP 1.2.0 </br>Python 1.15.0 </br>.NET 1.15.0 </br>JS 3.5.0 </br>Rust 0.16 | 0.15.0 | 支持 | [v1.15.2 发布说明](https://github.com/dapr/dapr/releases/tag/v1.15.2) |
| 2025 年 2 月 28 日 | 1.15.1</br>  | 1.15.0 | Java 1.14.0, 1.15.0 </br>Go 1.12.0 </br>PHP 1.2.0 </br>Python 1.15.0 </br>.NET 1.15.0 </br>JS 3.5.0 </br>Rust 0.16 | 0.15.0 | 支持 | [v1.15.1 发布说明](https://github.com/dapr/dapr/releases/tag/v1.15.1) |
| 2025 年 2 月 27 日 | 1.15.0</br>  | 1.15.0 | Java 1.14.0, 1.15.0 </br>Go 1.12.0 </br>PHP 1.2.0 </br>Python 1.15.0 </br>.NET 1.15.0 </br>JS 3.5.0 </br>Rust 0.16 | 0.15.0 | 支持 | [v1.15.0 发布说明](https://github.com/dapr/dapr/releases/tag/v1.15.0) |
| 2024 年 9 月 16 日 | 1.14.4</br>  | 1.14.1 | Java 1.12.0 </br>Go 1.11.0 </br>PHP 1.2.0 </br>Python 1.14.0 </br>.NET 1.14.0 </br>JS 3.3.1 | 0.15.0 | 不支持 | [v1.14.4 发布说明](https://github.com/dapr/dapr/releases/tag/v1.14.4) |
| 2024 年 9 月 13 日 | 1.14.3</br>  | 1.14.1 | Java 1.12.0 </br>Go 1.11.0 </br>PHP 1.2.0 </br>Python 1.14.0 </br>.NET 1.14.0 </br>JS 3.3.1 | 0.15.0 | ⚠️ 已召回 | [v1.14.3 发布说明](https://github.com/dapr/dapr/releases/tag/v1.14.3) |
| 2024 年 9 月 6 日 | 1.14.2</br>  | 1.14.1 | Java 1.12.0 </br>Go 1.11.0 </br>PHP 1.2.0 </br>Python 1.14.0 </br>.NET 1.14.0 </br>JS 3.3.1 | 0.15.0 | 不支持 | [v1.14.2 发布说明](https://github.com/dapr/dapr/releases/tag/v1.14.2) |
| 2024 年 8 月 14 日 | 1.14.1</br>  | 1.14.1 | Java 1.12.0 </br>Go 1.11.0 </br>PHP 1.2.0 </br>Python 1.14.0 </br>.NET 1.14.0 </br>JS 3.3.1 | 0.15.0 | 不支持 | [v1.14.1 发布说明](https://github.com/dapr/dapr/releases/tag/v1.14.1) |
| 2024 年 8 月 14 日 | 1.14.0</br>  | 1.14.0 | Java 1.12.0 </br>Go 1.11.0 </br>PHP 1.2.0 </br>Python 1.14.0 </br>.NET 1.14.0 </br>JS 3.3.1 | 0.15.0 | 不支持 | [v1.14.0 发布说明](https://github.com/dapr/dapr/releases/tag/v1.14.0) |
| 2024 年 5 月 29 日 | 1.13.4</br>  | 1.13.0 | Java 1.11.0 </br>Go 1.10.0 </br>PHP 1.2.0 </br>Python 1.13.0 </br>.NET 1.13.0 </br>JS 3.3.0 | 0.14.0 | 不支持  | [v1.13.4 发布说明](https://github.com/dapr/dapr/releases/tag/v1.13.4) |
| 2024 年 5 月 21 日 | 1.13.3</br>  | 1.13.0 | Java 1.11.0 </br>Go 1.10.0 </br>PHP 1.2.0 </br>Python 1.13.0 </br>.NET 1.13.0 </br>JS 3.3.0 | 0.14.0 | 不支持 | [v1.13.3 发布说明](https://github.com/dapr/dapr/releases/tag/v1.13.3) |
| 2024 年 4 月 3 日 | 1.13.2</br>  | 1.13.0 | Java 1.11.0 </br>Go 1.10.0 </br>PHP 1.2.0 </br>Python 1.13.0 </br>.NET 1.13.0 </br>JS 3.3.0 | 0.14.0 | 不支持 | [v1.13.2 发布说明](https://github.com/dapr/dapr/releases/tag/v1.13.2) |
| 2024 年 3 月 26 日 | 1.13.1</br>  | 1.13.0 | Java 1.11.0 </br>Go 1.10.0 </br>PHP 1.2.0 </br>Python 1.13.0 </br>.NET 1.13.0 </br>JS 3.3.0 | 0.14.0 | 不支持 | [v1.13.1 发布说明](https://github.com/dapr/dapr/releases/tag/v1.13.1) |
| 2024 年 3 月 6 日 | 1.13.0</br>  | 1.13.0 | Java 1.11.0 </br>Go 1.10.0 </br>PHP 1.2.0 </br>Python 1.13.0 </br>.NET 1.13.0 </br>JS 3.3.0 | 0.14.0 | 不支持 | [v1.13.0 发布说明](https://github.com/dapr/dapr/releases/tag/v1.13.0) |
| 2024 年 1 月 17 日 | 1.12.4</br>  | 1.12.0 | Java 1.10.0 </br>Go 1.9.1 </br>PHP 1.2.0 </br>Python 1.12.0 </br>.NET 1.12.0 </br>JS 3.2.0 | 0.14.0 | 不支持 | [v1.12.4 发布说明](https://github.com/dapr/dapr/releases/tag/v1.12.4) |
| 2024 年 1 月 2 日 | 1.12.3</br>  | 1.12.0 | Java 1.10.0 </br>Go 1.9.1 </br>PHP 1.2.0 </br>Python 1.12.0 </br>.NET 1.12.0 </br>JS 3.2.0 | 0.14.0 | 不支持 | [v1.12.3 发布说明](https://github.com/dapr/dapr/releases/tag/v1.12.3) |
| 2023 年 11 月 18 日 | 1.12.2</br>  | 1.12.0 | Java 1.10.0 </br>Go 1.9.1 </br>PHP 1.2.0 </br>Python 1.12.0 </br>.NET 1.12.0 </br>JS 3.2.0 | 0.14.0 | 不支持 | [v1.12.2 发布说明](https://github.com/dapr/dapr/releases/tag/v1.12.2) |
| 2023 年 11 月 16 日 | 1.12.1</br>  | 1.12.0 | Java 1.10.0 </br>Go 1.9.1 </br>PHP 1.2.0 </br>Python 1.12.0 </br>.NET 1.12.0 </br>JS 3.2.0 | 0.14.0 | 不支持 | [v1.12.1 发布说明](https://github.com/dapr/dapr/releases/tag/v1.12.1) |
| 2023 年 10 月 11 日 | 1.12.0</br>  | 1.12.0 | Java 1.10.0 </br>Go 1.9.0 </br>PHP 1.1.0 </br>Python 1.11.0 </br>.NET 1.12.0 </br>JS 3.1.2 | 0.14.0 | 不支持 | [v1.12.0 发布说明](https://github.com/dapr/dapr/releases/tag/v1.12.0) |
| 2023 年 11 月 18 日 | 1.11.6</br>  | 1.11.0 | Java 1.9.0 </br>Go 1.8.0 </br>PHP 1.1.0 </br>Python 1.10.0 </br>.NET 1.11.0 </br>JS 3.1.0 | 0.13.0 | 不支持 | [v1.11.6 发布说明](https://github.com/dapr/dapr/releases/tag/v1.11.6) |
| 2023 年 11 月 3 日 | 1.11.5</br>  | 1.11.0 | Java 1.9.0 </br>Go 1.8.0 </br>PHP 1.1.0 </br>Python 1.10.0 </br>.NET 1.11.0 </br>JS 3.1.0 | 0.13.0 | 不支持 | [v1.11.5 发布说明](https://github.com/dapr/dapr/releases/tag/v1.11.5) |
| 2023 年 10 月 5 日 | 1.11.4</br>  | 1.11.0 | Java 1.9.0 </br>Go 1.8.0 </br>PHP 1.1.0 </br>Python 1.10.0 </br>.NET 1.11.0 </br>JS 3.1.0 | 0.13.0 | 不支持 | [v1.11.4 发布说明](https://github.com/dapr/dapr/releases/tag/v1.11.4) |
| 2023 年 8 月 31 日 | 1.11.3</br>  | 1.11.0 | Java 1.9.0 </br>Go 1.8.0 </br>PHP 1.1.0 </br>Python 1.10.0 </br>.NET 1.11.0 </br>JS 3.1.0 | 0.13.0 | 不支持 | [v1.11.3 发布说明](https://github.com/dapr/dapr/releases/tag/v1.11.3) |
| 2023 年 7 月 20 日 | 1.11.2</br>  | 1.11.0 | Java 1.9.0 </br>Go 1.8.0 </br>PHP 1.1.0 </br>Python 1.10.0 </br>.NET 1.11.0 </br>JS 3.1.0 | 0.13.0 | 不支持 | [v1.11.2 发布说明](https://github.com/dapr/dapr/releases/tag/v1.11.2) |
| 2023 年 6 月 22 日 | 1.11.1</br>  | 1.11.0 | Java 1.9.0 </br>Go 1.8.0 </br>PHP 1.1.0 </br>Python 1.10.0 </br>.NET 1.11.0 </br>JS 3.1.0 | 0.13.0 | 不支持 | [v1.11.1 发布说明](https://github.com/dapr/dapr/releases/tag/v1.11.1) |
| 2023 年 6 月 12 日 | 1.11.0</br>  | 1.11.0 | Java 1.9.0 </br>Go 1.8.0 </br>PHP 1.1.0 </br>Python 1.10.0 </br>.NET 1.11.0 </br>JS 3.1.0 | 0.13.0 | 不支持 | [v1.11.0 发布说明](https://github.com/dapr/dapr/releases/tag/v1.11.0) |
| 2023 年 11 月 18 日 | 1.10.10</br>  | 1.10.0 | Java 1.8.0 </br>Go 1.7.0 </br>PHP 1.1.0 </br>Python 1.9.0 </br>.NET 1.10.0 </br>JS 3.0.0 | 0.11.0 | 不支持 |  |
| 2023 年 7 月 20 日 | 1.10.9</br>  | 1.10.0 | Java 1.8.0 </br>Go 1.7.0 </br>PHP 1.1.0 </br>Python 1.9.0 </br>.NET 1.10.0 </br>JS 3.0.0 | 0.11.0 | 不支持 |  |
| 2023 年 6 月 22 日 | 1.10.8</br>  | 1.10.0 | Java 1.8.0 </br>Go 1.7.0 </br>PHP 1.1.0 </br>Python 1.9.0 </br>.NET 1.10.0 </br>JS 3.0.0 | 0.11.0 | 不支持 |  |
| 2023 年 5 月 15 日 | 1.10.7</br>  | 1.10.0 | Java 1.8.0 </br>Go 1.7.0 </br>PHP 1.1.0 </br>Python 1.9.0 </br>.NET 1.10.0 </br>JS 3.0.0 | 0.11.0 | 不支持 |  |
| 2023 年 5 月 12 日 | 1.10.6</br>  | 1.10.0 | Java 1.8.0 </br>Go 1.7.0 </br>PHP 1.1.0 </br>Python 1.9.0 </br>.NET 1.10.0 </br>JS 3.0.0 | 0.11.0 | 不支持 |  |
| 2023 年 4 月 13 日 |1.10.5</br>  | 1.10.0 | Java 1.8.0 </br>Go 1.6.0 </br>PHP 1.1.0 </br>Python 1.9.0 </br>.NET 1.10.0 </br>JS 3.0.0 | 0.11.0 | 不支持  |  |
| 2023 年 3 月 16 日 | 1.10.4</br>  | 1.10.0 | Java 1.8.0 </br>Go 1.6.0 </br>PHP 1.1.0 </br>Python 1.9.0 </br>.NET 1.10.0 </br>JS 2.5.0 | 0.11.0 | 不支持 |  |
| 2023 年 3 月 14 日 | 1.10.3</br>  | 1.10.0 | Java 1.8.0 </br>Go 1.6.0 </br>PHP 1.1.0 </br>Python 1.9.0 </br>.NET 1.10.0 </br>JS 2.5.0 | 0.11.0 | 不支持 |  |
| 2023 年 2 月 24 日 | 1.10.2</br>  | 1.10.0 | Java 1.8.0 </br>Go 1.6.0 </br>PHP 1.1.0 </br>Python 1.9.0 </br>.NET 1.10.0 </br>JS 2.5.0 | 0.11.0 | 不支持 |  |
| 2023 年 2 月 20 日 | 1.10.1</br>  | 1.10.0 | Java 1.8.0 </br>Go 1.6.0 </br>PHP 1.1.0 </br>Python 1.9.0 </br>.NET 1.10.0 </br>JS 2.5.0 | 0.11.0 | 不支持 |  |
| 2023 年 2 月 14 日 | 1.10.0</br>  | 1.10.0 | Java 1.8.0 </br>Go 1.6.0 </br>PHP 1.1.0 </br>Python 1.9.0 </br>.NET 1.10.0 </br>JS 2.5.0 | 0.11.0 | 不支持 |  |
| 2022 年 12 月 2 日 | 1.9.5</br>  | 1.9.1 | Java 1.7.0 </br>Go 1.6.0 </br>PHP 1.1.0 </br>Python 1.8.3 </br>.NET 1.9.0 </br>JS 2.4.2 | 0.11.0 | 不支持 |  |
| 2022 年 11 月 17 日 | 1.9.4</br>  | 1.9.1 | Java 1.7.0 </br>Go 1.6.0 </br>PHP 1.1.0 </br>Python 1.8.3 </br>.NET 1.9.0 </br>JS 2.4.2 | 0.11.0 | 不支持 |  |
| 2022 年 11 月 4 日 | 1.9.3</br>  | 1.9.1 | Java 1.7.0 </br>Go 1.6.0 </br>PHP 1.1.0 </br>Python 1.8.3 </br>.NET 1.9.0 </br>JS 2.4.2 | 0.11.0 | 不支持 |  |
| 2022 年 11 月 1 日 | 1.9.2</br>  | 1.9.1 | Java 1.7.0 </br>Go 1.6.0 </br>PHP 1.1.0 </br>Python 1.8.1 </br>.NET 1.9.0 </br>JS 2.4.2 | 0.11.0 | 不支持 |  |
| 2022 年 10 月 26 日 | 1.9.1</br>  | 1.9.1 | Java 1.7.0 </br>Go 1.6.0 </br>PHP 1.1.0 </br>Python 1.8.1 </br>.NET 1.9.0 </br>JS 2.4.2 | 0.11.0 | 不支持 |  |
| 2022 年 10 月 13 日 | 1.9.0</br>  | 1.9.1 | Java 1.7.0 </br>Go 1.6.0 </br>PHP 1.1.0 </br>Python 1.8.3 </br>.NET 1.9.0 </br>JS 2.4.2 | 0.11.0 | 不支持 |  |
| 2022 年 10 月 26 日 | 1.8.6</br>  | 1.8.1 | Java 1.6.0 </br>Go 1.5.0 </br>PHP 1.1.0 </br>Python 1.7.0 </br>.NET 1.8.0 </br>JS 2.3.0 | 0.11.0 | 不支持 |  |
| 2022 年 10 月 13 日 | 1.8.5</br>  | 1.8.1 | Java 1.6.0 </br>Go 1.5.0 </br>PHP 1.1.0 </br>Python 1.7.0 </br>.NET 1.8.0 </br>JS 2.3.0 | 0.11.0 | 不支持 |  |
| 2022 年 8 月 10 日 | 1.8.4</br>  | 1.8.1 | Java 1.6.0 </br>Go 1.5.0 </br>PHP 1.1.0 </br>Python 1.7.0 </br>.NET 1.8.0 </br>JS 2.3.0 | 0.11.0 | 不支持 |  |
| 2022 年 7 月 29 日 | 1.8.3</br>  | 1.8.0 | Java 1.6.0 </br>Go 1.5.0 </br>PHP 1.1.0 </br>Python 1.7.0 </br>.NET 1.8.0 </br>JS 2.3.0 | 0.11.0 | 不支持 |  |
| 2022 年 7 月 21 日 | 1.8.2</br>  | 1.8.0 | Java 1.6.0 </br>Go 1.5.0 </br>PHP 1.1.0 </br>Python 1.7.0 </br>.NET 1.8.0 </br>JS 2.3.0 | 0.11.0 | 不支持 |  |
| 2022 年 7 月 20 日 | 1.8.1</br>  | 1.8.0 | Java 1.6.0 </br>Go 1.5.0 </br>PHP 1.1.0 </br>Python 1.7.0 </br>.NET 1.8.0 </br>JS 2.3.0 | 0.11.0 | 不支持 |  |
| 2022 年 7 月 7 日 | 1.8.0</br>   | 1.8.0 | Java 1.6.0 </br>Go 1.5.0 </br>PHP 1.1.0 </br>Python 1.7.0 </br>.NET 1.8.0 </br>JS 2.3.0 | 0.11.0 | 不支持 |  |
| 2022 年 10 月 26 日 | 1.7.5</br>   | 1.7.0 | Java 1.5.0 </br>Go 1.4.0 </br>PHP 1.1.0 </br>Python 1.6.0 </br>.NET 1.7.0 </br>JS 2.2.1 | 0.10.0 | 不支持 |  |
| 2022 年 5 月 31 日 | 1.7.4</br>   | 1.7.0 | Java 1.5.0 </br>Go 1.4.0 </br>PHP 1.1.0 </br>Python 1.6.0 </br>.NET 1.7.0 </br>JS 2.2.1 | 0.10.0 | 不支持 |  |
| 2022 年 5 月 17 日 | 1.7.3</br>   | 1.7.0 | Java 1.5.0 </br>Go 1.4.0 </br>PHP 1.1.0 </br>Python 1.6.0 </br>.NET 1.7.0 </br>JS 2.2.1 | 0.10.0 | 不支持 |  |
| 2022 年 4 月 22 日 | 1.7.2</br>   | 1.7.0 | Java 1.5.0 </br>Go 1.4.0 </br>PHP 1.1.0 </br>Python 1.6.0 </br>.NET 1.7.0 </br>JS 2.1.0 | 0.10.0 | 不支持 |  |
| 2022 年 4 月 20 日 | 1.7.1</br>   | 1.7.0 | Java 1.5.0 </br>Go 1.4.0 </br>PHP 1.1.0 </br>Python 1.6.0 </br>.NET 1.7.0 </br>JS 2.1.0 | 0.10.0 | 不支持 |  |
| 2022 年 4 月 7 日 | 1.7.0</br>   | 1.7.0 | Java 1.5.0 </br>Go 1.4.0 </br>PHP 1.1.0 </br>Python 1.6.0 </br>.NET 1.7.0 </br>JS 2.1.0 | 0.10.0 | 不支持 |  |
| 2022 年 4 月 20 日 | 1.6.2</br>   | 1.6.0 | Java 1.4.0 </br>Go 1.3.1 </br>PHP 1.1.0 </br>Python 1.5.0 </br>.NET 1.6.0 </br>JS 2.0.0 | 0.9.0 | 不支持 |  |
| 2022 年 3 月 25 日 | 1.6.1</br>   | 1.6.0 | Java 1.4.0 </br>Go 1.3.1 </br>PHP 1.1.0 </br>Python 1.5.0 </br>.NET 1.6.0 </br>JS 2.0.0 | 0.9.0 | 不支持 |  |
| 2022 年 1 月 25 日 | 1.6.0</br>   | 1.6.0 | Java 1.4.0 </br>Go 1.3.1 </br>PHP 1.1.0 </br>Python 1.5.0 </br>.NET 1.6.0 </br>JS 2.0.0 | 0.9.0 | 不支持 |  |

## SDK 兼容性

除安全问题所需的更改外，SDK 和运行时承诺不做重大更改。所有重大更改（如有）都会在发布说明中宣布。

**SDK 和运行时向前兼容性**  
较新的 Dapr SDK 支持 Dapr 运行时的最新版本和前两个版本（N-2）。

**SDK 和运行时向后兼容性**  
对于新的 Dapr 运行时，支持当前的 SDK 版本和前两个版本（N-2）。

## 升级路径

运行时 1.0 版本发布后，可能需要通过其他版本显式升级才能达到所需的目标版本。例如，从 v1.0 升级到 v1.2 可能需要通过 v1.1。

{{% alert title="注意" color="primary" %}}
Dapr 仅在单个次要版本中升级补丁版本，或从一个次要版本升级到下一个次要版本时具有无缝保证。例如，从 `v1.6.0` 升级到 `v1.6.4` 或从 `v1.6.4` 升级到 `v1.7.0` 已经过测试。一次升级超过一个次要版本未经测试，被视为尽力而为。
{{% /alert %}}

下表显示了 Dapr 运行时的已测试升级路径。任何其他升级组合均未经过测试。

有关升级的一般指南，请参阅[自托管模式]({{% ref self-hosted-upgrade %}})和 [Kubernetes]({{% ref kubernetes-upgrade %}})部署。最好查看目标版本的发布说明以获取具体指南。

|  当前运行时版本 | 必须通过以下版本升级  | 目标运行时版本   |
|--------------------------|-----------------------|------------------------- |
| 1.5.0 到 1.5.2           |                   N/A |                    1.6.0 |
|                          |                 1.6.0 |                    1.6.2 |
|                          |                 1.6.2 |                    1.7.5 |
|                          |                 1.7.5 |                    1.8.6 |
|                          |                 1.8.6 |                    1.9.6 |
|                          |                 1.9.6 |                   1.10.7 |
| 1.6.0 到 1.6.2           |                   N/A |                    1.7.5 |
|                          |                 1.7.5 |                    1.8.6 |
|                          |                 1.8.6 |                    1.9.6 |
|                          |                 1.9.6 |                   1.10.7 |
| 1.7.0 到 1.7.5           |                   N/A |                    1.8.6 |
|                          |                 1.8.6 |                    1.9.6 |
|                          |                 1.9.6 |                   1.10.7 |
| 1.8.0 到 1.8.6           |                   N/A |                    1.9.6 |
| 1.9.0 到 1.9.6           |                   N/A |                   1.10.8 |
| 1.10.0 到 1.10.8         |                   N/A |                   1.11.4 |
| 1.11.0 到 1.11.4         |                   N/A |                   1.12.4 |
| 1.12.0 到 1.12.4         |                   N/A |                   1.13.5 |
| 1.13.0 到 1.13.5         |                   N/A |                   1.14.0 |
| 1.14.0 到 1.14.4         |                   N/A |                   1.14.4 |
| 1.15.0 到 1.15.12        |                   N/A |                   1.16.9 |
| 1.16.0 到 1.16.9         |                   N/A |                   1.17.2 |

## 在托管平台上升级

Dapr 可以支持生产环境的多个托管平台。在 1.0 版本中，两个受支持的平台是 Kubernetes 和物理机。有关 Kubernetes 升级，请参阅 [Kubernetes 上的生产指南]({{% ref kubernetes-production.md %}})

### 依赖项的受支持版本

以下是最新版本的 Dapr（v{{% dapr-latest-version long="true" %}}）已测试的软件列表。

| 依赖项            |   支持的版本                                                                                                              |
|-----------------------|----------------------------------------------------------------------------------------------------------------------------------|
| Kubernetes                                                |  Dapr 对 Kubernetes 的支持与 [Kubernetes 版本偏差策略](https://kubernetes.io/releases/version-skew-policy/) 一致 |
| [Open Telemetry collector (OTEL)](https://github.com/open-telemetry/opentelemetry-collector/releases)|                                                                                                                              v0.101.0|
| [Prometheus](https://prometheus.io/download/)             |                                                                                                                              v2.28 |

## 相关链接

- 阅读[版本控制策略]({{% ref support-versioning.md %}})
- 阅读[重大更改和弃用策略]({{% ref breaking-changes-and-deprecations.md %}})
