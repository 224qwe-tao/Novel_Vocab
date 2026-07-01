# AI小说提示词词条库

这是一个可直接上传到 GitHub Pages 的静态网页，用于收藏、搜索、随机组合和输出 AI 小说提示词词条。

## 已包含功能

- 分类浏览词条，点击即可加入输出
- 复制、清空、去重、分隔符切换
- 词条加入选择区后，可使用 + / - 进行 NovelAI `{ }` / `[ ]` 加权
- 全局搜索和侧栏搜索
- 随机组合器
- 自定义词条批量导入、单个新增、删除、导出 / 导入 JSON
- 深色模式
- 本地保存自定义数据，不需要服务器

## 内置数据统计

- 词条组：94
- 总词条：3487
- 去重词条：2550

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

## 修改内置词库

- 直接编辑 `data/vocab.json` 后，可重新生成 `data/vocab.js`；或简单地在网站右侧「自定义」加入词条。
- 浏览器自定义词条保存在 LocalStorage；换设备前请先导出 JSON。

## 注意

本项目包含成人向写作词汇，请仅用于合规的成人虚构创作、资料整理或个人写作辅助。上传公开仓库前，请确认平台规则和仓库可见性设置。
