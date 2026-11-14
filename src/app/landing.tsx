"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Scene } from "./scene";

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function motionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Landing() {
  const frozen = useSyncExternalStore(subscribeMotion, motionSnapshot, () => false);

  return (
    <>
      <div className="scene-wrap" aria-hidden="true">
        <Scene frozen={frozen} />
      </div>
      <main className="landing">
        <section className="hero">
          <h1>Secret Santa</h1>

          <Link className="btn" href="/join">
            Get started
          </Link>
        </section>
      </main>
    </>
  );
}
