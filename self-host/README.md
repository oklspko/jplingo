# jplingo 自托管后端（国内服务器）

把海外的 Supabase（认证 + 学习记录云同步）迁到自己的国内服务器。**前端代码零改动**，只换两个环境变量。

## 架构

```
浏览器 ──HTTPS──> Caddy ──┬── /auth/v1/* ──> GoTrue（认证）
                          └── /rest/v1/* ──> PostgREST（数据接口）
                                          │
                                      Postgres（study_records 表 + auth 用户表）
```

- **前端**：`www.jplingo.cn` —— EdgeOne Pages 静态托管
- **后端**：`api.jplingo.cn` —— 本服务器（Caddy 反代）

前后端跨子域调用，和托管 Supabase 一样走跨域，GoTrue / PostgREST 默认放开，无需额外 CORS 配置。

## 服务器要求

- **系统**：Ubuntu 22.04 LTS（推荐）或 Debian 12
- **配置**：2 核 2GB 可跑（你的是 2 核 4G，更宽裕）；内存 ≤2GB 建议加 2GB swap
- **网络**：域名已 ICP 备案；`api.jplingo.cn` 的 A 记录解析到本服务器 IP；放行 80 / 443 端口

## 部署步骤（在服务器上执行）

### 1. 安装 Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

### 2. 加 swap（可选，2GB 内存才建议）

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 3. 把本目录上传到服务器

把整个 `self-host/` 目录传到服务器（scp / 宝塔 / OrcaTerm 文件管理均可），例如放到 `/opt/jplingo`。

### 4. 确认配置

`self-host/.env` 已填好，确认域名无误：

```ini
DOMAIN=api.jplingo.cn
SITE_URL=https://api.jplingo.cn
```

> 密钥（`POSTGRES_PASSWORD` / `JWT_SECRET` / `ANON_KEY` / `SERVICE_ROLE_KEY`）已生成好，直接用即可。`ANON_KEY` 下面要填到前端。

### 5. 一键部署

```bash
cd /opt/jplingo/self-host
bash setup.sh
```

脚本会自动：建库 → 初始化角色 → 起 GoTrue → 建 `study_records` 表 → 起 PostgREST + Caddy（自动签 HTTPS）。

### 6. 验证

```bash
curl https://api.jplingo.cn/                  # 返回 jplingo backend OK
curl https://api.jplingo.cn/auth/v1/health    # 返回 200 或 {"version":...}
curl https://api.jplingo.cn/rest/v1/          # 返回 OpenAPI JSON
```

## 前端改动（EdgeOne Pages）

在 EdgeOne Pages 项目的环境变量里，把这两项换成自托管的值，然后**重新部署**：

| 变量 | 值 |
| --- | --- |
| `NUXT_SUPABASE_URL` | `https://api.jplingo.cn` |
| `NUXT_SUPABASE_ANON_KEY` | `.env` 里的 `ANON_KEY`（`eyJ...` 开头那串） |

> 注意：`ANON_KEY` 是 `eyJ` 开头的经典 JWT 格式，不是 `sb_publishable_` 开头。supabase-js 会自动识别为经典自托管流程，前端无需改代码。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| `docker pull` 报 manifest not found | 把 `docker-compose.yml` 里 gotrue / postgrest 的 tag 换成 `latest` |
| Caddy 一直签不出证书 | 确认 `api.jplingo.cn` 的 A 记录已解析到本机 IP、80/443 已放行、**ICP 备案已通过** |
| 登录报 401 | 确认前端 `NUXT_SUPABASE_ANON_KEY` 填的是 `.env` 里的 `ANON_KEY`，且与服务器 `JWT_SECRET` 一致 |
| 学习记录不同步 | `docker compose exec db psql -U postgres -c '\d study_records'` 确认表已建、RLS 生效 |
| 想换密钥 | 改 `.env` 里的 `POSTGRES_PASSWORD` / `JWT_SECRET`，重跑 `bash setup.sh`；`ANON_KEY` 需用同一 `JWT_SECRET` 重新生成 |

## 运维

- 查看状态：`docker compose ps`
- 看日志：`docker compose logs -f auth`（rest / caddy 同理）
- 数据库备份：`docker compose exec db pg_dump -U postgres postgres > backup.sql`
- 数据都在 named volume `db-data` 里，别删。
