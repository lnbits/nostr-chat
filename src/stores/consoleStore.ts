import { defineStore } from 'pinia';
import { ref } from 'vue';

type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface ConsoleEntry {
  id: number;
  level: ConsoleLevel;
  message: string;
  timestamp: number;
}

const MAX_ENTRIES = 500;

function formatUnknownValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  if (typeof value === 'symbol') {
    return value.toString();
  }

  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  if (typeof value === 'function') {
    return `[function ${value.name || 'anonymous'}]`;
  }

  const seen = new WeakSet<object>();
  const normalized = JSON.stringify(
    value,
    (_key, nestedValue) => {
      if (typeof nestedValue === 'object' && nestedValue !== null) {
        if (seen.has(nestedValue)) {
          return '[Circular]';
        }
        seen.add(nestedValue);
      }

      if (typeof nestedValue === 'bigint') {
        return nestedValue.toString();
      }

      return nestedValue;
    },
    2
  );

  if (normalized === undefined) {
    return String(value);
  }

  return normalized;
}

function formatLogArguments(args: unknown[]): string {
  return args.map((arg) => formatUnknownValue(arg)).join(' ');
}

export const useConsoleStore = defineStore('consoleStore', () => {
  const isOpen = ref(false);
  const entries = ref<ConsoleEntry[]>([]);
  const isCaptureInitialized = ref(false);
  let nextEntryId = 1;

  function appendEntry(level: ConsoleLevel, args: unknown[]): void {
    const newEntry: ConsoleEntry = {
      id: nextEntryId++,
      level,
      message: formatLogArguments(args),
      timestamp: Date.now()
    };

    entries.value = [...entries.value, newEntry];

    if (entries.value.length > MAX_ENTRIES) {
      entries.value = entries.value.slice(entries.value.length - MAX_ENTRIES);
    }
  }

  function initCapture(): void {
    if (isCaptureInitialized.value || typeof window === 'undefined') {
      return;
    }

    const consoleTarget = console as Console & Record<ConsoleLevel, (...args: unknown[]) => void>;
    const levels: ConsoleLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

    for (const level of levels) {
      const originalMethod = consoleTarget[level].bind(console);

      consoleTarget[level] = (...args: unknown[]) => {
        originalMethod(...args);
        appendEntry(level, args);
      };
    }

    isCaptureInitialized.value = true;
  }

  function open(): void {
    isOpen.value = true;
  }

  function close(): void {
    isOpen.value = false;
  }

  function toggle(): void {
    isOpen.value = !isOpen.value;
  }

  function clear(): void {
    entries.value = [];
  }

  return {
    isOpen,
    entries,
    initCapture,
    open,
    close,
    toggle,
    clear
  };
});
