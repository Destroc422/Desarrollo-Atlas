const DEMO_PREFIX = "atlas.";

type DemoChange<T = unknown> = { key: string; value: T };

function publish<T>(key: string, value: T) {
  window.dispatchEvent(new CustomEvent<DemoChange<T>>("atlas:persistent-value", { detail: { key, value } }));
}

export function readDemoValue<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

export function writeDemoValue<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    window.dispatchEvent(new CustomEvent("atlas:storage-error"));
    throw new Error("No se pudieron guardar los datos en este navegador. Libera espacio e inténtalo de nuevo.");
  }
  publish(key, value);
}

/** Save related demo snapshots together and restore previous values if storage rejects a write. */
export function writeDemoValues(values: Record<string, unknown>): void {
  const previous = new Map<string, string | null>();
  const written: string[] = [];
  try {
    for (const [key, value] of Object.entries(values)) {
      previous.set(key, localStorage.getItem(key));
      localStorage.setItem(key, JSON.stringify(value));
      written.push(key);
    }
  } catch {
    for (const key of written.reverse()) {
      const oldValue = previous.get(key);
      try {
        if (oldValue === null || oldValue === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, oldValue);
      } catch { /* Best effort rollback when browser storage is exhausted. */ }
    }
    window.dispatchEvent(new CustomEvent("atlas:storage-error"));
    throw new Error("No se pudieron guardar todos los cambios en este navegador. No se confirmó la operación.");
  }
  for (const [key, value] of Object.entries(values)) publish(key, value);
}

export function resetDemoValues(values: Record<string, unknown>): void {
  const keys = Object.keys(values);
  const existing = Object.keys(localStorage).filter((key) => key.startsWith(DEMO_PREFIX));
  const allKeys = new Set([...existing, ...keys]);
  const previous = new Map([...allKeys].map((key) => [key, localStorage.getItem(key)]));
  try {
    for (const key of existing) localStorage.removeItem(key);
    writeDemoValues(values);
  } catch (error) {
    for (const [key, oldValue] of previous) {
      try {
        if (oldValue === null) localStorage.removeItem(key);
        else localStorage.setItem(key, oldValue);
      } catch { /* Best effort rollback. */ }
    }
    throw error;
  }
}
