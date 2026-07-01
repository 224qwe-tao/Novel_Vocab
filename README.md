# AI 小说提示词词条库

一个可直接部署到 GitHub Pages 的静态词条收藏网站，用于 AI 小说、角色设定和情节描写提示词整理。

## v8 更新内容

- 移除「已选择词条」方格。
- 点击词条后会直接追加到「输出」方格。
- 「输出」方格移到页面中间，并放大为主要编辑区。
- 「输出」方格右下角加入放大 / 缩小按钮，可切换到全屏编辑模式。
- 保留复制、清空、分隔符选择、分类浏览、全文搜索、词条组编辑和分类编辑功能。

## 部署方法

把以下内容上传到 GitHub repository 根目录：

```text
index.html
README.md
css/
data/
js/
```

然后在 GitHub 仓库进入 **Settings → Pages**，Source 选择 **Deploy from a branch**，Branch 选择 **main / root**。

## 注意

自定义分类、词条组和编辑后的词条会保存到当前浏览器的 LocalStorage，不会上传到服务器。
