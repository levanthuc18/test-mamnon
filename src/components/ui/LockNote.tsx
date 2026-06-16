import { C } from "../../constants/colors";

export function LockNote() {
  return (
    <div
      style={{
        background: "#FBF1D8",
        border: "1px solid #EAD8A0",
        borderRadius: 10,
        padding: "8px 12px",
        marginBottom: 10,
        fontSize: 12.5,
        color: "#7A5E12",
      }}
    >
      🔒 Tháng này đã chốt — chỉ xem. Mở khóa ở tab Tổng quan.
    </div>
  );
}
