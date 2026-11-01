import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { durationMs, formatDuration } from "@/lib/domain";

Font.registerHyphenationCallback((word) => [word]);

export type LogKunciPdfRow = {
  id: number;
  key_code: string;
  key_jenis: string;
  borrower_name: string;
  borrower_divisi: string;
  take_out_at: string;
  give_back_at: string | null;
  taken_by: string | null;
  returned_by: string | null;
};

const COLS = [
  { key: "no", label: "NO.", flex: 5 },
  { key: "key", label: "KUNCI", flex: 7 },
  { key: "jenis", label: "JENIS", flex: 12 },
  { key: "peminjam", label: "PEMINJAM", flex: 14 },
  { key: "pinjam", label: "PINJAM", flex: 11 },
  { key: "kembali", label: "KEMBALI", flex: 11 },
  { key: "durasi", label: "DURASI", flex: 12 },
  { key: "ptgPinjam", label: "PTG PINJAM", flex: 14 },
  { key: "ptgKembali", label: "PTG KEMBALI", flex: 14 },
] as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 24,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#0f172a",
  },
  header: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
  },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 2,
  },
  meta: {
    fontSize: 8,
    color: "#334155",
    marginBottom: 4,
  },
  colHead: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderBottomWidth: 0.6,
    borderBottomColor: "#94a3b8",
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  colHeadText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 2.5,
    paddingHorizontal: 2,
  },
  cell: {
    fontSize: 8,
    paddingRight: 2,
  },
  footer: {
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
    fontSize: 8,
    color: "#334155",
    textAlign: "right",
  },
});

function fmtWhen(raw: string | null): string {
  if (!raw) return "-";
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return raw;
  return `${m[3]}/${m[2]} ${m[4]}:${m[5]}`;
}

function cell(flex: number, value: string, bold = false) {
  return (
    <Text
      style={[
        styles.cell,
        { flex, fontFamily: bold ? "Helvetica-Bold" : "Helvetica" },
      ]}
    >
      {value}
    </Text>
  );
}

export function LogKunciPdfDocument({
  from,
  to,
  rows,
  nowMs,
}: {
  from: string;
  to: string;
  rows: LogKunciPdfRow[];
  nowMs: number;
}) {
  return (
    <Document
      title={`Log kunci ${from} s/d ${to}`}
      author="IST Security"
      subject="Log kunci"
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Text style={styles.title}>IST Security — Log kunci</Text>
          <Text style={styles.meta}>
            {from} s/d {to} · {rows.length} baris
          </Text>
          <View style={styles.colHead}>
            {COLS.map((col) => (
              <Text key={col.key} style={[styles.colHeadText, { flex: col.flex }]}>
                {col.label}
              </Text>
            ))}
          </View>
        </View>
        {rows.map((r, i) => {
          const peminjam = r.borrower_divisi
            ? `${r.borrower_name} · ${r.borrower_divisi}`
            : r.borrower_name;
          return (
            <View key={r.id} style={styles.row} wrap={false}>
              {cell(5, String(i + 1))}
              {cell(7, r.key_code, true)}
              {cell(12, r.key_jenis)}
              {cell(14, peminjam)}
              {cell(11, fmtWhen(r.take_out_at))}
              {cell(11, fmtWhen(r.give_back_at))}
              {cell(12, formatDuration(durationMs(r.take_out_at, r.give_back_at, nowMs)))}
              {cell(14, r.taken_by ?? "-")}
              {cell(14, r.returned_by ?? "-")}
            </View>
          );
        })}
        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
