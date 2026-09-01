import {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    TextRun,
    WidthType,
    AlignmentType,
    BorderStyle,
    HeadingLevel,
} from "docx";
import { Voter } from "../../types";

const HEADERS = ["Sr No", "EPC No", "Voter Name", "Relative Name", "House No", "Age", "Gender"];

function createHeaderRow(): TableRow {
    return new TableRow({
        tableHeader: true,
        children: HEADERS.map(
            (h) =>
                new TableCell({
                    shading: { fill: "0E7490" }, // cyan-700
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20, font: "Calibri" })],
                        }),
                    ],
                })
        ),
    });
}

function createDataRow(v: Voter): TableRow {
    const relativeWithRelation = `${v.relativeName} (${v.relation})`;
    const cells = [v.serialNo, v.epcNumber, v.voterName, relativeWithRelation, v.houseNo, String(v.age), v.gender];

    return new TableRow({
        children: cells.map(
            (text, i) =>
                new TableCell({
                    children: [
                        new Paragraph({
                            alignment: i === 0 || i === 5 ? AlignmentType.CENTER : AlignmentType.LEFT,
                            children: [new TextRun({ text, size: 19, font: "Calibri" })],
                        }),
                    ],
                })
        ),
    });
}

export async function exportAsWord(voters: Voter[]): Promise<void> {
    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: { top: 720, right: 720, bottom: 720, left: 720 },
                    },
                },
                children: [
                    new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                        children: [
                            new TextRun({
                                text: "MatdarMitra — Family Voter List",
                                bold: true,
                                size: 32,
                                font: "Calibri",
                                color: "0E7490",
                            }),
                        ],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                        children: [
                            new TextRun({
                                text: `Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}  •  ${voters.length} member(s)`,
                                size: 18,
                                color: "666666",
                                font: "Calibri",
                            }),
                        ],
                    }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: {
                            top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                            bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                            left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                            right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
                        },
                        rows: [createHeaderRow(), ...voters.map(createDataRow)],
                    }),
                ],
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    triggerDownload(blob, "MatdarMitra_FamilyList.docx");
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
