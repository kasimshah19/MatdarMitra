import * as XLSX from "xlsx";
import { Voter } from "../../types";

const HEADERS = ["Sr No", "EPC No", "Voter Name", "Relative Name", "House No", "Age", "Gender"];

export async function exportAsExcel(voters: Voter[]): Promise<void> {
    const rows = voters.map((v) => [
        v.serialNo,
        v.epcNumber,
        v.voterName,
        `${v.relativeName} (${v.relation})`,
        v.houseNo,
        v.age,
        v.gender,
    ]);

    const wsData = [HEADERS, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-size columns based on content width
    ws["!cols"] = HEADERS.map((h, i) => {
        const maxLen = Math.max(
            h.length,
            ...rows.map((r) => String(r[i]).length)
        );
        return { wch: maxLen + 4 };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Family List");

    // Generate binary and trigger download
    const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbOut], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    triggerDownload(blob, "MatdarMitra_FamilyList.xlsx");
}

function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
