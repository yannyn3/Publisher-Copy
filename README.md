# Publisher Copy

Publisher Copy 是一个 Obsidian 桌面端插件，用来把 Obsidian 笔记一键复制成适合发布的格式。

它主要解决两个问题：

- 从 Obsidian 复制到微信公众号后台时，图片丢失或排版变乱。
- 同一篇文章需要同时支持 Markdown 编辑器和微信公众号富文本编辑器。

## 功能

- 一键复制为微信公众号格式，直接粘贴到公众号后台。
- 一键复制为 Markdown 格式，适合粘贴到 Markdown 编辑器。
- 自动处理 Obsidian 本地图片、Wiki 图片语法和普通 Markdown 图片。
- 内置公众号主题，并支持自定义主色、背景色和小标题前缀。
- 支持标题居中、正文两端对齐、段落缩进、主标题卡片等排版选项。

## 快捷键

- `Cmd + Shift + C`：复制为公众号格式
- `Cmd + Shift + M`：复制为 Markdown 格式

Windows 上一般对应为：

- `Ctrl + Shift + C`
- `Ctrl + Shift + M`

## 内置主题

- 雅致金：适合教程、干货、经验复盘。
- 墨色极简：适合理性、克制、知识类文章。
- 温暖手帐：适合个人表达、日记、碎碎念。
- 熊掌记灵感：温暖纸感，简约但有写作氛围。
- Craft 灵感：干净卡片感，适合精致文档风公众号。

## 安装

把本目录复制到 Obsidian vault 的插件目录：

```bash
.obsidian/plugins/publisher-copy
```

然后在 Obsidian 中：

1. 打开设置
2. 进入第三方插件
3. 启用 `Publisher Copy`
4. 进入插件设置，选择公众号主题

## 使用

打开任意 Markdown 笔记后：

1. 按 `Cmd + Shift + C`
2. 打开微信公众号后台编辑器
3. 直接粘贴

如果要复制到 Markdown 编辑器：

1. 按 `Cmd + Shift + M`
2. 粘贴到目标 Markdown 编辑器

## 注意

微信公众号后台对外部 HTML 样式有限制，所以插件尽量使用内联样式。  
如果某些平台过滤了个别样式，这是平台限制，不是 Markdown 原文问题。

