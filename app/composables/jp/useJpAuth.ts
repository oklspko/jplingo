import { ref } from "vue";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let initPromise: Promise<void> | null = null;

export const currentUser = ref<User | null>(null);
const authLoading = ref(true);

function getClient(): SupabaseClient {
  if (!client) {
    const config = useRuntimeConfig().public;
    client = createClient(
      config.supabaseUrl as string,
      config.supabaseAnonKey as string,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
    );
  }
  return client;
}

function ensureAuthInit(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const c = getClient();
        c.auth.onAuthStateChange((_event, session) => {
          currentUser.value = session?.user ?? null;
          authLoading.value = false;
        });
        const { data } = await c.auth.getSession();
        currentUser.value = data.session?.user ?? null;
      } catch (err) {
        // 部分浏览器（Safari 无痕/隐私模式、存储受限的国产浏览器/微信 WebView）
        // 读取 localStorage 会抛 SecurityError，导致 getSession() reject。
        // 这里兜底：把鉴权初始化失败视为「未登录」，绝不让它把整站带崩成 500 页。
        console.error("[jp-lingo] 初始化登录状态失败：", err);
        currentUser.value = null;
      } finally {
        authLoading.value = false;
      }
    })();
  }
  return initPromise;
}

export function useJpAuth() {
  ensureAuthInit();

  async function signUp(email: string, password: string) {
    const { data, error } = await getClient().auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await getClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await getClient().auth.signOut();
  }

  return {
    user: currentUser,
    loading: authLoading,
    ensureReady: ensureAuthInit,
    signUp,
    signIn,
    signOut,
  };
}

export function useJpSupabaseClient(): SupabaseClient {
  return getClient();
}

export function getCurrentUserId(): string | null {
  return currentUser.value?.id ?? null;
}
