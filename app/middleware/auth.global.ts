import { useJpAuth } from "~/composables/jp/useJpAuth";

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === "/login") return;

  const { ensureReady, user } = useJpAuth();
  await ensureReady();

  if (!user.value) {
    return navigateTo("/login");
  }
});
