"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useEntries } from "../../components/useEntries";
import EntryEditor from "../../components/EntryEditor";
import { Modal, EmptyState, MoodChip, SkeletonRows, moodDot } from "../../components/ui";
import {
  IconPlus, IconSearch, IconEdit, IconTrash, IconJournal,
} from "../../components/icons";
import { MOODS } from "@/lib/moods";

export default function JournalPage() {
  const { entries, loading, create, update, remove } = useEntries();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState("");
  const [moodFilter, setMoodFilter] = useState(null); // null = all
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null); // entry being edited, null=new
  const [viewing, setViewing] = useState(null); // entry being read
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const handledInit = useRef(false);

  // handle ?new=1 and ?e=<id>
  useEffect(() => {
    if (handledInit.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      setEditing(null); setEditorOpen(true);
    }
    const eid = params.get("e");
    if (eid && !editing) {
      // resolve after entries load
    }
    handledInit.current = true;
  }, []);

  // resolve ?e= after entries arrive
  useEffect(() => {
    const eid = new URLSearchParams(window.location.search).get("e");
    if (!eid || editing || viewing) return;
    const found = entries.find((e) => String(e.id) === eid);
    if (found) {
      setEditing(found);
      setEditorOpen(true);
    }
  }, [entries, editing, viewing]);

  const clearQuery = () => {
    router.replace(pathname, { scroll: false });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => (moodFilter ? e.mood === moodFilter : true))
      .filter((e) =>
        q
          ? (e.title + " " + e.body).toLowerCase().includes(q)
          : true
      );
  }, [entries, query, moodFilter]);

  const openNew = () => {
    clearQuery();
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (e) => { setEditing(e); setEditorOpen(true); };

  const onSave = async (input) => {
    if (editing) await update(editing.id, input);
    else await create(input);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await remove(deleting.id);
      setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="content">
      <div className="pagehead">
        <div>
          <div className="eyebrow"><IconJournal size={14} /> Journal</div>
          <h1 className="page-title">Your entries</h1>
          <p className="page-desc">A notepad for your days. Write honestly — patterns will emerge on their own.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <IconPlus size={17} /> New entry
        </button>
      </div>

      {/* toolbar */}
      <div className="flex between mb16" style={{ alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="searchbox" style={{ width: "min(100%, 320px)" }}>
          <IconSearch size={16} />
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entries…"
          />
        </div>
        <div className="flex gap6" style={{ flexWrap: "wrap", alignItems: "center" }}>
          <span className="muted" style={{ fontSize: 12.5, fontWeight: 600, marginRight: 2 }}>Mood:</span>
          <button
            className={`chip ${moodFilter === null ? "tag" : ""}`}
            style={{ background: moodFilter === null ? "var(--surface-3)" : "var(--surface)", border: "1px solid var(--line)", cursor: "pointer" }}
            onClick={() => setMoodFilter(null)}
          >All</button>
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMoodFilter(moodFilter === m.value ? null : m.value)}
              style={{
                cursor: "pointer",
                border: moodFilter === m.value ? "1px solid var(--brand)" : "1px solid var(--line)",
                background: moodFilter === m.value ? "var(--brand-soft)" : "var(--surface)",
                borderRadius: 999, padding: "4px 9px",
              }}
            >
              <span style={{ fontSize: 14 }}>{m.emoji}</span>
            </button>
          ))}
        </div>
      </div>

      {/* list */}
      {loading ? (
        <SkeletonRows count={5} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<IconJournal size={30} />}
          title="No entries yet"
          body="Your journal is a blank page. Capture the small moments of your day — a good meeting, a walk, how you really felt."
          action={<button className="btn btn-primary" onClick={openNew}><IconPlus size={16} /> Write your first entry</button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconSearch size={28} />}
          title="No matches"
          body="Nothing matches your current search or mood filter."
          action={<button className="btn btn-ghost" onClick={() => { setQuery(""); setMoodFilter(null); }}>Clear filters</button>}
        />
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          {filtered.map((e) => (
            <div className="card entry" key={e.id}>
              {moodDot(e.mood, 11)}
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="flex between gap12" style={{ alignItems: "flex-start" }}>
                  <div>
                    <h4 style={{ display: "inline", fontSize: 15, cursor: "pointer" }} onClick={() => setViewing(e)}>{e.title}</h4>
                  </div>
                  <div className="flex gap6" style={{ flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {e.date}
                    </span>
                    {e.mood && <MoodChip value={e.mood} />}
                  </div>
                </div>
                <p
                  onClick={() => setViewing(e)}
                  style={{ color: "var(--ink-2)", fontSize: 13.5, marginTop: 6, lineHeight: 1.5, cursor: "pointer" }}
                >
                  {e.body}
                </p>
                <div className="flex gap8 mt8" style={{ gap: 6 }}>
                  <button className="chip" style={{ background: "var(--surface-2)", cursor: "pointer", color: "var(--ink-2)" }} onClick={() => openEdit(e)}>
                    <IconEdit size={13} /> Edit
                  </button>
                  <button className="chip" style={{ background: "var(--surface-2)", cursor: "pointer", color: "var(--bad)" }} onClick={() => setDeleting(e)}>
                    <IconTrash size={13} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="muted" style={{ marginTop: 14, fontSize: 12.5 }}>
        {!loading && entries.length > 0 && `${entries.length} total ${entries.length === 1 ? "entry" : "entries"} · tapping a note opens it`}
      </p>

      {/* Editor (create/edit) */}
      <EntryEditor
        open={editorOpen}
        entry={editing}
        onClose={() => { setEditorOpen(false); clearQuery(); setEditing(null); }}
        onSave={onSave}
      />

      {/* View detail */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title || "Entry"}>
        {viewing && (
          <div>
            <div className="flex gap12 mb16" style={{ flexWrap: "wrap" }}>
              <span className="chip" style={{ background: "var(--surface-2)", color: "var(--ink-2)" }}>{viewing.date}</span>
              {viewing.mood && <MoodChip value={viewing.mood} />}
            </div>
            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, color: "var(--ink)", fontSize: 14.5 }}>{viewing.body}</p>
            <div className="flex gap8 mt24" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => { setViewing(null); openEdit(viewing); }}><IconEdit size={15} /> Edit</button>
              <button className="btn btn-primary" onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete entry?"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleting(null)} disabled={deletingBusy}>Cancel</button>
            <button className="btn btn-danger-ghost" onClick={confirmDelete} disabled={deletingBusy}>
              {deletingBusy ? "Deleting…" : "Delete permanently"}
            </button>
          </>
        }
      >
        <p style={{ color: "var(--ink-2)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--ink)" }}>“{deleting?.title}”</strong> will be permanently removed. This can't be undone.
        </p>
      </Modal>
    </div>
  );
}
