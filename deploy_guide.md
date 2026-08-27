# 梧州市公安局警务辅助人员笔试刷题网页 - Cloudflare Pages 部署指南

本系统为一个**纯静态（HTML5 + CSS3 + Modern JS）且带全量官方复习范围题库**的网页应用，零后端依赖，完全适配 **Cloudflare Pages** 免费一键部署！

---

### 部署方法一：网页拖拽直接部署（最简单，1分钟上线）

1. **登录 Cloudflare**：打开 [Cloudflare 仪表盘](https://dash.cloudflare.com/) 并登录账号。
2. **进入 Pages 页面**：在左侧菜单点击 **Workers & Pages** -> 点击 **创建 (Create)** -> 选择 **Pages** 选项卡。
3. **选择直接上传**：点击 **Upload assets (上传资产)**。
4. **项目命名与上传文件**：
   * 输入项目名称（例如：`wuzhou-fujing-exam`）。
   * 将文件夹 `d:\Desktop\fujingkaoshi` 内的所有文件全选拖拽上传（包含 `index.html`, `style.css`, `app.js`, `questions.json`, `doc_content.json`）。
5. **完成部署**：点击 **Deploy site**。部署完成后，Cloudflare 会免费分配一个专有二级域名（例如 `https://wuzhou-fujing-exam.pages.dev`），即可在手机端或电脑端随意刷题！

---

### 部署方法二：命令行（Wrangler CLI 部署）

如果您本地安装了 Node.js / Wrangler，在 `d:\Desktop\fujingkaoshi` 目录下执行：

```bash
# 1. 登录 wrangler
npx wrangler login

# 2. 部署到 Cloudflare Pages
npx wrangler pages deploy . --project-name=wuzhou-fujing-exam
```

---

### 本地测试与预览

当前网页已在本地开启测试服务器，您可在浏览器访问：
👉 `http://localhost:8080` 进行本地刷题与测试！

---

### 系统功能亮点总结

1. **全量题库覆盖**：完全基于《附件2.梧州市公安局公开招聘警务辅助人员笔试考试复习范围.doc》出题，包含 **单选题、多选题、判断题（对错题）**。
2. **多模式练习**：
   * **顺序刷题** / **模块分类刷题**（时政、法治理念、《广西警辅条例》、公安法律法规、《监察法》）；
   * **全真模拟考试**（倒计时、交卷自动评分与能力分析）；
   * **错题本**（自动收录做错题目）与 **收藏夹**；
   * **背题/看解析模式**（一键直接查看答案与权威法条出处）。
3. **官方复习原文查阅**：内置《复习范围》全部官方文本与法条，支持实时关键字高亮检索。
4. **状态持久化**：使用 `LocalStorage`，关闭网页或刷新后答题进度、错题、收藏不丢失。
