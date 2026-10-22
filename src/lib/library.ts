import { LocalStorage, Toast, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { byId } from "./catalog";

interface Library {
  favorites: string[];
  recent: string[];
}

const KEY = "latex-palette.library.v1";

function readIds(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === "string" && byId.has(id)))]
    : [];
}

export function useLibrary(rememberUsage: boolean) {
  const [library, setLibrary] = useState<Library>({ favorites: [], recent: [] });
  const [isLoading, setIsLoading] = useState(true);
  const current = useRef(library);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    let mounted = true;
    LocalStorage.getItem<string>(KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return;
        const value = parsed as Record<string, unknown>;
        const restored = { favorites: readIds(value.favorites), recent: readIds(value.recent).slice(0, 30) };
        current.current = restored;
        setLibrary(restored);
      })
      .catch(() => showToast({ style: Toast.Style.Failure, title: "Could not load saved picks" }))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function update(next: Library) {
    const previous = current.current;
    current.current = next;
    setLibrary(next);
    const write = writes.current.then(() => LocalStorage.setItem(KEY, JSON.stringify(next)));
    writes.current = write.catch(() => {});
    try {
      await write;
    } catch {
      if (current.current === next) {
        current.current = previous;
        setLibrary(previous);
      }
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save picks",
        message: "You can still paste and copy LaTeX.",
      });
    }
  }

  return {
    ...library,
    isLoading,
    async toggleFavorite(id: string) {
      const value = current.current;
      await update({
        ...value,
        favorites: value.favorites.includes(id)
          ? value.favorites.filter((item) => item !== id)
          : [...value.favorites, id],
      });
    },
    async recordUse(id: string) {
      if (!rememberUsage) return;
      const value = current.current;
      await update({ ...value, recent: [id, ...value.recent.filter((item) => item !== id)].slice(0, 30) });
    },
  };
}
