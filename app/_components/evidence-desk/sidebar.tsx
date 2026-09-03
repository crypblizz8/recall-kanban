import { Columns3, PhoneCall } from "lucide-react";

import styles from "../../evidence-desk.module.css";
import { ProductMark } from "./product-mark";
import type { View } from "./types";

type SidebarProps = {
  view: View;
  callCount: number;
  boardTicketCount: number;
  onChange: (view: View) => void;
};

export function Sidebar({ view, callCount, boardTicketCount, onChange }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <ProductMark />
        <div><strong>Recall Kanban</strong><span>Built with Recall.ai</span></div>
      </div>

      <nav className={styles.primaryNav} aria-label="Workspace navigation">
        <button className={view === "calls" ? styles.navActive : undefined} type="button" onClick={() => onChange("calls")} aria-current={view === "calls" ? "page" : undefined}>
          <PhoneCall aria-hidden="true" className={styles.navIcon} strokeWidth={2} />Calls<span className={styles.navCount}>{callCount}</span>
        </button>
        <button className={view === "board" ? styles.navActive : undefined} type="button" onClick={() => onChange("board")} aria-current={view === "board" ? "page" : undefined}>
          <Columns3 aria-hidden="true" className={styles.navIcon} strokeWidth={2} />Board<span className={styles.navCount}>{boardTicketCount}</span>
        </button>
      </nav>

      <section className={styles.companySection} aria-labelledby="demo-companies-heading">
        <p id="demo-companies-heading">Companies</p>
        <ul>
          <li className={styles.companyActive}>
            <span className={`${styles.companyDot} ${styles.acme}`} aria-hidden="true" />
            <span>Acme Corp</span>
            <span className={styles.companyCount}>6</span>
          </li>
          <li>
            <span className={`${styles.companyDot} ${styles.northstar}`} aria-hidden="true" />
            <span>Northstar</span>
            <span className={styles.companyCount}>4</span>
          </li>
          <li>
            <span className={`${styles.companyDot} ${styles.helio}`} aria-hidden="true" />
            <span>Helio</span>
            <span className={styles.companyCount}>4</span>
          </li>
        </ul>
      </section>

    </aside>
  );
}
