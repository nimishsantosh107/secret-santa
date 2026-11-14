"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

export function JoinForm() {
  const [closed, setClosed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [bad, setBad] = useState(false);

  useEffect(() => {
    let dead = false;
    fetch("/api/join", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as { closed?: boolean };
        if (!dead) setClosed(Boolean(data.closed));
      })
      .catch(() => {
        if (!dead) setClosed(false);
      });
    return () => {
      dead = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMsg("");
    setBad(false);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const data = (await res.json()) as { error?: string; updated?: boolean };
      if (!res.ok) throw new Error(data.error || "Could not save.");
      setMsg(
        data.updated
          ? "List updated. Same email overwrites until the draw locks."
          : "You are on the list. Same email overwrites until the draw locks.",
      );
    } catch (e) {
      setBad(true);
      setMsg(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap">
      <p className="kicker">
        <Link href="/">Back home</Link>
      </p>
      <h1>Join the list</h1>
      {closed === null ? <p>Checking the list...</p> : null}
      {closed ? (
        <section className="panel">
          <p>The list is locked. Submissions are shut.</p>
        </section>
      ) : null}
      {closed === false ? (
        <form className="panel" onSubmit={onSubmit}>
          <label className="field">
            <span>Name</span>
            <input name="name" required maxLength={80} autoComplete="name" />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" required maxLength={120} autoComplete="email" />
          </label>
          <label className="field">
            <span>Phone for delivery</span>
            <input name="phone" required maxLength={40} autoComplete="tel" />
          </label>
          <label className="field">
            <span>Address</span>
            <textarea name="address" required maxLength={500} autoComplete="street-address" />
          </label>
          <label className="field">
            <span>Gift preference</span>
            <textarea name="preference" required maxLength={1000} />
          </label>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Sending..." : "Join the list"}
          </button>
        </form>
      ) : null}
      <p className={bad ? "msg bad" : "msg"} role="status">
        {msg}
      </p>
    </main>
  );
}
