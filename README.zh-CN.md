# EPUB Tweaker

<p align="center">
  <img src="public/icon.svg" width="104" height="104" alt="EPUB Tweaker 图标">
</p>

<p align="center">
  <strong>修复并微调 EPUB，提升电子阅读器兼容性。</strong><br>
  <sub>也可修复可能导致 Send to Kindle 拒收书籍，或将书籍保留为固定版面的已知 EPUB 问题。</sub>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-TW.md">繁體中文</a> · 简体中文
</p>

<p align="center">
  <a href="https://epub-tweaker.olo.la/"><strong>打开网页版</strong></a>
  · <a href="https://github.com/haohailong/EPUB-Tweaker/issues">报告问题</a>
  · <a href="LICENSE">MIT License</a>
</p>

EPUB Tweaker 是一款注重隐私的渐进式网页应用（PWA），可以检查、修复和调整 EPUB 2 与 EPUB 3 电子书。所有处理均在浏览器中完成：文件不会上传、不需要账号；应用完成缓存或安装后也可以离线运行。

> EPUB Tweaker 不会移除或绕过 DRM，也不隶属于 Amazon 或获其认可。

## 为什么使用 EPUB Tweaker？

有些 EPUB 在普通阅读器中可以正常打开，却可能在 Send to Kindle 转换时失败、失去可调字号的能力、使用错误的翻页方向，或带有旧制作工具遗留的过时数据。EPUB Tweaker 会进行保守且可说明的修复，并在提供下载前重新验证输出文件。

它尤其适合：

- 修复已知的 Send to Kindle 兼容性问题，包括数种可能引发 E016 的原因；
- 将横排转换为竖排，或将竖排转换为横排；
- 设置自动、从右到左或从左到右的翻页方向；
- 通过横排转换或可选的“日文模式”，准备要发送至 Kindle 的竖排繁体中文书籍；
- 清理过时的 `page-map`、Adobe 加密残留、不兼容的 SVG 标题和特定 CSS 问题；
- 在不上传书籍的情况下检查 EPUB，并获得易读的技术报告。

## 使用方法

1. 使用现代浏览器打开 [EPUB Tweaker](https://epub-tweaker.olo.la/)。
2. 选择版式、日文模式和翻页方向。默认会保留书籍原有的版式和有效翻页方向。
3. 将一个或多个 `.epub` 文件拖入页面，或者点击“选择文件”。
4. 查看每本书检测到的书名、EPUB 版本、语言、版式和翻页方向；页面也会显示处理后的预期状态。
5. 如有需要，可以在书籍卡片中选择本地替换图片，或修改输出文件名。
6. 点击“处理 EPUB”；批量处理时可以使用“全部处理”。
7. 查看修复报告并下载新的 `-tweaked.epub` 文件。原始文件永远不会被覆盖。

处理大型书籍时请保持页面打开。所有工作都只在当前设备上进行。

## 主要功能

- 自动识别和检查 EPUB 2.x／3.x，输出时保留原主版本
- 使用 Web Worker 处理，避免大型压缩包阻塞界面
- 防范 ZIP 路径穿越，并限制单个条目、压缩及解压后大小
- 生成符合规范的 EPUB ZIP：首个条目为完全正确且未压缩的 `mimetype`
- 以结构化方式处理 XML、XHTML、SVG 和 CSS，而非只依赖正则表达式
- 修复 EPUB 2 NCX 和 EPUB 3 Navigation Document 的锚点
- 缓解与语言、SVG 封面、固定画布和跨页提示相关的已知 Send to Kindle E016 问题
- 支持横排转竖排及竖排转横排
- 支持自动、RTL、LTR 翻页方向；转换为横排时默认使用 LTR
- 可独立启用日文模式，测试 Kindle 兼容性
- 转换存在结构问题的中文注音标记（ruby），同时保留日文 ruby
- 按尺寸、长宽比和感知哈希，在本地匹配高分辨率替换图片
- 检测 DRM 但不规避；保留支持的字体混淆机制
- 批量处理并将多本输出书籍下载为 ZIP
- 英文、繁体中文和简体中文界面
- 跟随系统明暗模式、支持键盘操作和减少动态效果
- 可安装的 PWA、离线应用外壳和版本更新提示
- 输出前强制验证，并提供可复制的修复报告

## 处理选项

### 保留原版式

保留当前的书写模式和有效翻页方向，但仍会执行兼容性修复和验证。

### 横排 → 竖排

为可重排内容加入专用的 `vertical-rl` 样式表，不会把出版物改成固定版面。当翻页方向设为“自动”时，EPUB 3 会使用 RTL；EPUB 2 则会加入兼容的书写模式元数据。

### 竖排 → 横排

加入最后应用的 `horizontal-tb` 覆盖，同时保留文档结构、链接、图片、ruby 和导航。使用“自动”时，输出会明确使用 LTR 翻页方向。固定版面出版物不会被转换。

### 日文模式

将出版物的主要语言改为 `ja`，并维护兼容的书写模式元数据。它本身不会启用竖排。由于 Amazon 的繁体中文转换路径仅支持横排 LTR，此模式可能让 Kindle 将书籍视为支持竖排 RTL 的日文书；但设备所选择的字体和排版选项也可能随之改变。

如果希望繁体中文书籍获得最保守的 Send to Kindle 兼容性，建议使用“竖排 → 横排”。只有在保留竖排比语言元数据更重要时，才将日文模式视为兼容性替代方案。

### 翻页方向

- **自动：**竖排且从右到左的内容会使用 RTL；其他情况则保留原有的有效方向。
- **从右到左／从左到右：**明确覆盖自动判断。

程序不会只根据语言来推断翻页方向。

## 输出与隐私

默认输出文件名为 `原文件名-tweaked.epub`。已有的 `-fixed` 和 `-tweaked` 后缀会先被规范化，避免重复处理后不断叠加后缀。

普通浏览器 PWA 在没有获得明确文件系统权限时，不能直接将文件写入原文件旁，因此输出会进入浏览器设置的下载位置或显示保存提示。原始 EPUB 永远不会被覆盖。

本项目没有后端、登录、分析端点、遥测或远程书籍素材下载。程序不会执行 EPUB 中的脚本、不会把书籍标记插入应用 DOM，也不会自动访问书中的外部链接。

## DRM 政策

EPUB Tweaker 不会移除或绕过 DRM。检测到加密内容资源时，处理会以 `DRM_PROTECTED` 停止。标准 IDPF／Adobe 字体混淆会被保留。只有当所有被引用的资源均可正常读取，且列出的 Adobe 方法确定只是失效残留时，才会移除加密描述文件。

## 验证与限制

每个输出文件都会被重新打开，并检查 ZIP 结构、container 和 package 文档、manifest／spine 完整性、导航目标、XML／XHTML／SVG／CSS 语法、内部链接和片段，以及 UTF-8 序列化的一致性。

此验证器不是 Amazon 的私有转换引擎，也不能替代 Kindle Previewer 或 EPUBCheck。EPUB Tweaker 可以修复已知问题并验证自己的 Kindle 安全配置，但任何第三方应用都无法保证所有文件一定会被 Send to Kindle 接受。

目前的其他限制包括：

- 不会猜测存在歧义的缺失引用或严重损坏的 XML，而会将问题列入报告；
- 不会把固定版面出版物转换为可重排电子书；
- 浏览器不支持感知画布 API 时，相似图片可能需要手动确认；
- 为保护移动浏览器，压缩包上限为 200 MB、单个条目 100 MB、解压后总计 600 MB；
- 字体混淆会被保留，目前不会修改已混淆的字体。

## 支持的浏览器

- iPhone、iPad 和 macOS 上的现代 Safari，包括已安装的 PWA 模式
- 现代 Chromium 系浏览器
- 具备 Worker、Blob 和足够 ZIP 内存的现代 Firefox

桌面版支持拖放文件。File System Access API 并非必需，因此 Safari 和 iOS 也可以使用。

## 本地开发

需要 Node.js 20 或更高版本。

```bash
git clone https://github.com/haohailong/EPUB-Tweaker.git
cd EPUB-Tweaker
npm install
npm run dev
```

Vite 会显示本地地址，通常为 `http://localhost:5173`，在浏览器中打开即可。

运行自动化测试：

```bash
npm test
```

创建并预览生产版本：

```bash
npm run build
npm run preview
```

生产输出位于 `dist/`。

## 部署至 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhaohailong%2FEPUB-Tweaker)

仓库已包含 `vercel.json`，不需要环境变量或后端服务。

1. 在 Vercel 新建项目并导入 `haohailong/EPUB-Tweaker`。
2. 保留自动检测到的 Vite 构建设置。
3. 执行部署。之后推送到 `main` 会创建生产部署，Pull Request 则可以获得预览版本。

如果使用其他静态 HTTPS 主机，请发布 `dist/`。默认 Service Worker 范围假定应用部署在域名根目录。

## 架构

```text
React 用户界面
  └─ Web Worker
      ├─ 受保护的 ZIP 读取器
      ├─ container 和 package 解析器
      ├─ EPUB 2／EPUB 3 版本边界
      ├─ 统一 BookModel
      ├─ 通用及版本专用修复规则
      ├─ 可重现的 ZIP 序列化器
      └─ 处理后验证器
```

本项目使用 `@xmldom/xmldom` 处理结构化文档、`css-tree` 处理 CSS、`fflate` 读写 ZIP。测试会在内存中生成可自由分发的 EPUB 样本，不包含任何商业书籍。

## 技术参考

- [W3C EPUB 3.3](https://www.w3.org/TR/epub-33/)
- [Amazon Kindle 出版指南](https://kdp.amazon.com/en_US/help/topic/GU72M65VRFPH43L6)
- [Amazon 导航指南](https://kdp.amazon.com/en_US/help/topic/GY3AD8C6C6GAG42N)
- [Amazon 繁体中文出版限制](https://kdp.amazon.com/en_US/help/topic/G27T64E65VM6JWKK)

## 许可证

EPUB Tweaker 是根据 [MIT License](LICENSE) 发布的开源软件。只要遵守许可证条款，即可使用、复制、修改、合并、发布、分发、再许可及销售软件副本。

## 作者与致谢

作者：[Hailong Hao](https://github.com/haohailong)。灵感来自 Facebook 群组[電子書閱讀器討論區](https://www.facebook.com/groups/ereaderfamily)的 James Hong 兄。
