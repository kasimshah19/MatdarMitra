"use client";

import { useState, useCallback } from "react";
import { FileText, FileSpreadsheet, Download, Copy, Check, Loader2 } from "lucide-react";
import { Voter } from "../types";

interface ExportPanelProps {
  selectedVoters: Voter[];
}

type ExportFormat = "word" | "excel" | "pdf" | "copy";

export function ExportPanel({ selectedVoters }: ExportPanelProps) {
  const [loadingFormat, setLoadingFormat] = useState<ExportFormat | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const runExport = useCallback(
    async (format: ExportFormat, exportFn: () => Promise<void>, successMsg: string) => {
      if (selectedVoters.length === 0 || loadingFormat) return;
      setLoadingFormat(format);
      try {
        await exportFn();
        showToast(successMsg);
      } catch (err) {
        console.error(`[MatdarMitra] ${format} export failed:`, err);
        showToast(`Export failed. Check console.`);
      } finally {
        setLoadingFormat(null);
      }
    },
    [selectedVoters, loadingFormat, showToast]
  );

  const handleWord = () =>
    runExport("word", async () => {
      const { exportAsWord } = await import("@/utils/export/exportWord");
      await exportAsWord(selectedVoters);
    }, "✓ Word file downloaded!");

  const handleExcel = () =>
    runExport("excel", async () => {
      const { exportAsExcel } = await import("@/utils/export/exportExcel");
      await exportAsExcel(selectedVoters);
    }, "✓ Excel file downloaded!");

  const handlePdf = () =>
    runExport("pdf", async () => {
      const { exportAsPdf } = await import("@/utils/export/exportPdf");
      await exportAsPdf(selectedVoters);
    }, "✓ PDF file downloaded!");

  const handleCopy = () =>
    runExport("copy", async () => {
      const headers = ["Sr No", "EPC No", "Voter Name", "Relative Name", "House No", "Age", "Gender"];
      const rows = selectedVoters.map((v) =>
        [v.serialNo, v.epcNumber, v.voterName, `${v.relativeName} (${v.relation})`, v.houseNo, v.age, v.gender].join("\t")
      );
      const tsv = [headers.join("\t"), ...rows].join("\n");
      await navigator.clipboard.writeText(tsv);
    }, "✓ Copied to clipboard!");

  const isDisabled = selectedVoters.length === 0;
  const disabledTooltip = isDisabled ? "Select at least one member" : undefined;

  const buttons: { format: ExportFormat; label: string; icon: React.ReactNode; onClick: () => void }[] = [
    {
      format: "word",
      label: "Word",
      icon: <FileText className="w-6 h-6 text-blue-600 mb-2" />,
      onClick: handleWord,
    },
    {
      format: "excel",
      label: "Excel",
      icon: <FileSpreadsheet className="w-6 h-6 text-green-600 mb-2" />,
      onClick: handleExcel,
    },
    {
      format: "pdf",
      label: "PDF",
      icon: <FileText className="w-6 h-6 text-red-500 mb-2" />,
      onClick: handlePdf,
    },
    {
      format: "copy",
      label: "Copy Table",
      icon: <Copy className="w-6 h-6 text-slate-600 mb-2" />,
      onClick: handleCopy,
    },
  ];

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative">
      <h3 className="text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider flex items-center">
        <Download className="w-4 h-4 mr-2" />
        Export Family List
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {buttons.map(({ format, label, icon, onClick }) => {
          const isLoading = loadingFormat === format;
          const isCopySuccess = format === "copy" && toastMessage?.includes("Copied");
          return (
            <button
              key={format}
              disabled={isDisabled || !!loadingFormat}
              onClick={onClick}
              title={disabledTooltip}
              className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors relative min-h-[72px]"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 text-cyan-600 mb-2 animate-spin" />
              ) : isCopySuccess ? (
                <Check className="w-6 h-6 text-green-600 mb-2" />
              ) : (
                icon
              )}
              <span className={`text-xs font-medium ${isCopySuccess ? "text-green-700" : "text-slate-700"}`}>
                {isLoading ? "Generating…" : isCopySuccess ? "Copied!" : label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Success Toast */}
      {toastMessage && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-lg whitespace-nowrap animate-fade-in z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
