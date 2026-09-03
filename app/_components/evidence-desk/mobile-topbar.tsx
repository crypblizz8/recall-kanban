import styles from "../../evidence-desk.module.css";
import { ProductMark } from "./product-mark";
import type { View } from "./types";

type MobileTopbarProps = {
  view: View;
  onChange: (view: View) => void;
};

export function MobileTopbar({ view, onChange }: MobileTopbarProps) {
  return (
    <header className={styles.mobileTopbar}>
      <div className={styles.mobileBrand}><ProductMark /><strong>Recall Kanban</strong></div>
      <div className={styles.mobileSwitch}>
        <button type="button" className={view === "calls" ? styles.mobileActive : undefined} onClick={() => onChange("calls")}>Calls</button>
        <button type="button" className={view === "board" ? styles.mobileActive : undefined} onClick={() => onChange("board")}>Board</button>
      </div>
    </header>
  );
}
