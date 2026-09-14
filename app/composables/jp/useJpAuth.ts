import { ref } from "vue";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let initPromise: Promise<void> | null = null;

const currentUser = ref<User | null>(null);
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
    const c = getClient();
    initPromise = c.auth
      .getSession()
      .then(({ data }) => {
        currentUser.value = data.session?.user ?? null;
      })
      .finally(() => {
        authLoading.value = false;
      });
    c.auth.onAuthStateChange((_event, session) => {
      currentUser.value = session?.user ?? null;
      authLoading.value = false;
    });
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
