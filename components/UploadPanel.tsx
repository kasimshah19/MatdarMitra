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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setErrorMsg("Please select a valid PDF file.");
      return;
    }

    setErrorMsg("");
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Typically takes 30-90s depending on PDF size
      const res = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errType = await res.json();
        throw new Error(errType.error || "Upload processing failed");
      }

      const data = await res.json();
      console.log("Upload Success:", data);
      
      onUploadSuccess();
    } catch (err: any) {
      console.error("[MatdarMitra] Upload Error:", err);
      setErrorMsg(err.message || "Failed to establish connection to processing server.");
    } finally {
      setIsLoading(false);
      // reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
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
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {isLoading 
              ? "This may take 1-2 minutes for large PDFs. Please do not close this window."
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
