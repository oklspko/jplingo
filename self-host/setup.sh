#!/usr/bin/env bash
# jplingo 自托管后端一键部署脚本（在服务器上以 root 或 sudo 用户运行）
# 用法：bash setup.sh
set -euo pipefail
cd "$(dirname "$0")"

# 读取 .env 里的变量（DOMAIN/SITE_URL/POSTGRES_PASSWORD/JWT_SECRET 等）
set -a
source ./.env
set +a

if [ "$DOMAIN" = "your-domain.com" ]; then
  echo "❌ 请先编辑 self-host/.env，把 DOMAIN / SITE_URL 改成你自己的域名。"
  exit 1
fi

echo "==> 1/6 启动数据库…"
docker compose up -d db

echo "==> 等待数据库就绪…"
for _ in $(seq 1 60); do
  if docker compose exec -T db pg_isready -U postgres -d postgres >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> 2/6 初始化数据库角色与权限…"
docker compose exec -T db psql -U postgres -d postgres \
  -v authenticator_password="$POSTGRES_PASSWORD" -f /dev/stdin < db/roles.sql

echo "==> 3/6 启动认证服务 GoTrue（首次启动会自动创建 auth schema / auth.users）…"
docker compose up -d auth

echo "==> 等待 GoTrue 完成数据库迁移…"
for _ in $(seq 1 60); do
  if [ "$(docker compose exec -T db psql -U postgres -d postgres -tAc "select to_regclass('auth.users')")" != "" ]; then
    break
  fi
  sleep 2
done

echo "==> 4/6 执行学习记录表迁移（study_records + RLS）…"
docker compose exec -T db psql -U postgres -d postgres -f /dev/stdin < db/0001_study_records.sql

echo "==> 5/6 启动 PostgREST 与 Caddy（Caddy 自动申请 HTTPS 证书）…"
docker compose up -d rest caddy

echo "==> 6/6 全部启动完成 ✅"
echo ""
echo "后端地址：${SITE_URL}"
echo "验证在线：curl ${SITE_URL}/"
echo "验证认证：curl ${SITE_URL}/auth/v1/health"
echo "验证数据：curl ${SITE_URL}/rest/v1/"
echo ""
echo "接下来把前端环境变量改成："
echo "  NUXT_SUPABASE_URL=${SITE_URL}"
echo "  NUXT_SUPABASE_ANON_KEY=${ANON_KEY}"
