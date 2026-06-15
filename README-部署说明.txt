DREAMLAND PWA v1 部署说明

1. 将本文件夹内的全部文件上传到 Cloudflare Pages 项目根目录。
2. 保留你原有的 images/ 图片目录，并与 index.html 放在同一级。
3. 必须通过 HTTPS 或 localhost 访问，直接双击 index.html 不会注册 Service Worker。
4. 更新页面后，如果需要强制刷新缓存，请修改 sw.js 中：
   const CACHE_VERSION = 'dreamland-pwa-v1';
   例如改为 dreamland-pwa-v2 后重新部署。
5. 当前离线策略：
   - 首页、manifest、图标、离线页：预缓存
   - HTML 页面：网络优先，离线时回退缓存
   - 商品图片：首次浏览后缓存，最多保留约 160 张
   - 其他同域静态资源：旧缓存优先并后台更新
6. Web3Forms 提交仍需要联网，离线时不能提交询盘。
