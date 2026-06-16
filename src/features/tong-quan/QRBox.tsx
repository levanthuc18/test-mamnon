import { useState } from "react";
import { C } from "../../constants/colors";
import { noDau } from "../../utils/format";

const BANK_BIN: Record<string, string> = {
  vietcombank: "970436", vcb: "970436", techcombank: "970407", tcb: "970407",
  bidv: "970418", vietinbank: "970415", ctg: "970415", agribank: "970405",
  mbbank: "970422", mb: "970422", acb: "970416", vpbank: "970432", vpb: "970432",
  tpbank: "970423", tpb: "970423", sacombank: "970403", stb: "970403",
  hdbank: "970437", vib: "970441", shb: "970443", ocb: "970448", msb: "970426",
  scb: "970429", eximbank: "970431", lienvietpostbank: "970449", lpbank: "970449",
  seabank: "970440", bacabank: "970409", vietabank: "970427", namabank: "970428",
  pgbank: "970430", vietbank: "970433", baovietbank: "970438", kienlongbank: "970452",
  abbank: "970425", dongabank: "970406", gpbank: "970408", ncb: "970419",
  saigonbank: "970400", pvcombank: "970412",
};

function binOf(nh: string): string | null {
  const k = noDau(nh || "").replace(/[^a-z]/g, "");
  return BANK_BIN[k] || null;
}

interface QRBoxProps {
  bank?: { chu: string; stk: string; nh: string };
  amount?: number;
  noiDung?: string;
}

export function QRBox({ bank, amount = 0, noiDung = "" }: QRBoxProps) {
  const bin = binOf(bank?.nh);
  const [err, setErr] = useState(false);
  if (!bin || !bank?.stk || err) {
    return (
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 8,
          background: "#fff",
          border: `1.5px solid ${C.pine}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: C.sub,
          textAlign: "center",
          flexShrink: 0,
          padding: 4,
        }}
      >
        {bin ? "QR" : "QR (ngân hàng chưa hỗ trợ)"}
      </div>
    );
  }
  const url = `https://img.vietqr.io/image/${bin}-${bank.stk}-compact.png?` + (amount > 0 ? `amount=${Math.round(amount)}&` : "") + `addInfo=${encodeURIComponent(noiDung)}`;
  return (
    <img
      src={url}
      alt="QR chuyển khoản"
      onError={() => setErr(true)}
      style={{ width: 88, height: 88, borderRadius: 8, background: "#fff", border: `1.5px solid ${C.pine}`, flexShrink: 0, objectFit: "contain" }}
    />
  );
}
