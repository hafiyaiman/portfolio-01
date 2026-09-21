"use client";

import type { KeyboardEventHandler, ReactNode, RefObject } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./RacingPauseMenu.module.css";

export type PauseTab = "Race" | "Controls" | "Audio";
export type PauseRow = {
  label: string; value?: string; subtitle?: string; isCycler?: boolean;
  actionLabel?: string; icon?: ReactNode; help: string;
  run: () => void; prev?: () => void; next?: () => void;
};

type Props = {
  containerRef: RefObject<HTMLDivElement | null>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  tab: PauseTab; setTab: (tab: PauseTab) => void;
  active: number; setActive: (index: number) => void; rows: PauseRow[];
  notice: string; score: number; multiplier: number; assist: string;
  controllerConnected: boolean; controllerName: string;
  resume: () => void; confirming: boolean; children?: ReactNode;
};

export function PauseMenuView({ containerRef, ...props }: Props) {
  const reduced = useReducedMotion();
  const { tab, active, rows, confirming } = props;
  return <div ref={containerRef} className={styles.overlay} role="dialog" aria-modal="true"
    aria-labelledby="pause-title" tabIndex={-1} onKeyDown={props.onKeyDown}>
    <motion.div className={styles.shell} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.12 }}>
      <header className={styles.header}>
        <h1 id="pause-title">{confirming ? "RESTART RUN?" : "PAUSED"}</h1>
        <span>GENTING HIGHLANDS</span>
      </header>

      <section className={styles.menu} aria-label="Pause actions">
        {!confirming && <nav className={styles.sections} aria-label="Pause menu sections">
          {(["Race", "Controls", "Audio"] as const).map(t => <button key={t} type="button"
            aria-pressed={tab === t} onClick={() => props.setTab(t)}>{t === "Race" ? "Drive" : t}</button>)}
        </nav>}
        {confirming && <p className={styles.confirmation}>Your drift score will be cleared. Return to the start?</p>}
        <div className={styles.rows} aria-label={confirming ? "Confirm restart" : `${tab} options`}>
          {rows.map((row, i) => <div key={row.label} className={`${styles.row} ${active === i ? styles.selected : ""}`}
            onMouseEnter={() => props.setActive(i)}>
            <button type="button" data-pause-row={i} className={styles.action}
              onFocus={() => props.setActive(i)} onClick={row.run} aria-describedby="pause-help">
              {row.label}
            </button>
            {row.isCycler && <div className={styles.value}>
              <button type="button" onFocus={() => props.setActive(i)} onClick={row.prev ?? row.run} aria-label={`Previous ${row.label}`}><ChevronLeft size={16} /></button>
              <span aria-live="polite">{row.value}</span>
              <button type="button" onFocus={() => props.setActive(i)} onClick={row.next ?? row.run} aria-label={`Next ${row.label}`}><ChevronRight size={16} /></button>
            </div>}
          </div>)}
        </div>
        <p id="pause-help" className={styles.help} role="status">{props.notice || rows[active]?.help}</p>
        <div className={styles.secondary}>
          <button type="button" onClick={props.resume} aria-label={confirming ? "Cancel restart" : "Resume driving"}>{confirming ? "Cancel" : "Back to driving"}</button>
          {!confirming && <Link href="/">Exit to portfolio</Link>}
        </div>
      </section>

      <aside className={styles.session} aria-label="Current session">
        <span>Nissan Silvia S15</span>
        <strong>{Math.floor(props.score).toLocaleString("en-US")} <small>PTS</small></strong>
        <span>{props.assist.toUpperCase()} / {props.controllerConnected ? "CONTROLLER" : "KEYBOARD"}</span>
      </aside>
      <footer className={styles.footer}>
        <span><kbd>{props.controllerConnected ? "D-PAD" : "↑ ↓"}</kbd> Select</span>
        <span><kbd>{props.controllerConnected ? "A / ×" : "ENTER"}</kbd> Confirm</span>
        <span><kbd>{props.controllerConnected ? "LB / RB" : "Q / E"}</kbd> Sections</span>
        <span><kbd>{props.controllerConnected ? "B / ○" : "ESC"}</kbd> {confirming ? "Cancel" : "Resume"}</span>
      </footer>
    </motion.div>
    {props.children}
  </div>;
}
