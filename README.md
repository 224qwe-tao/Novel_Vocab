# AI小说提示词词条库

这是一个可直接部署到 GitHub Pages 的静态词条收藏网站。

## 功能

- 分类浏览词条
- 点击词条后自动加入输出区
- 复制 / 清空输出
- 全文搜索
- 所有词条组默认折叠
- 编辑模式：可新增、修改、删除所有词条组
- 编辑模式：可新增、修改、删除任意词条组内的词条
- 可选择目标词条组，再批量加入或单个新增词条
- 自定义和编辑内容会保存在当前浏览器 LocalStorage
- 深色模式

## GitHub Pages 使用方法

1. 将本文件夹内的内容上传到 GitHub repository 根目录：

```text
index.html
README.md
css/
data/
js/
```

2. 进入 GitHub repository：

```text
Settings → Pages
```

3. Source 选择：

```text
Deploy from a branch
```

4. Branch 选择：

```text
main / root
```

5. 保存后等待 GitHub Pages 自动生成网址。

## 注意

- 这是纯静态网页，不需要服务器或数据库。
- 浏览器编辑内容保存在 LocalStorage，同一设备同一浏览器可持续使用。
- 如果更新网站文件后仍看到旧版，请按 Ctrl + F5 强制刷新。
