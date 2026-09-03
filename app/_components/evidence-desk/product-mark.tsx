import { PanelsTopLeft } from "lucide-react";

import styles from "../../evidence-desk.module.css";

export function ProductMark() {
  return (
    <div className={styles.productMark} aria-hidden="true">
      <PanelsTopLeft strokeWidth={2} />
    </div>
  );
}
