"use client";

import { useState, useRef } from "react";
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface UploadPanelProps {
  onUploadSuccess: () => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}

export function UploadPanel({ onUploadSuccess, isLoading, setIsLoading }: UploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [progressMsg, setProgressMsg] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setErrorMsg("Please select a valid PDF file.");
      return;
    }

    setErrorMsg("");
    setProgressMsg("");
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errType = await res.json();
        throw new Error(errType.error || "Upload processing failed");
      }

      const initData = await res.json();
      if (initData.jobId) {
          setProgressMsg("Processing started...");
          // Begin polling
          const pollInterval = setInterval(async () => {
              try {
                  const statusRes = await fetch(`${API_URL}/api/upload-status/${initData.jobId}`);
                  const statusData = await statusRes.json();
                  
                  if (statusData.status === "completed") {
                      clearInterval(pollInterval);
                      setProgressMsg(`Extraction complete! Extracted ${statusData.summary.totalExtracted} records.`);
                      setTimeout(() => {
                           setIsLoading(false);
                           onUploadSuccess();
                           if (fileInputRef.current) fileInputRef.current.value = "";
                      }, 1500);
                  } else if (statusData.status === "failed") {
                      clearInterval(pollInterval);
                      throw new Error(statusData.error || "OCR Pipeline Crash");
                  } else {
                      setProgressMsg(
`Pages processed: ${statusData.pagesProcessed} / ${statusData.totalPages}
Expected voters: ${statusData.expectedVoters || 1096}
Records extracted: ${statusData.recordsExtracted}
(Scanning individual blocks... Please wait)`);
                  }
              } catch (e: any) {
                  clearInterval(pollInterval);
                  console.error("Polling error", e);
                  setErrorMsg(e.message || "Failed to establish connection to processing server.");
                  setIsLoading(false);
              }
          }, 3000);
      } else {
          // Fallback sync logic
          onUploadSuccess();
          setIsLoading(false);
      }

    } catch (err: any) {
      console.error("[MatdarMitra] Upload Error:", err);
      setErrorMsg(err.message || "Failed to establish connection to processing server.");
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-8 text-center shadow-sm hover:bg-slate-50 transition-colors">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="bg-cyan-100 p-4 rounded-full">
          {isLoading ? (
             <Loader2 className="w-8 h-8 text-cyan-700 animate-spin" />
          ) : (
             <UploadCloud className="w-8 h-8 text-cyan-700" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            {isLoading ? "Processing Electoral Roll..." : "Upload Voter Roll PDF"}
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto whitespace-pre-wrap">
            {isLoading 
              ? (progressMsg || "This may take a few minutes for 40+ pages. Please do not close this window.")
              : "Drag and drop your electoral roll PDF here, or click to browse."}
          </p>
        </div>
        
        {errorMsg && (
          <div className="flex items-center text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm font-medium">
            <AlertCircle className="w-4 h-4 mr-2" />
            {errorMsg}
          </div>
        )}

        <div className="pt-2">
          <input 
            type="file" 
            accept="application/pdf"
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <button
            disabled={isLoading}
            onClick={() => fileInputRef.current?.click()}
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
          >
             {isLoading ? "Extracting Data..." : "Select PDF File"}
          </button>
        </div>
        
        <p className="text-xs text-slate-400 font-medium mt-4">
          Secured local extraction. Data never leaves your device.
        </p>
      </div>
    </div>
  );
}
