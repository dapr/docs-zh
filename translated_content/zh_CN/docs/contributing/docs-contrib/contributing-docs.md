---
type: docs
title: "贡献者指南"
linkTitle: "贡献者指南"
weight: 10
description: 开始为 Dapr 文档做贡献
---

在本指南中，你将学习如何为 [Dapr 文档仓库](https://github.com/dapr/docs) 贡献内容。由于 Dapr 文档发布在 [docs.dapr.io](https://docs.dapr.io) 上，你必须确保你的贡献能够正确编译和发布。

{{< youtube id=uPYuXcaEs-c >}}

## 前置条件

在为 Dapr 文档做贡献之前：

- 查看 [Dapr 项目一般贡献指南]({{% ref contributing-overview%}})。
- 安装并设置本地环境，使用 [Hugo](https://gohugo.io/) 和 [Docsy](https://docsy.dev) 主题。按照仓库 [README.md](https://github.com/dapr/docs/blob/master/README.md#environment-setup) 中的说明进行操作。
- Fork 并克隆 [文档仓库](https://github.com/dapr/docs)。

## 分支指南

Dapr 文档处理分支的方式与大多数代码仓库不同。它不使用 `main` 分支，而是每个分支都标记为与运行时发布的主版本和次版本相匹配。完整列表请访问 [Docs 仓库](https://github.com/dapr/docs#branch-guidance)

一般来说，所有文档更新都应指向 [Dapr 最新发布的文档分支](https://github.com/dapr/docs)。最新发布是默认分支 [https://github.com/dapr/docs]。例如，如果你要修复拼写错误、添加注释或澄清某个观点，请将你的更改提交到默认的 Dapr 分支。

对于适用于候选版本或预发布版本文档的任何文档更改，请将你的更改指向该特定分支。例如，如果你要记录即将对某个组件或运行时进行的更改，请将你的更改提交到预发布分支。

## 风格和语气

风格和语气约定应贯穿所有 Dapr 文档，以保持文档的一致性：

| 风格/语气 | 指导原则 |
| ---------- | -------- |
| 大小写 | 仅在以下情况使用大写：<br> <ul><li>句子或标题的开头</li><li>专有名词，包括技术名称（Dapr、Redis、Kubernetes 等）</li></ul> |
| 标题和小标题 | 标题必须简短，但要描述清楚、表意明确。 |
| 使用简单的句子 | 编写易于阅读和浏览的句子。提示：去掉正式语气，就像直接与读者交谈一样。 |
| 避免使用第一人称 | 不要使用第一人称“我”“我们”和“我们的”，而应使用第二人称“你”和“你的”。 |
| 假设读者是“新开发者” | 对有经验的开发者来说显而易见的步骤，对新开发者来说未必显而易见。为读者提供更明确、更详细的说明。 |
| 使用现在时 | 避免使用“此命令 _将_ 安装 Redis”这样的句子，而应使用“此命令安装 Redis”。 |

## 图表和图像

图表和图像是文档页面的宝贵视觉辅助工具。使用 [Dapr 图表模板库](https://github.com/dapr/docs/tree/v1.14/daprdocs/static/presentations) 中的图表风格和图标。

部分图表是由代码生成的，而不是在模板库中绘制的。如果你要添加或修改其中某个图表，请参阅下方的 [生成的图表](#生成的图表)。

为文档创建图表的流程：

1. 下载 [Dapr 图表模板库](https://github.com/dapr/docs/tree/v1.14/daprdocs/static/presentations)，使用其中的图标和颜色。
1. 添加新幻灯片并创建你的图表。
1. 将图表截取为高分辨率 PNG 文件，保存到 [images 文件夹](https://github.com/dapr/docs/tree/v1.14/daprdocs/static/images)。
1. 使用概念或构建块的命名约定为 PNG 文件命名，以便它们归为一组。
  - 例如：`service-invocation-overview.png`。
  - 有关使用 shortcode 调用图像的更多信息，请参阅下方的 [图像指南](#图像)。
1. 使用 HTML `<image>` 标签将图表添加到文档的相应部分。
1. 在你的 PR 中，评论图表幻灯片（而不是截图），以便维护者审核并将其添加到图表库中。

## 生成的图表

有些图表并不是图片，而是生成的 SVG 场景：一个小型 JavaScript 文件描述绘图内容，构建步骤将其渲染出来，页面再把结果内联进来。生成的图表使用站点自身的主题令牌着色，因此会跟随浅色和深色模式切换；其中的文字是真正的文本，可以被选中、搜索，也能被屏幕阅读器朗读；对它的修改会以差异（diff）的形式审阅，而不是替换一张截图。

**请遵循图表技能**：每当你添加或修改这类图表时，请阅读 [`skills/vector-2d-diagrams/SKILL.md`](https://github.com/dapr/docs/blob/v1.19/skills/vector-2d-diagrams/SKILL.md)。该文件是这些绘图的设计系统，涵盖画布、颜色与线条规则、形状词汇、标签和箭头的放置位置、品牌标识的来源与授权、无障碍规则、工作流程，以及一份已踩过的坑的清单。你可以自己阅读它，也可以让你的编码代理阅读它。依照它绘制的图表会彼此相似，这正是设立它的意义所在。

工作流程简述如下：

1. 在 `diagrams/scenes/<name>.mjs` 中编写场景，并在 `diagrams/scenes/index.mjs` 中注册它。
1. 运行 `npm run export:diagrams`。它会把内联的绘图写入 `daprdocs/assets/diagrams/<name>.svg`，并把独立副本写入 `daprdocs/static/diagrams/<name>.svg`。然后运行 `npm run export:pngs`，它会把独立副本渲染为 `daprdocs/static/diagrams/<name>.png`，这是页面上“下载 PNG”按钮所对应的文件。三者都要提交。这两个步骤并不相同：SVG 导出只是普通的 Node 脚本，而 PNG 步骤需要驱动浏览器，因此必须先安装 Chromium（`npx playwright install
   chromium`）。它只会重新渲染发生变化的场景，因此未改动的图表，其 PNG 不会在 git 中产生无谓的变动。`--force` 会重新渲染全部内容。

1. 使用 `diagram` shortcode 将它放到页面上：

   ```
   {{</* diagram service-invocation */>}}
   ```

   如果绘图在小于整列宽度时阅读效果更好，可以使用可选的 `width` 参数，其值为 10 到 100 之间的整数百分比。Hugo 不允许在同一次调用中同时使用位置参数和命名参数，因此传入 `width` 的调用也需要用名称指定场景：

   ```
   {{</* diagram name="api-scoping" width="70" */>}}
   ```

   如果场景名称缺失或拼写错误，构建会直接失败，而不会渲染出空白内容。

1. 将场景添加到 `tests/diagrams.spec.js` 的 `SCENE_ROWS` 中，并列出它必须绘制的每个标签。如果某个场景或调用位置在其中没有对应的行，该规格测试就会失败，因此任何图表都不会未经测试就上线。
1. 渲染它，并在**两种**主题下查看效果，然后再开 PR。数值测试对不可见的标记，以及在同一位置被绘制两次的标签，同样会通过。
1. 按顺序运行 CI 会执行的四项检查：

   ```
   npm run export:diagrams -- --check
   npm run check:pngs
   npm run test:diagrams
   npm run test:layout
   ```

   前三项都是普通的 Node 命令，几秒内即可完成；CI 会在安装浏览器之前先运行它们。`test:layout` 需要 Chromium，并运行完整的 Playwright 测试套件，耗时数分钟。已提交的 SVG 若与新渲染的结果不一致，会在第一项中失败；已提交的 PNG 若与其场景不再匹配，会在第二项中失败。因此，如果修改了场景却没有重新运行 `npm run export:diagrams` 和 `npm run export:pngs`，就无法通过检查。`npm run check:pngs` 只比较哈希值，所以它本身不需要浏览器，即使重新生成 PNG 确实需要浏览器。

尚未转换的页面仍然使用上面的模板库流程。两种方式并存，无需仅仅因为你在编辑某个页面，就把其中的图表转换过来。

## 贡献新的文档页面

如果你要创建新文章，请确保：

- 将新文档放在层级结构中的正确位置。
- 避免创建新的部分。多数情况下，合适的位置已经存在于文档层级结构中。
- 包含完整的 [Hugo front-matter](#front-matter)。

选择下面的主题类型，查看建议的模板，帮助你开始。

| 主题类型 | 它是什么？ |
| ---------- | ----------- |
| [概念]({{% ref "concept-template" %}}) | 回答“这能帮我解决什么问题？”避免重复 API 或组件规范；提供更多细节。 |
| [快速入门]({{% ref "quickstart-template" %}}) | 提供“五分钟让你惊艳”的体验。快速引导读者了解某个功能或 API 及其在受控示例中的工作方式。 |
| [操作指南]({{% ref "howto-template" %}}) | 提供详细、实用的分步指南，介绍 Dapr 的某项功能或技术。鼓励读者尝试自己的场景，而不是快速入门中提供的受控场景。 |

## docs.dapr.io 的要求

确保你的贡献不会破坏网站构建。Hugo 构建网站的方式要求遵循以下指南：

### 文件和文件夹名称

文件和文件夹名称应全局唯一。
    - `\service-invocation`
    - `service-invocation-overview.md`

### Front-matter

[Front-matter](https://www.docsy.dev/docs/adding-content/content/#page-frontmatter) 是将常规 markdown 文件升级为 Hugo 兼容文档的要素，用于在导航栏和目录中呈现。

每个页面都需要在文档顶部包含如下部分：

```yaml
---
type: docs
title: "TITLE FOR THE PAGE"
linkTitle: "SHORT TITLE FOR THE NAV BAR"
weight: (number)
description: "1+ SENTENCES DESCRIBING THE ARTICLE"
---
```

#### 示例

```yaml
---
type: docs
title: "Service invocation overview"
linkTitle: "Overview"
weight: 10
description: "A quick overview of Dapr service invocation and how to use it to invoke services within your application"
---
```

> Weight 决定页面在左侧边栏中的顺序，0 为最顶部。

Front-matter 应包含所有字段：type、title、linkTitle、weight 和 description。

- `title` 应为 1 句话，末尾不加句号
- `linkTitle` 应为 1-3 个单词，操作指南除外。
- `description` 应为 1-2 句话，说明读者将在本文档中学到、完成或做什么。

根据 [样式约定](#styling-conventions)，标题应只有第一个单词和专有名词首字母大写，但“How-To:”除外：

- "Getting started with Dapr service invocation"
- "How-To: Setup a local Redis instance"

### 引用其他页面

Hugo `ref` 和 `relref` [shortcodes](https://gohugo.io/content-management/cross-references/) 用于引用其他页面和部分。这些 shortcodes 还允许在页面被错误地重命名或删除时使构建失败。

例如，这个 shortcode 与 markdown 页面的其余内容一起内联编写，会链接到部分或文件夹名称对应的 _index.md：

```md
{{%/* ref "folder" */%}}
```

而这个 shortcode 会链接到特定页面：

```md
{{%/* ref "page" */%}}
```

所有页面和文件夹都需要具有_全局唯一名称_，ref shortcode 才能正常工作。如果存在重复名称，构建将中断并抛出错误。

#### 引用其他页面中的部分

要引用另一个页面中的特定部分，请在引用末尾添加 `#section-short-name`。

通常，section short name 是部分标题的文本，全部小写，空格改为“-”。你可以通过以下方式检查 section short name：

1. 访问网站页面。
1. 点击部分旁边的链接图标（🔗）。
1. 查看导航栏中 URL 的显示方式。
1. 复制“#”之后的内容，作为你的 section shortname。

例如，对于这个特定部分，页面和部分的完整引用如下：

```md
{{%/* ref "contributing-docs#referencing-sections-in-other-pages" */%}}
```

## Shortcodes

以下是编写 Dapr 文档时常用的 shortcodes：

### 图像

Docsy 和 Hugo 使用的 markdown 规范不支持通过 markdown 语法调整图像大小，因此需要使用原始 HTML。

首先将图像放到 `/daprdocs/static/images` 下，命名约定为 `[page-name]-[image-name].[png|jpg|svg]`。

然后使用以下方式链接图像：

```md
<img src="/images/[image-filename]" width=1000 alt="Description of image">
```

不要忘记设置 `alt` 属性，以保持文档的可读性和可访问性。

#### 示例

此 HTML 会在 `overview.md` 页面上显示 `dapr-overview.png` 图像：

```md
<img src="/images/overview-dapr-overview.png" width=1000 alt="Overview diagram of Dapr and its building blocks">
```

### 选项卡内容

选项卡通过 [Hugo shortcodes](https://gohugo.io/content-management/shortcodes/) 实现。

整体格式如下：

```
{{< tabpane text=true >}}

{{% tab header="Tab1" %}}
[Content for Tab1]
{{% /tab %}}

{{% tab header="Tab2" %}}
[Content for Tab2]
{{% /tab %}}

{{< /tabpane >}}
```

你创作的所有内容都会被渲染为 markdown，因此你可以包含图像、代码块、YouTube 视频等。

#### 示例

````
{{< tabpane text=true >}}

{{% tab header="Windows" %}}
```powershell
powershell -Command "iwr -useb https://raw.githubusercontent.com/dapr/cli/master/install/install.ps1 | iex"
```
{{% /tab %}}

{{% tab header="Linux" %}}
```bash
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash
```
{{% /tab %}}

{{% tab header="MacOS" %}}
```bash
brew install dapr/tap/dapr-cli
```
{{% /tab %}}

{{< /tabpane >}}
````

此示例会渲染为：

{{< tabpane text=true >}}

{{% tab header="Windows" %}}

```powershell
powershell -Command "iwr -useb https://raw.githubusercontent.com/dapr/cli/master/install/install.ps1 | iex"
```

{{% /tab %}}

{{% tab header="Linux" %}}

```bash
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash
```

{{% /tab %}}

{{% tab header="MacOS" %}}

```bash
brew install dapr/tap/dapr-cli
```

{{% /tab %}}

{{< /tabpane >}}

### YouTube 视频

Hugo 可以使用 shortcode 自动嵌入 YouTube 视频：

```
{{%/* youtube [VIDEO ID] */%}}
```

#### 示例

给定视频 https://youtu.be/dQw4w9WgXcQ

shortcode 如下：

```
{{%/* youtube dQw4w9WgXcQ */%}}
```

### 按钮

要在网页中创建按钮，请使用 `button` shortcode。

可选的“newtab”参数用于指定页面是否应在新标签页中打开。可选值为“true”或“false”。默认值为“false”，即页面将在当前标签页中打开。

#### 链接到外部页面

```
{{%/* button text="My Button" link="https://example.com" */%}}
```

{{< button text="My Button" link="https://example.com" >}}

#### 链接到其他文档页面

你也可以在按钮中引用页面：

```
{{%/* button text="My Button" page="contributing" newtab="true" */%}}
```

{{< button text="My Button" page="contributing.md" newtab="true" >}}

#### 按钮颜色

你可以使用 Bootstrap 颜色自定义按钮颜色：

```
{{%/* button text="My Button" link="https://example.com" color="primary" */%}}
{{%/* button text="My Button" link="https://example.com" color="secondary" */%}}
{{%/* button text="My Button" link="https://example.com" color="success" */%}}
{{%/* button text="My Button" link="https://example.com" color="danger" */%}}
{{%/* button text="My Button" link="https://example.com" color="warning" */%}}
{{%/* button text="My Button" link="https://example.com" color="info" */%}}
```

{{% button text="My Button" link="https://example.com" color="primary" %}}
{{% button text="My Button" link="https://example.com" color="secondary" %}}
{{% button text="My Button" link="https://example.com" color="success" %}}
{{% button text="My Button" link="https://example.com" color="danger" %}}
{{% button text="My Button" link="https://example.com" color="warning" %}}
{{% button text="My Button" link="https://example.com" color="info" %}}

### 参考资料

[Docsy 编写指南](https://www.docsy.dev/docs/adding-content/)

## 翻译

Dapr 文档支持使用 git 子模块和 Hugo 内置的语言支持来添加语言翻译。

你可以在 [PR 1286](https://github.com/dapr/docs/pull/1286) 中找到添加中文语言支持的示例 PR。

添加语言的步骤：

- 在 Docs 仓库中提交 issue，请求创建新的语言专用文档仓库
- 仓库创建后，在文档仓库中创建 git 子模块：

   ```sh
   git submodule add <remote_url> translations/<language_code>
   ```

- 在 `daprdocs/config.toml` 中添加语言条目：

   ```toml
    [languages.<language_code>]
      title = "Dapr Docs"
      weight = 3
      contentDir = "content/<language_code>"
      languageName = "<language_name>"
   ```

- 在 `daprdocs/config.toml` 中创建挂载：

   ```toml
   [[module.mounts]]
     source = "../translations/docs-<language_code>/content/<language_code>"
     target = "content"
     lang = "<language_code>"
   ```

- 根据需要为所有其他翻译目录重复上述步骤。

## 下一步

从复制并基于 [Dapr 文档模板]({{% ref docs-templates %}}) 中的一个开始。
