"use client";
import React, { useEffect, useState } from "react";
import { Modal, MoodPicker, Spinner } from "./ui";
import { todayISO } from "../lib/client";

export default function EntryEditor({ open, entry, onClose, onSave }) {
  const isNew = !entry;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(todayISO());
  const [mood, setMood] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fieldErr, setFieldErr] = useState(null);

  useEffect(() => {
    if (!open) return;
    setTitle(entry ? entry.title : "");
    setBody(entry ? entry.body : "");
    setDate(entry ? entry.date : todayISO());
    setMood(entry ? entry.mood || null : null);
    setFieldErr(null);
    setSaving(false);
  }, [open, entry]);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setFieldErr("Please add a short title.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ title: title.trim(), body: body.trim(), date, mood });
      onClose();
    } catch (err) {
      // parent surfaces a toast; keep modal open
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isNew ? "New entry" : "Edit entry"}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Title</label>
          <input
            className={`input ${fieldErr ? "err" : ""}`}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setFieldErr(null);
            }}
            placeholder="What kind of day was it?"
            autoFocus
          />
          {fieldErr && <span className="err-txt">{fieldErr}</span>}
        </div>

        <div className="field">
          <label>Body</label>
          <textarea
            className="textarea"
            style={{ minHeight: 170 }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={"Write freely about your day…\n\nWhat happened? How did it feel? Any small wins or worries?"}
          />
        </div>

        <div className="field">
          <label>Date</label>
          <input
            type="date"
            className="input"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="field">
          <label>How did you feel? <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
          <MoodPicker value={mood} onChange={setMood} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <Spinner size={16} />}
            {isNew ? "Save entry" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
