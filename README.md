# AI小说提示词词条库

这是一个可直接上传到 GitHub Pages 的静态网页，用于收藏、搜索和输出 AI 小说提示词词条。

## 已包含功能

- 分类浏览词条，点击即可加入输出
- 复制、清空、分隔符切换
- 全局搜索和侧栏搜索
- 自定义词条组新增、改名、删除
- 可选择目标词条组，再批量导入或单个新增词条
- 自定义词条可编辑、保存或单独删除
- 支持导入 JSON
- 深色模式
- 本地保存自定义数据，不需要服务器

## 数据统计

- 词条组：94
- 总词条：3487

## 文件结构

```text
index.html
css/styles.css
js/app.js
data/vocab.js
data/vocab.json
README.md
```

## 上传 GitHub Pages

1. 新建一个 GitHub repository。
2. 将本文件夹所有内容上传到 repository 根目录。
3. 进入 Settings → Pages。
4. Source 选择 Deploy from a branch。
5. Branch 选择 main / root，保存。
6. 等待 GitHub Pages 生成网址。

## 修改词库

- 可直接编辑 `data/vocab.json` 后重新生成 `data/vocab.js`。
- 也可以在网站右侧「自定义」新增词条组，再把词条加入指定词条组。
- 浏览器自定义词条保存在 LocalStorage；换设备时可使用「导入JSON」把备份资料导入新浏览器。

## 注意

本项目包含成人向写作词汇，请仅用于合规的成人虚构创作、资料整理或个人写作辅助。上传公开仓库前，请确认平台规则和仓库可见性设置。
