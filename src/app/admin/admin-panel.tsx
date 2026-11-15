"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { applyHtml, applyText, SAMPLE_VARS } from "@/lib/template";
import type { PublicState } from "@/lib/types";

type Draft = {
  emailSubject: string;
  emailHtml: string;
};

type ApiData = {
  error?: string;
  state?: PublicState;
  processed?: boolean;
};

function draftFrom(state: PublicState): Draft {
  return {
    emailSubject: state.emailSubject,
    emailHtml: state.emailHtml,
  };
}

function counts(state: PublicState) {
  let emailed = 0;
  for (const rider of state.participants) {
    if (rider.mail === "sent") emailed += 1;
  }
  return { total: state.participants.length, emailed };
}

type PersonForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  preference: string;
};

const emptyForm: PersonForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  preference: "",
};

function Mask() {
  return <span className="mask" aria-hidden="true" />;
}

export function AdminPanel() {
  const [phase, setPhase] = useState<"loading" | "login" | "ready">("loading");
  const [state, setState] = useState<PublicState | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [password, setPassword] = useState("");
  const [testTo, setTestTo] = useState("");
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [bad, setBad] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showPref, setShowPref] = useState(false);
  const [showChild, setShowChild] = useState(false);
  const [openPair, setOpenPair] = useState<string | null>(null);
  const [form, setForm] = useState<PersonForm>(emptyForm);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin", { cache: "no-store" });
    if (res.status === 401) {
      setPhase("login");
      setState(null);
      return;
    }
    const data = (await res.json()) as ApiData;
    const next = data.state;
    if (!res.ok || !next) throw new Error(data.error || "Could not load the host page.");
    setState(next);
    setDraft((current) => current ?? draftFrom(next));
    setPhase("ready");
  }, []);

  useEffect(() => {
    let dead = false;
    refresh().catch((e: unknown) => {
      if (dead) return;
      setPhase("login");
      setBad(true);
      setMsg(e instanceof Error ? e.message : "Could not load the host page.");
    });
    return () => {
      dead = true;
    };
  }, [refresh]);

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as ApiData;
    if (!res.ok) throw new Error(data.error || "Request failed.");
    if (data.state) setState(data.state);
    return data;
  }

  async function act(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setMsg("");
    setBad(false);
    try {
      await fn();
    } catch (e) {
      setBad(true);
      setMsg(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    await act("login", async () => {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "login", password }),
      });
      if (!res.ok) throw new Error("Wrong password.");
      setPassword("");
      await refresh();
    });
  }

  function pick(id: string) {
    setOpenId((current) => (current === id ? null : id));
    setEditing(false);
    setShowPref(false);
    setShowChild(false);
  }

  async function savePerson(event: FormEvent) {
    event.preventDefault();
    if (!openId) return;
    await act("person", async () => {
      await post({ action: "participant", id: openId, ...form });
      setEditing(false);
      setMsg("Saved.");
    });
  }

  async function sendEmails() {
    await act("email", async () => {
      let attempted = false;
      for (;;) {
        const data = await post({ action: "email" });
        if (!data.processed) break;
        attempted = true;
      }
      setMsg(attempted ? "Email pass done." : "No pending emails.");
    });
  }

  if (phase === "loading") {
    return (
      <main className="wrap">
        <p>Opening the host page...</p>
      </main>
    );
  }

  if (phase === "login" || !state || !draft) {
    return (
      <main className="wrap">
        <p className="kicker">
          <Link href="/">Home</Link>
        </p>
        <h1>Host</h1>
        <form className="panel" onSubmit={onLogin}>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="btn" type="submit" disabled={busy !== null}>
            Unlock
          </button>
        </form>
        <p className={bad ? "msg bad" : "msg"} role="status">
          {msg}
        </p>
      </main>
    );
  }

  const tally = counts(state);
  const locked = busy !== null;
  const riders = [...state.participants].sort((a, b) => a.name.localeCompare(b.name));
  const nameOf = (id: string) => riders.find((rider) => rider.id === id)?.name ?? "unknown";
  const open = riders.find((rider) => rider.id === openId) ?? null;
  const childId = open && state.mapping ? (state.mapping[open.id] ?? null) : null;
  const childName = childId ? nameOf(childId) : null;
  const pairs = state.mapping
    ? Object.entries(state.mapping)
        .map(([santaId, drawnId]) => ({
          santaId,
          santa: nameOf(santaId),
          child: nameOf(drawnId),
        }))
        .sort((a, b) => a.santa.localeCompare(b.santa))
    : [];

  async function saveDraft() {
    await act("templates", async () => {
      const data = await post({ action: "templates", ...draft });
      if (data.state) setDraft(draftFrom(data.state));
      setMsg("Template saved.");
    });
  }

  return (
    <main className="wrap wide">
      <p className="kicker">
        <Link href="/">Home</Link>
      </p>
      <h1>Host</h1>
      <p className="hint">
        Open a name for their form. The wish and their child stay blurred until you show them.
      </p>
      <p className={bad ? "msg bad" : "msg"} role="status">
        {msg}
      </p>

      <section className="panel">
        <h2>Roster</h2>
        <p>
          People {tally.total}. Submissions {state.closed ? "shut" : "open"}.
          {state.mapped
            ? ` Emails ${tally.emailed}/${tally.total} sent.`
            : " Shuffle has not run."}
        </p>
        <ul className="riders">
          {riders.map((rider) => (
            <li key={rider.id}>
              <button
                type="button"
                className="rider-btn"
                aria-expanded={openId === rider.id}
                onClick={() => pick(rider.id)}
              >
                <b>{rider.name}</b>
                <span>
                  {rider.email}
                  {state.mapped ? ` · mail ${rider.mail}` : " · signed up"}
                </span>
              </button>
              {open && open.id === rider.id ? (
                <div className="sheet">
            {editing ? (
              <form onSubmit={(event) => void savePerson(event)} autoComplete="off">
                <label className="field">
                  <span>Name</span>
                  <input
                    value={form.name}
                    required
                    maxLength={80}
                    disabled={locked}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    required
                    maxLength={120}
                    disabled={locked}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Phone for delivery</span>
                  <input
                    type="tel"
                    value={form.phone}
                    required
                    maxLength={40}
                    disabled={locked}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Address</span>
                  <textarea
                    value={form.address}
                    required
                    maxLength={500}
                    disabled={locked}
                    onChange={(event) => setForm({ ...form, address: event.target.value })}
                  />
                </label>
                <div className="field">
                  <div className="row">
                    <span>Gift preference</span>
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => setShowPref((value) => !value)}
                    >
                      {showPref ? "Blur" : "Show"}
                    </button>
                  </div>
                  {showPref ? (
                    <textarea
                      value={form.preference}
                      required
                      maxLength={1000}
                      disabled={locked}
                      onChange={(event) => setForm({ ...form, preference: event.target.value })}
                    />
                  ) : (
                    <Mask />
                  )}
                </div>
                <div className="row">
                  <button className="btn" type="submit" disabled={locked}>
                    Save
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    disabled={locked}
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dl>
                <div>
                  <dt>Name</dt>
                  <dd>{open.name}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{open.email}</dd>
                </div>
                <div>
                  <dt>Phone for delivery</dt>
                  <dd>{open.phone}</dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>{open.address}</dd>
                </div>
                <div>
                  <dt>
                    Gift preference
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => setShowPref((value) => !value)}
                    >
                      {showPref ? "Blur" : "Show"}
                    </button>
                  </dt>
                  <dd>{showPref ? open.preference : <Mask />}</dd>
                </div>
              </dl>
            )}
            <div>
              <div className="row">
                <span className="label">Child</span>
                {childName ? (
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => setShowChild((value) => !value)}
                  >
                    {showChild ? "Blur" : "Show"}
                  </button>
                ) : null}
              </div>
              {childName && !showChild ? (
                <Mask />
              ) : (
                <p className="plain">{childName ?? "Not assigned yet."}</p>
              )}
            </div>
            {editing ? null : (
              <div className="row">
                <button
                  className="btn"
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    setForm({
                      name: open.name,
                      email: open.email,
                      phone: open.phone,
                      address: open.address,
                      preference: open.preference,
                    });
                    setEditing(true);
                  }}
                >
                  Edit
                </button>
              </div>
            )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="row stack">
          <button
            className="btn ghost"
            type="button"
            disabled={locked || state.mapped}
            onClick={() =>
              void act("close", () => post({ action: "close", closed: !state.closed }))
            }
          >
            {state.mapped
              ? "Submissions locked"
              : state.closed
                ? "Open submissions"
                : "Close submissions"}
          </button>
          <button
            className="btn ghost"
            type="button"
            disabled={locked}
            onClick={() =>
              void act("logout", async () => {
                await post({ action: "logout" });
                setDraft(null);
                setState(null);
                setOpenId(null);
                setEditing(false);
                setShowPref(false);
                setShowChild(false);
                setOpenPair(null);
                setPhase("login");
              })
            }
          >
            Log out
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Exclusions</h2>
        <p className="hint">
          Self-matches are always blocked. A pair here cannot be Santa for each other.
        </p>
        <div className="pair-pick">
          <select value={left} disabled={locked || state.mapped} onChange={(e) => setLeft(e.target.value)}>
            <option value="">Person A</option>
            {riders.map((rider) => (
              <option key={rider.id} value={rider.id}>
                {rider.name}
              </option>
            ))}
          </select>
          <select value={right} disabled={locked || state.mapped} onChange={(e) => setRight(e.target.value)}>
            <option value="">Person B</option>
            {riders.map((rider) => (
              <option key={rider.id} value={rider.id}>
                {rider.name}
              </option>
            ))}
          </select>
        </div>
        <div className="row stack">
          <button
            className="btn"
            type="button"
            disabled={locked || state.mapped}
            onClick={() => {
              if (!left || !right || left === right) {
                setBad(true);
                setMsg("Pick two different people.");
                return;
              }
              void act("excl", () =>
                post({
                  action: "exclusions",
                  exclusions: [...state.exclusions, { a: left, b: right }],
                }),
              );
            }}
          >
            Block pair
          </button>
        </div>
        <ul className="pairs">
          {state.exclusions.map((pair, index) => (
            <li key={`${pair.a}-${pair.b}`}>
              <span>
                {nameOf(pair.a)} + {nameOf(pair.b)}
              </span>
              <button
                className="btn ghost"
                type="button"
                disabled={locked || state.mapped}
                onClick={() =>
                  void act("excl", () =>
                    post({
                      action: "exclusions",
                      exclusions: state.exclusions.filter((_, i) => i !== index),
                    }),
                  )
                }
              >
                Drop
              </button>
            </li>
          ))}
        </ul>
      </section>

      <details
        className="panel draw"
        onToggle={(event) => {
          if (!event.currentTarget.open) setOpenPair(null);
        }}
      >
        <summary>Assignments</summary>
        {state.mapped ? (
          <>
            <p className="hint">Show one row at a time.</p>
            <ul className="pairs">
              {pairs.map((pair) => {
                const shown = openPair === pair.santaId;
                return (
                  <li key={pair.santaId}>
                    <span className="who">
                      <span className="label">Santa</span>
                      {shown ? <b>{pair.santa}</b> : <Mask />}
                    </span>
                    <span className="who">
                      <span className="label">Child</span>
                      {shown ? <b>{pair.child}</b> : <Mask />}
                    </span>
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => setOpenPair(shown ? null : pair.santaId)}
                    >
                      {shown ? "Blur" : "Show"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="hint">The draw has not run.</p>
        )}
      </details>

      <section className="panel">
        <h2>Shuffle</h2>
        <p className="hint">This locks submissions. Assignments stay blurred until you show them.</p>
        <button
          className="btn"
          type="button"
          disabled={locked || state.mapped || tally.total < 2}
          onClick={() => {
            if (!window.confirm("Run the shuffle? Submissions lock. Assignments stay blurred until you show them.")) {
              return;
            }
            void act("shuffle", () => post({ action: "shuffle" }));
          }}
        >
          Run shuffle
        </button>
      </section>

      <section className="panel">
        <h2>Emails</h2>
        <p className="hint">
          Each Santa gets their person. Already-sent people are skipped.
        </p>
        <button
          className="btn"
          type="button"
          disabled={locked || !state.mapped || tally.emailed === tally.total}
          onClick={() => {
            if (!window.confirm("Send Santa emails now? People already mailed are skipped.")) {
              return;
            }
            void sendEmails();
          }}
        >
          Send emails
        </button>
      </section>

      <section className="panel">
        <h2>Email template</h2>
        <div className="template-split">
          <div>
            <p className="hint">
              Tokens: {"{{santa_name}} {{child_name}} {{child_email}} {{child_phone}} {{child_address}} {{child_pref}}"}
            </p>
            <label className="field">
              <span>Subject</span>
              <input
                value={draft.emailSubject}
                maxLength={200}
                onChange={(event) => setDraft({ ...draft, emailSubject: event.target.value })}
              />
            </label>
            <label className="field">
              <span>HTML</span>
              <textarea
                value={draft.emailHtml}
                rows={12}
                onChange={(event) => setDraft({ ...draft, emailHtml: event.target.value })}
              />
            </label>
            <div className="row">
              <button
                className="btn"
                type="button"
                disabled={locked}
                onClick={() => void saveDraft()}
              >
                Save template
              </button>
            </div>
            <label className="field stack">
              <span>Test inbox</span>
              <input
                type="email"
                value={testTo}
                maxLength={120}
                placeholder="you@example.com"
                onChange={(event) => setTestTo(event.target.value)}
              />
            </label>
            <button
              className="btn ghost"
              type="button"
              disabled={locked}
              onClick={() => {
                const to = testTo.trim();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
                  setBad(true);
                  setMsg("Type the inbox the test should land in.");
                  return;
                }
                void act("test", async () => {
                  await post({ action: "test", to, ...draft });
                  setMsg("Test sent. Same template as the preview, filled in as John.");
                });
              }}
            >
              Send test
            </button>
          </div>
          <div>
            <p className="hint">Preview, filled in as John buying for Jane.</p>
            <div className="preview-box">
              <p className="preview-subject">{applyText(draft.emailSubject, SAMPLE_VARS)}</p>
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={applyHtml(draft.emailHtml, SAMPLE_VARS)}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
