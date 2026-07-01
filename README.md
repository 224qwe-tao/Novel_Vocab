# AI小说提示词词条库

一个可直接部署到 GitHub Pages 的静态词条收藏网站。

## 功能

- 分类浏览词条组
- 点击词条后组合输出
- 全文搜索词条、词条组和分类
- 每个词条组旁边都有「编辑」按钮
- 编辑窗口可修改词条组名称、分类和全部词条内容
- 右侧可新增分类、修改分类名称、删除空分类
- 右侧可新增词条组，并自动打开编辑窗口
- 自定义修改会保存到当前浏览器 LocalStorage
- 支持深色模式

## GitHub Pages 上传方法

把本资料夹内的以下内容上传到 repository 根目录：

```text
index.html
README.md
css/
data/
js/
```

然后到 `Settings -> Pages`，选择 `Deploy from a branch`，Branch 选择 `main`，Folder 选择 `/root`。

更新后如浏览器仍显示旧版，请按 `Ctrl + F5` 强制刷新。
