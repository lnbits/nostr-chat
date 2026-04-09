import {
  MAX_DESKTOP_SIDEBAR_WIDTH,
  MIN_DESKTOP_SIDEBAR_WIDTH,
  readDesktopSidebarWidthPreference,
  saveDesktopSidebarWidthPreference,
} from 'src/utils/themeStorage';
import { computed, onBeforeUnmount, onMounted, type Ref, ref, watch } from 'vue';

const DESKTOP_SIDEBAR_MAX_RATIO = 0.75;

interface UseDesktopSidebarWidthResult {
  shellRef: Ref<HTMLElement | null>;
  shellStyle: Readonly<Ref<Record<string, string>>>;
  sidebarWidth: Readonly<Ref<number>>;
  minSidebarWidth: number;
  maxSidebarWidth: Readonly<Ref<number>>;
  startSidebarResize: (event: PointerEvent) => void;
  handleSidebarResizeKeydown: (event: KeyboardEvent) => void;
}

export function useDesktopSidebarWidth(
  isMobile: Readonly<Ref<boolean>>
): UseDesktopSidebarWidthResult {
  const shellRef = ref<HTMLElement | null>(null);
  const sidebarWidth = ref(readDesktopSidebarWidthPreference());
  const isResizing = ref(false);
  let resizeObserver: ResizeObserver | null = null;

  function getShellWidth(): number {
    return shellRef.value?.getBoundingClientRect().width ?? 0;
  }

  function getMaximumSidebarWidth(): number {
    const shellWidth = getShellWidth();
    if (!shellWidth) {
      return MAX_DESKTOP_SIDEBAR_WIDTH;
    }

    return Math.max(
      MIN_DESKTOP_SIDEBAR_WIDTH,
      Math.min(MAX_DESKTOP_SIDEBAR_WIDTH, Math.floor(shellWidth * DESKTOP_SIDEBAR_MAX_RATIO))
    );
  }

  function clampSidebarWidth(width: number): number {
    return Math.round(
      Math.min(getMaximumSidebarWidth(), Math.max(MIN_DESKTOP_SIDEBAR_WIDTH, width))
    );
  }

  function applySidebarWidth(width: number, persist: boolean): void {
    const nextWidth = clampSidebarWidth(width);
    sidebarWidth.value = nextWidth;

    if (persist) {
      saveDesktopSidebarWidthPreference(nextWidth);
    }
  }

  function syncSidebarWidthWithinBounds(): void {
    if (isMobile.value) {
      return;
    }

    applySidebarWidth(sidebarWidth.value, false);
  }

  function setResizeDocumentState(active: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.style.cursor = active ? 'col-resize' : '';
    document.body.style.userSelect = active ? 'none' : '';
  }

  function stopSidebarResize(persist: boolean): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', handleSidebarResizeMove);
      window.removeEventListener('pointerup', handleSidebarResizeEnd);
      window.removeEventListener('pointercancel', handleSidebarResizeEnd);
    }

    if (persist) {
      saveDesktopSidebarWidthPreference(sidebarWidth.value);
    }

    isResizing.value = false;
    setResizeDocumentState(false);
  }

  function handleSidebarResizeMove(event: PointerEvent): void {
    if (!isResizing.value) {
      return;
    }

    const shellLeft = shellRef.value?.getBoundingClientRect().left ?? 0;
    applySidebarWidth(event.clientX - shellLeft, false);
  }

  function handleSidebarResizeEnd(): void {
    stopSidebarResize(true);
  }

  function startSidebarResize(event: PointerEvent): void {
    if (isMobile.value || event.button !== 0 || typeof window === 'undefined') {
      return;
    }

    if (!shellRef.value) {
      return;
    }

    event.preventDefault();
    isResizing.value = true;
    setResizeDocumentState(true);
    window.addEventListener('pointermove', handleSidebarResizeMove);
    window.addEventListener('pointerup', handleSidebarResizeEnd);
    window.addEventListener('pointercancel', handleSidebarResizeEnd);
  }

  function handleSidebarResizeKeydown(event: KeyboardEvent): void {
    if (isMobile.value) {
      return;
    }

    const keyboardStep = event.shiftKey ? 32 : 16;
    let nextWidth: number | null = null;

    if (event.key === 'ArrowLeft') {
      nextWidth = sidebarWidth.value - keyboardStep;
    } else if (event.key === 'ArrowRight') {
      nextWidth = sidebarWidth.value + keyboardStep;
    } else if (event.key === 'Home') {
      nextWidth = MIN_DESKTOP_SIDEBAR_WIDTH;
    } else if (event.key === 'End') {
      nextWidth = getMaximumSidebarWidth();
    }

    if (nextWidth === null) {
      return;
    }

    event.preventDefault();
    applySidebarWidth(nextWidth, true);
  }

  const shellStyle = computed<Record<string, string>>(() => {
    if (isMobile.value) {
      return {};
    }

    return {
      '--desktop-sidebar-width': `${clampSidebarWidth(sidebarWidth.value)}px`,
    };
  });

  const currentSidebarWidth = computed(() => clampSidebarWidth(sidebarWidth.value));
  const maxSidebarWidth = computed(() => getMaximumSidebarWidth());

  onMounted(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('resize', syncSidebarWidthWithinBounds);

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        syncSidebarWidthWithinBounds();
      });

      if (shellRef.value) {
        resizeObserver.observe(shellRef.value);
      }
    }

    syncSidebarWidthWithinBounds();
  });

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', syncSidebarWidthWithinBounds);
    }

    resizeObserver?.disconnect();
    stopSidebarResize(false);
  });

  watch(
    () => isMobile.value,
    (mobile) => {
      if (mobile) {
        stopSidebarResize(false);
        return;
      }

      syncSidebarWidthWithinBounds();
    },
    { immediate: true }
  );

  return {
    shellRef,
    shellStyle,
    sidebarWidth: currentSidebarWidth,
    minSidebarWidth: MIN_DESKTOP_SIDEBAR_WIDTH,
    maxSidebarWidth,
    startSidebarResize,
    handleSidebarResizeKeydown,
  };
}
