# obsidian-imgbed

Obsidian 图床插件，用于把 Markdown 文档中的本地图片上传到 CloudFlare ImgBed，并替换为远程图片链接。

## 功能

- 上传当前文档中的本地图片链接，例如 `![alt](path/to/image.png)`。
- 上传 Obsidian 图片嵌入，例如 `![[image.png]]`。
- 粘贴图片时自动上传到图床，并插入远程 Markdown 图片链接。
- 选中图床图片链接后，通过右键菜单删除图床中的文件。
- 支持配置图床地址、API_TOKEN、上传渠道、渠道名称、上传目录、文件命名方式、服务端压缩和自动重试。

## 设置

在 **设置 -> 第三方插件 -> obsidian-imgbed** 中配置：

- **图床地址**：你的 CloudFlare ImgBed 部署地址，例如 `https://cfbed.sanyue.de`。
- **认证方式**：
  - **API_TOKEN**：推荐使用。上传需要 `upload` 权限，删除需要 `delete` 权限。
  - **上传认证码**：仅支持上传，不支持删除。
- **上传渠道**：例如 `telegram`、`cfr2`、`s3`、`discord`、`huggingface`、`webdav`。
- **渠道名称**：可选。图床配置多个渠道时填写。
- **上传目录**：可选。相对目录，例如 `img/notes`。
- **文件命名方式**：`default`、`index`、`origin` 或 `short`。
- **返回完整链接**：上传后尽量插入包含域名的完整链接。
- **粘贴图片时自动上传**：在 Markdown 文档中粘贴图片时自动上传。
- **服务端压缩**：上传渠道支持时启用图床服务端压缩。
- **自动重试**：上传失败时让图床在支持的情况下自动切换渠道重试。

## 上传图片

### 粘贴上传

在 Markdown 文档中直接粘贴图片，插件会自动上传图片并插入远程链接。

### 上传当前文档中的本地图片

运行命令：

- **上传当前文档中的本地图片**

插件会扫描当前文档中的本地图片链接和 Obsidian 图片嵌入，上传后替换为远程图片链接。

## 删除图床图片

推荐使用右键菜单删除：

1. 在 Markdown 编辑器中选中完整图片链接，例如：

   ```md
   ![image.png](https://your-imgbed.example.com/file/example_image.png)
   ```

2. 右键选中的内容。
3. 选择 **删除图床图片**。

插件会解析图片路径并调用 CloudFlare ImgBed 删除接口。上面的示例会删除：

```text
example_image.png
```

也可以把光标放在 Markdown 图片链接中，然后运行命令：

- **删除图床图片**

删除成功后，插件会移除文档中的图片链接。

## 隐私

插件只会在以下场景向你配置的图床服务发送请求：

- 上传你粘贴或命令扫描到的图片文件。
- 删除你选中的图床图片路径。

插件不会收集遥测数据，不会上传整篇笔记内容，也不会扫描整个仓库。

API_TOKEN 保存在 Obsidian 插件本地数据文件 `data.json` 中。该文件已被 `.gitignore` 忽略，不会提交到仓库。

## 开发

安装依赖：

```bash
npm install
```

开发构建：

```bash
npm run dev
```

生产构建：

```bash
npm run build
```
