import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { fmtMonth, fmtRp } from "@/lib/format";
import type { SlipData } from "@/lib/slip";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#1b2233" },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  sub: { marginTop: 4, color: "#5a6478" },
  meta: { marginTop: 22, flexDirection: "row", justifyContent: "space-between" },
  label: { color: "#5a6478", fontSize: 9, marginBottom: 2 },
  value: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  section: { marginTop: 24, fontFamily: "Helvetica-Bold", fontSize: 10, letterSpacing: 1, color: "#5a6478" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: "#dfe3ea" },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: "#dfe3ea" },
  bold: { fontFamily: "Helvetica-Bold" },
  totalBox: { marginTop: 26, padding: 14, backgroundColor: "#eef3ff", flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 6 },
  totalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  totalValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1d4fd7" },
  foot: { marginTop: 28, color: "#5a6478", fontSize: 9 },
});

const Line = ({ name, amount, minus }: { name: string; amount: number; minus?: boolean }) => (
  <View style={s.row}>
    <Text>{name}</Text>
    <Text>
      {minus ? "-" : ""}
      {fmtRp(amount)}
    </Text>
  </View>
);

function SlipPdf({ d }: { d: SlipData }) {
  const earn = d.earnings.reduce((a, i) => a + i.amount, 0);
  const ded = d.deductions.reduce((a, i) => a + i.amount, 0);
  return (
    <Document title={`Slip Gaji ${d.employeeName} ${fmtMonth(d.month)}`}>
      <Page size="A5" style={s.page}>
        <Text style={s.title}>Slip Gaji</Text>
        <Text style={s.sub}>{d.outletName}</Text>

        <View style={s.meta}>
          <View>
            <Text style={s.label}>Nama karyawan</Text>
            <Text style={s.value}>{d.employeeName}</Text>
          </View>
          <View>
            <Text style={s.label}>Periode</Text>
            <Text style={s.value}>{fmtMonth(d.month)}</Text>
          </View>
        </View>

        <Text style={s.section}>PENERIMAAN</Text>
        {d.earnings.map((i, n) => (
          <Line key={n} name={i.name} amount={i.amount} />
        ))}
        <View style={s.sumRow}>
          <Text style={s.bold}>Total penerimaan</Text>
          <Text style={s.bold}>{fmtRp(earn)}</Text>
        </View>

        {d.deductions.length > 0 && (
          <>
            <Text style={s.section}>PENGELUARAN</Text>
            {d.deductions.map((i, n) => (
              <Line key={n} name={i.name} amount={i.amount} minus />
            ))}
            <View style={s.sumRow}>
              <Text style={s.bold}>Total pengeluaran</Text>
              <Text style={s.bold}>-{fmtRp(ded)}</Text>
            </View>
          </>
        )}

        <View style={s.totalBox}>
          <Text style={s.totalLabel}>TOTAL DITERIMA KARYAWAN</Text>
          <Text style={s.totalValue}>{fmtRp(d.net)}</Text>
        </View>

        {d.finalizedAt && (
          <Text style={s.foot}>
            Dikunci pada {new Date(d.finalizedAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" })}
          </Text>
        )}
      </Page>
    </Document>
  );
}

export const renderSlipPdf = (d: SlipData) => renderToBuffer(<SlipPdf d={d} />);
