import { C, font } from "../../constants/colors";

interface EmptyStateProps {
  search: string;
  onClear: () => void;
}

export function EmptyState({ search, onClear }: EmptyStateProps) {
  return (
    <div style={{ textAlign: "center", padding: "36px 20px", color: C.sub }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
      <div style={{ fontSize: 14, marginBottom: 12 }}>
        {search ? "Không tìm thấy học sinh phù hợp" : "Không có học sinh trong bộ lọc này"}
      </div>
      <button
        onClick={onClear}
        style={{
          padding: "8px 16px",
          borderRadius: 9,
          border: `1.5px solid ${C.line}`,
          background: C.card,
          color: C.pine,
          fontWeight: 700,
          fontSize: 12.5,
          cursor: "pointer",
          fontFamily: font.body,
        }}
      >
        Xóa bộ lọc
      </button>
    </div>
  );
}
