# 缓缓 · AS 日历云端版

项目：https://qodcjmktfqvycgrtvqau.supabase.co

公网地址：https://8280209zt.github.io/as-calendar/

- GitHub Pages 托管静态网页，Supabase Auth 提供邮箱链接登录。
- 所有记录写入 Supabase `public.as_entries`，每个用户每天一条记录。
- GitHub 仅保存代码和 SQL；不提交健康记录、数据库密码或 service_role 密钥。
- 保留月历、年历、评分、感受、删除、CSV/JSON 导出及示例展示。

## 待执行部署步骤

1. 在 Supabase 项目 SQL Editor 运行 `schema.sql`。
2. 在 `config.js` 填入项目 URL 和 publishable/anon key。
3. 推送这些文件到 GitHub 仓库，在 Pages 中选择 main 分支根目录。
4. 在 Supabase Auth URL Configuration 将 Site URL 和 Redirect URLs 设为实际 Pages 地址（包含仓库路径和末尾斜线）。
5. 配置允许使用的登录邮箱和邮件发送方式，验证邮箱链接登录、保存、刷新读取和跨用户隔离。

数据库字段：`user_id`、`date`、`score`、`note`、`updated_at`。
所有 CRUD 由 RLS 限制为当前用户自己的行。更新由数据库写入时间戳。

原本机 HTML 的 localStorage 数据不自动上传。现有本机数据请先从原网页导出备份。
