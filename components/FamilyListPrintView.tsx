import { Voter } from "../types";

interface FamilyListPrintViewProps {
  voters: Voter[];
  /** If true, suppress the title/subtitle — used for continuation pages */
  continuationPage?: boolean;
}

/**
 * Hidden, off-screen component rendered at a fixed ~1200px width
 * for html2canvas capture. Uses inline styles to guarantee the
 * captured output matches exactly — Tailwind utilities won't be
 * reliably applied inside a dynamically-injected off-screen root.
 */
export function FamilyListPrintView({ voters, continuationPage = false }: FamilyListPrintViewProps) {
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      style={{
        width: 1200,
        padding: "32px 40px",
        fontFamily: "var(--font-noto-devanagari), 'Noto Sans Devanagari', sans-serif",
        backgroundColor: "#ffffff",
        color: "#1e293b",
      }}
    >
      {/* Title — only on the first page */}
      {!continuationPage && (
        <>
          <h1
            style={{
              textAlign: "center",
              fontSize: 26,
              fontWeight: 700,
              color: "#0e7490",
              margin: "0 0 4px",
              letterSpacing: "0.02em",
            }}
          >
            MatdarMitra — Family Voter List
          </h1>
          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "#64748b",
              margin: "0 0 24px",
            }}
          >
            Generated on {dateStr} &nbsp;•&nbsp; {voters.length} member(s)
          </p>
        </>
      )}

      {/* Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            {["Sr No", "EPC No", "Voter Name", "Relative Name", "House No", "Age", "Gender"].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    backgroundColor: "#0e7490",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: 12,
                    padding: "10px 12px",
                    textAlign: h === "Sr No" || h === "Age" || h === "House No" ? "center" : "left",
                    borderBottom: "2px solid #0e7490",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {voters.map((v, i) => {
            const isAlt = i % 2 === 1;
            const cellStyle = (align: "left" | "center" = "left"): React.CSSProperties => ({
              padding: "9px 12px",
              borderBottom: "1px solid #e2e8f0",
              backgroundColor: isAlt ? "#f0fdfa" : "#ffffff",
              textAlign: align,
              verticalAlign: "middle",
            });

            return (
              <tr key={v.id}>
                <td style={cellStyle("center")}>{v.serialNo}</td>
                <td style={{ ...cellStyle(), fontWeight: 500 }}>{v.epcNumber}</td>
                <td
                  style={{
                    ...cellStyle(),
                    fontFamily: "var(--font-noto-devanagari), 'Noto Sans Devanagari', sans-serif",
                    fontWeight: 500,
                  }}
                >
                  {v.voterName}
                </td>
                <td
                  style={{
                    ...cellStyle(),
                    fontFamily: "var(--font-noto-devanagari), 'Noto Sans Devanagari', sans-serif",
                  }}
                >
                  {v.relativeName}{" "}
                  <span style={{ color: "#94a3b8", fontSize: 11 }}>({v.relation})</span>
                </td>
                <td style={cellStyle("center")}>{v.houseNo}</td>
                <td style={cellStyle("center")}>{v.age}</td>
                <td style={cellStyle("center")}>{v.gender}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer — only on first page (or single-page) */}
      {!continuationPage && (
        <p
          style={{
            textAlign: "center",
            fontSize: 10,
            color: "#94a3b8",
            marginTop: 20,
          }}
        >
          MatdarMitra • अपल्या कुटुंबाची मतदार यादी सोपी करा
        </p>
      )}
    </div>
  );
}
