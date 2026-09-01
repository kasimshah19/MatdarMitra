import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { FamilyListPrintView } from "../../components/FamilyListPrintView";
import { Voter } from "../../types";

/**
 * Rows-per-page estimates.
 * Page 1 has a title + subtitle so fewer rows fit.
 * Continuation pages only have the table header, so more rows fit.
 */
const ROWS_FIRST_PAGE = 18;
const ROWS_PER_PAGE = 22;

/**
 * Renders FamilyListPrintView off-screen and captures it with
 * html2canvas. For large lists, splits voters into page-sized
 * chunks so rows are never cut in half.
 */
export async function exportAsPdf(voters: Voter[]): Promise<void> {
    // Split voters into page-sized chunks
    const pages: { voters: Voter[]; isContinuation: boolean }[] = [];

    if (voters.length <= ROWS_FIRST_PAGE) {
        // Everything fits on one page
        pages.push({ voters, isContinuation: false });
    } else {
        // Page 1: first N rows with title
        pages.push({ voters: voters.slice(0, ROWS_FIRST_PAGE), isContinuation: false });

        // Remaining pages
        let offset = ROWS_FIRST_PAGE;
        while (offset < voters.length) {
            const chunk = voters.slice(offset, offset + ROWS_PER_PAGE);
            pages.push({ voters: chunk, isContinuation: true });
            offset += ROWS_PER_PAGE;
        }
    }

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();   // 297
    const pageH = pdf.internal.pageSize.getHeight();  // 210
    const margin = 10;
    const usableW = pageW - margin * 2;

    for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();

        const canvas = await renderPageToCanvas(
            pages[i].voters,
            pages[i].isContinuation
        );

        const imgW = usableW;
        const imgH = (canvas.height / canvas.width) * imgW;
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, imgW, imgH);

        // Page number footer
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
            `Page ${i + 1} of ${pages.length}`,
            pageW / 2,
            pageH - 5,
            { align: "center" }
        );
    }

    pdf.save("MatdarMitra_FamilyList.pdf");
}

/**
 * Renders a single page's worth of voters into a hidden div,
 * captures it with html2canvas, cleans up, and returns the canvas.
 */
async function renderPageToCanvas(
    voters: Voter[],
    continuationPage: boolean
): Promise<HTMLCanvasElement> {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.zIndex = "-1";
    container.style.pointerEvents = "none";
    document.body.appendChild(container);

    const root = createRoot(container);
    await new Promise<void>((resolve) => {
        root.render(
            createElement(FamilyListPrintView, { voters, continuationPage })
        );
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    // Wait for font rendering
    await new Promise((r) => setTimeout(r, 200));

    const printEl = container.firstElementChild as HTMLElement;
    if (!printEl) {
        cleanup(root, container);
        throw new Error("Print view failed to render");
    }

    try {
        const canvas = await html2canvas(printEl, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
        });
        return canvas;
    } finally {
        cleanup(root, container);
    }
}

function cleanup(root: { unmount: () => void }, container: HTMLElement) {
    try {
        root.unmount();
    } catch {
        // ignore
    }
    container.remove();
}
