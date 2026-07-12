# AI 小说提示词词条库

这是一个可直接部署到 GitHub Pages 的静态词条收藏网站。支持分类浏览、全文搜索、点击词条直接输出、编辑词条组、编辑分类、手动调整分类排序、放大输出框，以及 GitHub 同步保存。

## v12 新增

- 新增「GitHub 保存同步」功能。
- 可把当前浏览器中的全部分类、词条组和词条修改保存到 GitHub 仓库。
- 保存后会更新 `data/vocab.json` 和 `data/vocab.js`，其他设备打开网站时即可读取更新后的词条库。
- 支持从 GitHub 读取最新词条资料到当前浏览器。

## 使用 GitHub 保存同步

1. 在右侧「自定义」面板找到「GitHub 保存同步」。
2. 填写：
   - Owner / 用户名
   - Repository
   - Branch，一般是 `main`
   - JSON 路径，默认 `data/vocab.json`
   - JS 路径，默认 `data/vocab.js`
   - GitHub Token
3. 按「保存设置」。
4. 修改词条、词条组或分类后，按「保存到 GitHub」。
5. 等 GitHub Pages 重新部署完成后，其他设备打开网站即可看到更新内容。

> Token 只会保存在当前浏览器 LocalStorage。建议使用 Fine-grained token，并只给予当前仓库 Contents: Read and write 权限。

## GitHub Pages 部署

把以下内容上传到 repository 根目录：

```text
index.html
README.md
css/
data/
js/
```

然后在 GitHub repository 的 Settings → Pages 中选择：

- Source: Deploy from a branch
- Branch: main
- Folder: /root

保存后等待数分钟即可访问网站。

## 注意

- 未按「保存到 GitHub」之前，修改只会保存在当前浏览器。
- 如果 GitHub Pages 更新后仍显示旧内容，请按 Ctrl + F5 强制刷新。
- 不要把 GitHub Token 写入公开文件，也不要把 Token 分享给其他人。
