import { onMounted, onUnmounted } from "vue";

interface Handlers {
  onToggleRomaji: () => void;
  onToggleKana: () => void;
  onToggleAnswer: () => void;
  onCompleteModalKey?: (e: KeyboardEvent) => boolean;
}

export function useJpGlobalKeyboard(handlers: Handlers) {
  function handler(e: KeyboardEvent) {
    if (handlers.onCompleteModalKey?.(e)) return;

    if (e.ctrlKey && e.code === "KeyR") {
      e.preventDefault();
      handlers.onToggleRomaji();
      return;
    }
    if (e.ctrlKey && e.code === "KeyK") {
      e.preventDefault();
      handlers.onToggleKana();
      return;
    }
    if (e.ctrlKey && e.code === "Semicolon") {
      e.preventDefault();
      handlers.onToggleAnswer();
    }
  }

  onMounted(() => {
    window.addEventListener("keydown", handler);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handler);
  });
}