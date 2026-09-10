"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/client";
import { useToast } from "./toast";

/**
 * Manages journal entries with optimistic updates:
 * mutations apply instantly and roll back on failure.
 */
export function useEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { err } = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/api/entries");
      setEntries(data.entries || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // create (optimistic)
  const create = useCallback(
    async (input) => {
      const temp = {
        id: `temp-${Date.now()}`,
        date: input.date,
        title: input.title,
        body: input.body,
        mood: input.mood || null,
        optimistic: true,
      };
      setEntries((prev) => [temp, ...prev]);
      try {
        const data = await api("/api/entries", { method: "POST", body: input });
        setEntries((prev) =>
          prev.map((e) => (e.id === temp.id ? data.entry : e))
        );
        return data.entry;
      } catch (e) {
        setEntries((prev) => prev.filter((e) => e.id !== temp.id));
        err(e.message);
        throw e;
      }
    },
    [err]
  );

  const update = useCallback(
    async (id, input) => {
      const prev = entries;
      setEntries((cur) =>
        cur.map((e) =>
          e.id === id ? { ...e, ...input, optimistic: true } : e
        )
      );
      try {
        const data = await api(`/api/entries/${id}`, { method: "PUT", body: input });
        setEntries((cur) => cur.map((e) => (e.id === id ? data.entry : e)));
        return data.entry;
      } catch (e) {
        setEntries(prev);
        err(e.message);
        throw e;
      }
    },
    [entries, err]
  );

  const remove = useCallback(
    async (id) => {
      const prev = entries;
      setEntries((cur) => cur.filter((e) => e.id !== id));
      try {
        await api(`/api/entries/${id}`, { method: "DELETE" });
      } catch (e) {
        setEntries(prev);
        err(e.message);
        throw e;
      }
    },
    [entries, err]
  );

  return { entries, loading, error, refresh, create, update, remove };
}
