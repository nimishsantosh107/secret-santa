"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import Lenis from "lenis";
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
  const progress = useRef(0);
  const frozen = useSyncExternalStore(subscribeMotion, motionSnapshot, () => false);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.current = max > 0 ? window.scrollY / max : 0;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const fine = window.matchMedia("(pointer: fine)").matches;
    let frame = 0;
    let lenis: Lenis | null = null;
    if (!frozen && fine) {
      lenis = new Lenis();
      lenis.on("scroll", (instance) => {
        progress.current = instance.progress;
      });
      const raf = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, [frozen]);

  return (
    <>
      <div className="scene-wrap" aria-hidden="true">
        <Scene progress={progress} frozen={frozen} />
      </div>
      <main className="landing">
        <section className="hero">
          <p className="kicker">Friend circle // Christmas night</p>
          <h1>Secret Santa</h1>
          <p className="lede">
            One list. One draw. You buy for one person, and the only name you
            learn is theirs.
          </p>
          <Link className="btn" href="/join">
            Get started
          </Link>
        </section>
      </main>
    </>
  );
}
