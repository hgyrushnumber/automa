# Browser Automation Extension - 浏览器自动化插件

**一款功能强大、纯原生 JavaScript 实现的浏览器自动化（RPA）插件。它开源、无任何第三方库依赖，并兼容所有 Chromium 内核的浏览器。**

这款插件为您提供了一个完整的图形化界面，让您可以通过拖拽、点击和填写表单的方式，轻松创建和管理复杂的自动化工作流，从而将您从重复的浏览器操作中解放出来。

## ✨ 核心功能

- **可视化脚本编辑器**：无需编写任何代码！在插件的选项页面，您可以通过一个直观的界面来创建、编辑、复制、拖拽排序自动化流程中的每一步。
- **全生命周期脚本管理**：
    - **创建与保存**：轻松创建新脚本，并随时保存您的进度。
    - **导入/导出**：以 JSON 格式轻松分享和备份您的自动化脚本。
    - **激活机制**：可以将任意一个脚本设置为“活动脚本”，插件将执行该脚本。
- **丰富的指令集**：插件内置了20多种强大的指令，覆盖了浏览器自动化的绝大部分场景：
    - **页面导航**: `goto`, `switch_tab`, `switch_iframe`
    - **元素交互**: `click`, `type`, `select`
    - **数据抓取**: `scrape_text`, `scrape_html`, `get_tab_info`, `get_cookies`
    - **逻辑控制**: `jump`, `conditional_jump`
    - **变量与数据处理**: `init_variable`, `calculate`, `format_string`, `parse_number`
    - **等待与同步**: `wait`, `wait_for_user`
    - **网络请求**: `api_request`
- **高级选择器引擎**：
    - 支持 **CSS Selector**、**XPath** 和 **结构化选择器**（按任意属性，如 `data-testid` 定位），并支持指定索引。
    - 内置 **元素稳定机制**，在操作前自动等待元素加载完成并停止移动，极大提升脚本稳定性。
- **强大的兼容性与鲁棒性**：
    - **原生实现**：未使用任何第三方库，代码轻量、安全、易于维护。
    - **现代框架兼容**：通过模拟真实用户输入事件，可以很好地兼容 React, Vue 等现代前端框架构建的网站。
    - **错误处理机制**：支持在单个步骤上设置“出错时继续”，并可在全局配置“出错时自动重启脚本”。
- **实时执行监控**：
    - **可视化跟踪**：在插件弹窗中，您可以实时看到脚本的每一步执行状态（运行中、已完成、等待中、错误）。
    - **数据监控**：实时查看脚本中所有变量的当前值。
    - **视觉反馈**：脚本在操作页面元素时，会自动用红色边框高亮该元素。

## 🚀 安装指南

1.  下载或克隆本仓库到您的本地电脑。
2.  打开您的 Chromium 内核浏览器（如 Chrome），在地址栏输入 `chrome://extensions` 并回车。
3.  在页面右上角，打开 **开发者模式** 开关。
4.  点击左上角的 **“加载已解压的扩展程序”** 按钮。
5.  在弹出的文件选择框中，选择您刚刚下载或克隆的仓库文件夹。
6.  安装成功！您现在可以在浏览器的扩展程序列表中看到本插件。

## 💡 使用方法

1.  **创建脚本**：
    - 右键点击浏览器右上角的插件图标，选择“选项”，进入脚本管理页面。
    - 点击“新建脚本”，输入一个名称，您将进入可视化编辑器。
2.  **编辑脚本**：
    - 点击“添加步骤”按钮，在弹出的窗口中选择一个指令（如 `goto`）。
    - 根据提示填写该指令所需的参数（如要跳转的 `url`）。
    - 点击“保存步骤”。重复此过程，构建您的自动化流程。
    - 您可以随时拖拽步骤来调整它们的执行顺序。
3.  **激活并运行脚本**：
    - 脚本编辑完成后，点击页面顶部的“保存脚本”按钮。
    - 然后点击 **“设为活动脚本”** 按钮，这会告诉插件您想要运行这个脚本。
    - 左键点击浏览器右上角的插件图标，在弹出的窗口中点击“启动”按钮，自动化流程随即开始。

## 🤝 参与贡献

我们欢迎任何形式的贡献！无论是提交 Bug 报告、提出功能建议，还是直接贡献代码，都对我们非常有帮助。

1.  Fork 本仓库。
2.  创建您的分支 (`git checkout -b feature/AmazingFeature`)。
3.  提交您的更改 (`git commit -m 'Add some AmazingFeature'`)。
4.  推送到分支 (`git push origin feature/AmazingFeature`)。
5.  提交一个 Pull Request。

## 📄 开源许可

本项目采用 [MIT License](LICENSE) 开源。
<img src="src/assets/images/icon-128.png" width="64"/>

# Automa
<p>
  <img alt="Automa latest version" src="https://img.shields.io/github/package-json/v/AutomaApp/automa" />
  <a href="https://twitter.com/AutomaApp">
    <img alt="Follow Us on Twitter" src="https://img.shields.io/twitter/follow/AutomaApp?style=social" />
  </a>
  <a href="https://discord.gg/C6khwwTE84">
    <img alt="Chat with us on Discord" src="https://img.shields.io/discord/942211415517835354?label=join%20discord&logo=Discord&logoColor=white" />
  </a>
</p>

An extension for automating your browser by connecting blocks. <br />
Auto-fill forms, do a repetitive task, take a screenshot, or scrape website data — the choice is yours. You can even schedule when the automation will execute!

## Downloads
<table cellspacing="0" cellpadding="0">
  <tr>
    <td valign="center">
      <a align="center" href="https://chrome.google.com/webstore/detail/automa/infppggnoaenmfagbfknfkancpbljcca">
        <img src="https://user-images.githubusercontent.com/22908993/166417152-f870bfbd-1770-4c28-b69d-a7303aebc9a6.png" alt="Chrome web store" />
        <p align="center">Chrome Web Store</p>
      </a>
    </td>
    <td valign="center">
      <a href="https://addons.mozilla.org/en-US/firefox/addon/automa/">
        <img src="https://user-images.githubusercontent.com/22908993/166417727-3481fef4-00e5-4cf0-bb03-27fb880d993c.png" alt="Firefox add-ons" />
        <p align="center">Firefox Add-ons</p>
      </a>
    </td>
  </tr>
</table>

## Marketplace
Browse the Automa marketplace where you can share and download workflows with others. [Go to the marketplace &#187;](https://extension.automa.site/marketplace)

## Automa Chrome Extension Builder
Automa Chrome Extension Builder (Automa CEB for short) allows you to generate a standalone chrome extension based on Automa workflows. [Go to the documentation &#187;](https://docs.extension.automa.site/extension-builder)


## Project setup
Before running the `yarn dev` or `yarn build` script, you need to create the `getPassKey.js` file in the `src/utils` directory.  Inside the file write

```js
export default function() {
  return 'anything-you-want';
}
```

```bash
# Install dependencies
pnpm install

# Compiles and hot-reloads for development for the chrome browser
pnpm dev

# Compiles and minifies for production for the chrome browser
pnpm build

# Create a zip file from the build folder
pnpm build:zip

# Compiles and hot-reloads for development for the firefox browser
pnpm dev:firefox

# Compiles and minifies for production for the firefox browser
pnpm build:firefox

# Lints and fixes files
pnpm lint
```

### Icon Preview
v-remixicon/icons: https://preview-v-remixicon.vercel.app/

### Install Locally
#### Chrome
1. Open chrome and navigate to extensions page using this URL: chrome://extensions.
2. Enable the "Developer mode".
3. Click "Load unpacked extension" button, browse the `automa/build` directory and select it.

![Install in chrome](https://user-images.githubusercontent.com/22908993/166417152-f870bfbd-1770-4c28-b69d-a7303aebc9a6.png)

### Firefox
1. Open firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click the "Load Temporary Add-on" button.
3. Browse the `automa/build` directory and select the `manifest.json` file.

![Install in firefox](https://user-images.githubusercontent.com/22908993/166417727-3481fef4-00e5-4cf0-bb03-27fb880d993c.png)

## Contributors
Thanks to everyone who has submitted issues, made suggestions, and generally helped make this a better project.

<a href="https://github.com/AutomaApp/automa/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AutomaApp/automa" />
</a>

## License
Source code in this repository is variously licensed under the GNU Affero General Public License (AGPL), or the [Automa Commercial License](https://extension.automa.site/license/commercial/).

See [LICENSE.txt](./LICENSE.txt) for details.
