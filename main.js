const { MarkdownRenderer, Notice, Plugin, PluginSettingTab, Setting, TFile } = require("obsidian");

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"]);

const THEME_PRESETS = {
  wechatElegant: {
    name: "雅致金",
    textColor: "#2b2b2b",
    mutedColor: "#6f6658",
    headingColor: "#111111",
    accentColor: "#c28a2c",
    accentSoftColor: "#fff7e6",
    backgroundColor: "#ffffff",
    quoteBackgroundColor: "#fffaf0",
    codeBackgroundColor: "#f7f3ea",
    codeColor: "#b14b36",
    borderColor: "#ead7aa",
    headingPrefix: "01",
    headingStyle: "badge",
    cardShadow: "none",
    contentRadius: "6px"
  },
  inkMinimal: {
    name: "墨色极简",
    textColor: "#222222",
    mutedColor: "#666666",
    headingColor: "#111111",
    accentColor: "#2f5f70",
    accentSoftColor: "#eef6f8",
    backgroundColor: "#ffffff",
    quoteBackgroundColor: "#f6f8f8",
    codeBackgroundColor: "#f5f7f8",
    codeColor: "#1f5968",
    borderColor: "#d8e6ea",
    headingPrefix: "◆",
    headingStyle: "line",
    cardShadow: "none",
    contentRadius: "4px"
  },
  warmNotebook: {
    name: "温暖手帐",
    textColor: "#302a23",
    mutedColor: "#786d5d",
    headingColor: "#251f18",
    accentColor: "#b65f3b",
    accentSoftColor: "#fff3ec",
    backgroundColor: "#fffefa",
    quoteBackgroundColor: "#fff7f0",
    codeBackgroundColor: "#f8f0e8",
    codeColor: "#a9472a",
    borderColor: "#f0d2bf",
    headingPrefix: "✦",
    headingStyle: "badge",
    cardShadow: "none",
    contentRadius: "8px"
  },
  bearInspired: {
    name: "熊掌记灵感",
    textColor: "#2f2923",
    mutedColor: "#7a6b5a",
    headingColor: "#1f1a16",
    accentColor: "#d96f32",
    accentSoftColor: "#fff4eb",
    backgroundColor: "#fffdfa",
    quoteBackgroundColor: "#fff6ed",
    codeBackgroundColor: "#f8efe6",
    codeColor: "#b4552d",
    borderColor: "#f0d4bd",
    headingPrefix: "✦",
    headingStyle: "underline",
    cardShadow: "0 6px 18px rgba(91, 61, 34, 0.08)",
    contentRadius: "10px"
  },
  craftInspired: {
    name: "Craft 灵感",
    textColor: "#202124",
    mutedColor: "#62666d",
    headingColor: "#15171a",
    accentColor: "#6c63ff",
    accentSoftColor: "#f3f2ff",
    backgroundColor: "#ffffff",
    quoteBackgroundColor: "#f7f7fb",
    codeBackgroundColor: "#f4f5f8",
    codeColor: "#3f48b5",
    borderColor: "#e3e5ee",
    headingPrefix: "•",
    headingStyle: "card",
    cardShadow: "0 8px 24px rgba(32, 33, 36, 0.08)",
    contentRadius: "12px"
  }
};

const DEFAULT_SETTINGS = {
  themePreset: "wechatElegant",
  customAccentColor: "",
  customBackgroundColor: "",
  customHeadingPrefix: "",
  addTitleDivider: true,
  titleAlign: "center",
  bodyAlign: "justify",
  paragraphIndent: false,
  titleCard: true
};

module.exports = class PublisherCopyPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    this.addRibbonIcon("send", "复制为公众号格式", async () => {
      await this.copyWeChat();
    }).addClass("publisher-copy-ribbon");

    this.addCommand({
      id: "copy-wechat-rich",
      name: "复制为公众号格式",
      callback: async () => this.copyWeChat()
    });

    this.addCommand({
      id: "copy-markdown",
      name: "复制为 Markdown 格式",
      callback: async () => this.copyMarkdown()
    });

    this.addSettingTab(new PublisherCopySettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  getActiveMarkdownView() {
    return this.app.workspace.getActiveViewOfType(require("obsidian").MarkdownView);
  }

  getSource(view) {
    const selected = view.editor.getSelection();
    return selected && selected.trim() ? selected : view.editor.getValue();
  }

  async copyMarkdown() {
    const view = this.getActiveMarkdownView();
    if (!view?.file) {
      new Notice("请先打开一篇 Markdown 笔记");
      return;
    }

    const markdown = this.getSource(view);
    const normalized = await this.prepareMarkdown(markdown, view.file.path, { imagesAsDataUri: true });
    await navigator.clipboard.writeText(normalized);
    new Notice("已复制 Markdown 格式，可粘贴到 Markdown 编辑器");
  }

  async copyWeChat() {
    const view = this.getActiveMarkdownView();
    if (!view?.file) {
      new Notice("请先打开一篇 Markdown 笔记");
      return;
    }

    const markdown = this.getSource(view);
    const prepared = await this.prepareMarkdown(markdown, view.file.path, { imagesAsDataUri: true });
    const html = await this.renderMarkdown(prepared, view.file.path);
    const styled = this.toWeChatHtml(html);
    const plain = this.toPlainText(prepared);

    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([styled], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" })
      })
    ]);

    new Notice("已复制公众号格式，可直接粘贴到微信公众号编辑器");
  }

  async prepareMarkdown(markdown, sourcePath, options) {
    let output = this.stripFrontmatter(markdown);
    output = await this.replaceWikiImageEmbeds(output, sourcePath, options);
    output = await this.replaceMarkdownImages(output, sourcePath, options);
    return output;
  }

  stripFrontmatter(markdown) {
    return markdown.replace(/^---\n[\s\S]*?\n---\n+/, "");
  }

  async replaceWikiImageEmbeds(markdown, sourcePath, options) {
    const pattern = /!\[\[([^\]]+)\]\]/g;
    return this.replaceAsync(markdown, pattern, async (_match, rawTarget) => {
      const [linkPath, alias] = rawTarget.split("|").map((part) => part.trim());
      const file = this.resolveImageFile(linkPath, sourcePath);
      if (!file) return _match;
      const src = await this.imageSource(file, options);
      const alt = alias || file.basename;
      return `![${this.escapeMarkdownText(alt)}](${src})`;
    });
  }

  async replaceMarkdownImages(markdown, sourcePath, options) {
    const pattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    return this.replaceAsync(markdown, pattern, async (_match, alt, rawUrl) => {
      const url = rawUrl.trim();
      if (/^(https?:|data:|file:)/i.test(url)) return _match;

      const cleanUrl = decodeURIComponent(url.replace(/^<|>$/g, ""));
      const file = this.resolveImageFile(cleanUrl, sourcePath);
      if (!file) return _match;
      const src = await this.imageSource(file, options);
      return `![${this.escapeMarkdownText(alt || file.basename)}](${src})`;
    });
  }

  resolveImageFile(linkPath, sourcePath) {
    const cleanPath = linkPath.split("#")[0].split("?")[0].trim();
    const ext = cleanPath.split(".").pop()?.toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) return null;

    const linked = this.app.metadataCache.getFirstLinkpathDest(cleanPath, sourcePath);
    if (linked instanceof TFile) return linked;

    const sourceDir = sourcePath.includes("/") ? sourcePath.slice(0, sourcePath.lastIndexOf("/")) : "";
    const relativePath = sourceDir ? `${sourceDir}/${cleanPath}` : cleanPath;
    const relative = this.app.vault.getAbstractFileByPath(relativePath);
    if (relative instanceof TFile) return relative;

    const absolute = this.app.vault.getAbstractFileByPath(cleanPath);
    return absolute instanceof TFile ? absolute : null;
  }

  async imageSource(file, options) {
    if (!options.imagesAsDataUri) return encodeURI(file.path);
    const buffer = await this.app.vault.readBinary(file);
    const ext = file.extension.toLowerCase();
    const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
    const dataUri = `data:${mime};base64,${this.arrayBufferToBase64(buffer)}`;
    if (ext === "svg") return this.svgDataUriToPng(dataUri);
    return dataUri;
  }

  async renderMarkdown(markdown, sourcePath) {
    const container = document.createElement("div");
    await MarkdownRenderer.render(this.app, markdown, container, sourcePath, this);
    return container.innerHTML;
  }

  toWeChatHtml(html) {
    const wrapper = document.createElement("section");
    wrapper.innerHTML = html;
    this.cleanObsidianArtifacts(wrapper);
    const theme = this.getTheme();
    this.applyWeChatStyles(wrapper, theme);
    return `<section style="${this.css({
      "max-width": "100%",
      "box-sizing": "border-box",
      "padding": this.settings.titleCard ? "2px 4px 0" : "0 2px",
      "background": theme.backgroundColor,
      "color": theme.textColor,
      "font-size": "16px",
      "line-height": "1.9",
      "letter-spacing": "0",
      "font-family": "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif"
    })}">${wrapper.innerHTML}</section>`;
  }

  getTheme() {
    const preset = THEME_PRESETS[this.settings.themePreset] || THEME_PRESETS.wechatElegant;
    return {
      ...preset,
      accentColor: this.settings.customAccentColor || preset.accentColor,
      backgroundColor: this.settings.customBackgroundColor || preset.backgroundColor,
      headingPrefix: this.settings.customHeadingPrefix || preset.headingPrefix
    };
  }

  cleanObsidianArtifacts(root) {
    root.querySelectorAll(".copy-code-button, .collapse-indicator, .heading-collapse-indicator").forEach((node) => node.remove());
    root.querySelectorAll("*").forEach((node) => {
      [...node.attributes].forEach((attr) => {
        if (attr.name.startsWith("data-") || attr.name === "class" || attr.name === "dir") node.removeAttribute(attr.name);
      });
    });
  }

  applyWeChatStyles(root, theme) {
    const styleMap = {
      p: this.css({
        "margin": "18px 0",
        "line-height": "1.95",
        "font-size": "16px",
        "color": theme.textColor,
        "text-align": this.settings.bodyAlign,
        "text-justify": this.settings.bodyAlign === "justify" ? "inter-ideograph" : "",
        "word-break": "break-word",
        "text-indent": this.settings.paragraphIndent ? "2em" : "0"
      }),
      h1: this.css({
        "margin": "34px 0 28px",
        "padding": this.settings.titleCard ? "22px 18px" : "0 0 16px",
        "border": this.settings.titleCard ? `1px solid ${theme.borderColor}` : "0",
        "border-bottom": this.settings.titleCard ? `1px solid ${theme.borderColor}` : this.settings.addTitleDivider ? `2px solid ${theme.borderColor}` : "0",
        "border-radius": this.settings.titleCard ? theme.contentRadius : "0",
        "background": this.settings.titleCard ? theme.accentSoftColor : "transparent",
        "box-shadow": this.settings.titleCard ? theme.cardShadow : "none",
        "line-height": "1.35",
        "font-size": "25px",
        "font-weight": "800",
        "color": theme.headingColor,
        "letter-spacing": "0",
        "text-align": this.settings.titleAlign
      }),
      h2: this.css({
        "margin": "34px 0 20px",
        "padding": this.h2Padding(theme),
        "border-radius": theme.contentRadius,
        "border": this.h2Border(theme),
        "border-left": this.h2BorderLeft(theme),
        "line-height": "1.45",
        "font-size": "20px",
        "font-weight": "800",
        "color": theme.headingColor,
        "background": theme.accentSoftColor,
        "box-shadow": this.h2Shadow(theme)
      }),
      h3: this.css({
        "margin": "26px 0 14px",
        "padding": "0 0 0 10px",
        "border-left": `3px solid ${theme.accentColor}`,
        "line-height": "1.55",
        "font-size": "18px",
        "font-weight": "700",
        "color": theme.headingColor
      }),
      blockquote: this.css({
        "margin": "22px 0",
        "padding": "14px 18px",
        "border-left": `4px solid ${theme.accentColor}`,
        "border-radius": theme.contentRadius,
        "background": theme.quoteBackgroundColor,
        "color": theme.mutedColor
      }),
      ul: this.css({ "margin": "16px 0", "padding-left": "1.35em", "line-height": "1.95", "color": theme.textColor }),
      ol: this.css({ "margin": "16px 0", "padding-left": "1.35em", "line-height": "1.95", "color": theme.textColor }),
      li: this.css({ "margin": "8px 0", "line-height": "1.95", "color": theme.textColor }),
      hr: this.css({ "margin": "32px 0", "border": "0", "border-top": `1px solid ${theme.borderColor}` }),
      pre: this.css({
        "margin": "20px 0",
        "padding": "16px",
        "border-radius": theme.contentRadius,
        "border": `1px solid ${theme.borderColor}`,
        "background": theme.codeBackgroundColor,
        "overflow-x": "auto",
        "white-space": "pre-wrap",
        "word-break": "break-word",
        "line-height": "1.75"
      }),
      code: this.css({
        "padding": "2px 6px",
        "border-radius": "4px",
        "background": theme.codeBackgroundColor,
        "color": theme.codeColor,
        "font-family": "Menlo, Monaco, Consolas, 'Courier New', monospace",
        "font-size": "14px"
      }),
      img: this.css({
        "display": "block",
        "max-width": "100%",
        "height": "auto",
        "margin": "22px auto",
        "border-radius": theme.contentRadius
      }),
      a: "color: #576b95; text-decoration: none;",
      strong: `font-weight: 700; color: ${theme.headingColor};`
    };

    Object.entries(styleMap).forEach(([tag, style]) => {
      root.querySelectorAll(tag).forEach((node) => {
        if (tag === "code" && node.parentElement?.tagName.toLowerCase() === "pre") {
          node.setAttribute("style", this.css({
            "padding": "0",
            "background": "transparent",
            "color": theme.codeColor,
            "font-family": "Menlo, Monaco, Consolas, 'Courier New', monospace",
            "font-size": "14px"
          }));
        } else {
          node.setAttribute("style", style);
        }
      });
    });

    root.querySelectorAll("h2").forEach((heading, index) => {
      const label = theme.headingPrefix === "01" ? String(index + 1).padStart(2, "0") : theme.headingPrefix;
      heading.innerHTML = `<span style="${this.css({
        "display": "inline-block",
        "margin-right": theme.headingStyle === "underline" ? "6px" : "8px",
        "padding": theme.headingStyle === "line" ? "0" : "1px 7px",
        "border-radius": "999px",
        "background": theme.headingStyle === "line" || theme.headingStyle === "underline" ? "transparent" : theme.accentColor,
        "color": theme.headingStyle === "line" || theme.headingStyle === "underline" ? theme.accentColor : "#ffffff",
        "font-size": "13px",
        "font-weight": "700",
        "vertical-align": "2px"
      })}">${label}</span>${heading.innerHTML}`;
    });
  }

  h2Padding(theme) {
    if (theme.headingStyle === "underline") return "0 0 10px";
    if (theme.headingStyle === "line") return "0 0 0 12px";
    return "12px 16px";
  }

  h2Border(theme) {
    if (theme.headingStyle === "card") return `1px solid ${theme.borderColor}`;
    if (theme.headingStyle === "underline") return "0";
    return "0";
  }

  h2BorderLeft(theme) {
    if (theme.headingStyle === "line") return `4px solid ${theme.accentColor}`;
    if (theme.headingStyle === "badge") return `5px solid ${theme.accentColor}`;
    return "0";
  }

  h2Shadow(theme) {
    if (theme.headingStyle === "underline") return `inset 0 -2px 0 ${theme.accentColor}`;
    return theme.cardShadow || `inset 0 -1px 0 ${theme.borderColor}`;
  }

  css(properties) {
    return Object.entries(properties)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => `${key}: ${value};`)
      .join(" ");
  }

  toPlainText(markdown) {
    return markdown
      .replace(/!\[[^\]]*]\([^)]+\)/g, "")
      .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
      .replace(/[`*_>#-]/g, "")
      .trim();
  }

  async svgDataUriToPng(dataUri) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(image.width || 1200, 1);
        canvas.height = Math.max(image.height || 675, 1);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = () => resolve(dataUri);
      image.src = dataUri;
    });
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  escapeMarkdownText(text) {
    return text.replace(/([\[\]\\])/g, "\\$1");
  }

  async replaceAsync(text, regex, replacer) {
    const matches = [];
    text.replace(regex, (...args) => {
      matches.push(replacer(...args));
      return args[0];
    });
    const replacements = await Promise.all(matches);
    return text.replace(regex, () => replacements.shift());
  }
};

class PublisherCopySettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Publisher Copy 公众号排版" });

    new Setting(containerEl)
      .setName("公众号主题")
      .setDesc("复制到微信公众号后台时使用的视觉主题")
      .addDropdown((dropdown) => {
        Object.entries(THEME_PRESETS).forEach(([key, theme]) => dropdown.addOption(key, theme.name));
        dropdown
          .setValue(this.plugin.settings.themePreset)
          .onChange(async (value) => {
            this.plugin.settings.themePreset = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });

    new Setting(containerEl)
      .setName("自定义主色")
      .setDesc("例如 #c28a2c。留空则使用主题默认色。")
      .addText((text) => text
        .setPlaceholder(THEME_PRESETS[this.plugin.settings.themePreset]?.accentColor || "#c28a2c")
        .setValue(this.plugin.settings.customAccentColor)
        .onChange(async (value) => {
          this.plugin.settings.customAccentColor = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("自定义背景色")
      .setDesc("例如 #ffffff。留空则使用主题默认背景。")
      .addText((text) => text
        .setPlaceholder(THEME_PRESETS[this.plugin.settings.themePreset]?.backgroundColor || "#ffffff")
        .setValue(this.plugin.settings.customBackgroundColor)
        .onChange(async (value) => {
          this.plugin.settings.customBackgroundColor = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("小标题前缀")
      .setDesc("可填 01、◆、✦ 等。填 01 会自动生成 01/02/03。")
      .addText((text) => text
        .setPlaceholder(THEME_PRESETS[this.plugin.settings.themePreset]?.headingPrefix || "01")
        .setValue(this.plugin.settings.customHeadingPrefix)
        .onChange(async (value) => {
          this.plugin.settings.customHeadingPrefix = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("标题下划分隔线")
      .setDesc("用于增强文章主标题的完成感")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.addTitleDivider)
        .onChange(async (value) => {
          this.plugin.settings.addTitleDivider = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("主标题对齐")
      .setDesc("公众号文章通常建议居中，教程类也可以左对齐。")
      .addDropdown((dropdown) => dropdown
        .addOption("center", "居中")
        .addOption("left", "左对齐")
        .setValue(this.plugin.settings.titleAlign)
        .onChange(async (value) => {
          this.plugin.settings.titleAlign = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("正文对齐")
      .setDesc("中文长文建议两端对齐，短句风格可选左对齐。")
      .addDropdown((dropdown) => dropdown
        .addOption("justify", "两端对齐")
        .addOption("left", "左对齐")
        .setValue(this.plugin.settings.bodyAlign)
        .onChange(async (value) => {
          this.plugin.settings.bodyAlign = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("段落首行缩进")
      .setDesc("偏传统文章可开启；公众号短段落通常建议关闭。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.paragraphIndent)
        .onChange(async (value) => {
          this.plugin.settings.paragraphIndent = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("主标题卡片")
      .setDesc("给文章主标题增加轻量背景、圆角和层次。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.titleCard)
        .onChange(async (value) => {
          this.plugin.settings.titleCard = value;
          await this.plugin.saveSettings();
        }));
  }
}
