# 缓缓 · AS 日历

公网网页：https://8280209zt.github.io/as-calendar/

## 使用方式

使用管理员交付的完整专属链接打开，无需邮箱登录。访问凭证位于 URL 的 `#key=...` 中，请勿公开分享或提交到仓库。相同链接在不同设备访问同一份记录。浏览器会记住凭证；清理浏览器数据后，请重新使用完整链接。

## 数据

记录保存在 Supabase `public.as_entries`：user_id、date、score、note、updated_at。页面保留 CSV / JSON 导出。旧的本地文件数据不自动上传。

## 部署

GitHub Pages 使用 main 分支根目录；config.js 仅含可公开的 Supabase 项目地址和 publishable key。

在新 Supabase 项目先执行 schema.sql，再执行 private-link.sql。私有凭证表 calendar_private.access_links 仅保存 SHA-256 哈希，禁止匿名直接读写。RPC 验证凭证后仅操作绑定用户的记录。凭证配置不提交到此仓库。

网页移除了第三方 JavaScript 依赖；访问凭证只在 HTTPS POST 请求中交给 Supabase，不进入查询参数或 GitHub 仓库。
