# obsidian-imgbed

将 Obsidian 当前文档中的本地图片上传到 CloudFlare ImgBed 图床，并替换为远程 Markdown 图片链接。

## 功能

- 上传 Markdown 图片链接，例如 `![alt](path/to/image.png)`。
- 上传 Obsidian 图片嵌入，例如 `![[image.png]]`。
- 粘贴图片时自动上传，并插入远程 Markdown 图片链接。
- 配置图床地址、认证方式、上传渠道、渠道名称、上传目录、文件命名方式、压缩和重试行为。
- 选中图片链接，或将光标放在图片链接上，即可删除图床中的文件。

## 命令

- **上传当前文档中的本地图片**
- **删除图床图片**

## 设置

- **图床地址**：你的 CloudFlare ImgBed 部署地址，例如 `https://cfbed.sanyue.de`。
- **认证方式**：
  - **API_TOKEN**：推荐使用。上传需要 `upload` 权限，删除需要 `delete` 权限。
  - **上传认证码**：仅支持上传。
- **上传渠道**：`telegram`、`cfr2`、`s3`、`discord`、`huggingface` 或 `webdav`。
- **渠道名称**：可选。多渠道部署时填写。
- **上传目录**：可选相对目录，例如 `img/notes`。
- **文件命名方式**：`default`、`index`、`origin` 或 `short`。
- **粘贴图片时自动上传**：粘贴图片文件时立即上传，而不是创建本地附件。

## 隐私

插件只会把你明确上传的图片文件发送到配置的 CloudFlare ImgBed 服务，不收集遥测数据，也不会发送笔记正文或其他库数据。

删除图片时，插件会把解析出的图床文件路径发送到配置的图床服务。

## 开发

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```
