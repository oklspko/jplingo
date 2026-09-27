-- 初始化 PostgREST 所需的数据库角色与权限（幂等，可重复执行）
-- 由 setup.sh 传入 authenticator_password（psql 变量 :'authenticator_password'）
\set ON_ERROR_STOP off

-- GoTrue 迁移前需要 auth schema 已存在；密码哈希依赖 pgcrypto
-- （官方 supabase/postgres 镜像会预建，这里用原生 postgres:15 需手动建）
create schema if not exists auth;
create extension if not exists pgcrypto;

-- 角色：PostgREST 以 authenticator 登录，再按请求 JWT 的 role 切到 anon / authenticated / service_role
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator noinherit login password :'authenticator_password';

\set ON_ERROR_STOP on

grant anon, authenticated, service_role to authenticator;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
