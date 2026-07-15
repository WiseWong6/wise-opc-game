# 部署与人工验收

## Web 静态部署

```bash
npm ci
npm run check
```

将 `web/dist/` 作为普通静态目录交给 Nginx，不需要 Node.js、Express、数据库或运行时环境变量。

最小 Nginx 配置示例：

```nginx
location /opc-game/ {
  alias /srv/www/opc-game/;
  try_files $uri $uri/ /opc-game/index.html;
}
```

若部署在 `/opc-game/` 子路径，构建时执行 `npm --workspace @opc-game/web run build -- --base=/opc-game/`。

## 微信小程序

1. 执行 `npm ci && npm run sync:mini && npm run typecheck`。
2. 用微信开发者工具打开仓库根目录。
3. 核对项目名 `opc-game` 与 AppID `wx03f611286aacbfc4`。
4. 分别使用 iOS、Android 模拟器及真机完整走一遍 12 关。
5. 核对调试器 Network 面板没有业务请求，启动时没有登录或用户资料授权弹窗。
6. 在中途关闭并重新进入，确认答案、账单和结局均已清空。
7. 核对右上角分享菜单没有分享给朋友或朋友圈入口。

## Web 人工检查

- 390 × 844 手机视口与 1440 × 1000 桌面视口。
- Tab、Enter 以及数字键 `1` / `2` 可完成选择。
- 系统开启“减少动态效果”后，过关不等待动画。
- 刷新后回到首页，浏览器存储中没有业务数据。
