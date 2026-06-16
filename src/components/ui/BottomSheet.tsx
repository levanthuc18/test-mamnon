import { useRef, useEffect, ReactNode } from "react";
import { C, font } from "../../constants/colors";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }) {
  const sheetRef = useRef(null);
  const startYRef = useRef(null);
  const startTimeRef = useRef(null);
  const dyRef = useRef(0);
  const draggingRef = useRef(false);

  // dat transform truc tiep len DOM -> bam ngon tay 1:1, khong cho React render, khong tre
  const setT = (y, anim) => {
    const el = sheetRef.current; if (!el) return;
    el.style.transition = anim ? "transform .22s cubic-bezier(.32,.72,.35,1)" : "none";
    el.style.transform = `translateY(${y}px)`;
  };

  useEffect(() => { if (open) { dyRef.current = 0; draggingRef.current = false; requestAnimationFrame(() => setT(0, false)); } }, [open]);

  if (!open) return null;

  const onStart = (y) => { startYRef.current = y; startTimeRef.current = Date.now(); dyRef.current = 0; draggingRef.current = true; setT(0, false); };
  const onMove = (y) => {
    if (startYRef.current == null) return;
    const dy = Math.max(0, y - startYRef.current);
    dyRef.current = dy;
    setT(dy, false); // theo ngon tay tuc thi, khong transition
  };
  const onEnd = () => {
    if (startYRef.current == null) return;
    const dy = dyRef.current;
    const dt = Date.now() - (startTimeRef.current || 0);
    const velocity = dy / (dt || 1);
    startYRef.current = null; startTimeRef.current = null; draggingRef.current = false;
    if (dy > 90 || (dy > 30 && velocity > 0.35)) {
      setT((typeof window !== "undefined" ? window.innerHeight : 800), true); // truot xuong roi dong
      setTimeout(onClose, 160);
    } else {
      setT(0, true); // bat lai vi tri cu
    }
  };

  const dragProps = {
    onTouchStart: (e) => onStart(e.touches[0].clientY),
    onTouchMove: (e) => onMove(e.touches[0].clientY),
    onTouchEnd: () => onEnd(),
    onMouseDown: (e) => onStart(e.clientY),
    onMouseMove: (e) => { if (e.buttons === 1) onMove(e.clientY); },
    onMouseUp: () => onEnd(),
    onMouseLeave: (e) => { if (draggingRef.current && e.buttons === 1) onEnd(); },
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,.45)" }} />
      <div ref={sheetRef} style={{
        background: "#fff", borderRadius: "20px 20px 0 0", padding: "0 16px 24px",
        maxHeight: "82vh", overflowY: "auto", boxShadow: "0 -4px 24px rgba(0,0,0,.18)", willChange: "transform",
      }}>
        {/* Vung vuot: nut keo + tieu de, rong rai, touch-action none -> vuot la an lien */}
        <div {...dragProps} style={{ touchAction: "none", cursor: "grab", margin: "0 -16px", padding: "10px 16px 2px", position: "sticky", top: 0, background: "#fff", zIndex: 2 }}>
          <div style={{ width: 44, height: 5, borderRadius: 99, background: C.line, margin: "0 auto 12px" }} />
          {title && <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 8 }}>{title}</div>}
          <button onClick={onClose} aria-label="Đóng" style={{ position: "absolute", top: 8, right: 10, width: 32, height: 32, borderRadius: 99, border: "none", background: C.graySoft, color: C.sub, fontSize: 17, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ paddingTop: 8 }}>{children}</div>
      </div>
    </div>
  );
}
