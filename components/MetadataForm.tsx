"use client";

import { ConstituencyMetadata } from "../types";

interface MetadataFormProps {
  metadata: ConstituencyMetadata;
  setMetadata: (data: ConstituencyMetadata) => void;
}

export function MetadataForm({ metadata, setMetadata }: MetadataFormProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMetadata({
      ...metadata,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
      <h3 className="text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider">Constituency Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Assembly Constituency</label>
          <input 
            type="text" 
            name="assemblyConstituency"
            value={metadata.assemblyConstituency}
            onChange={handleChange}
            placeholder="e.g. 152 - Karad"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Part Number</label>
          <input 
            type="text" 
            name="partNumber"
            value={metadata.partNumber}
            onChange={handleChange}
            placeholder="e.g. Part 42"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Polling Station</label>
          <input 
            type="text" 
            name="pollingStation"
            value={metadata.pollingStation}
            onChange={handleChange}
            placeholder="e.g. Z.P. School, Room 1"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          />
        </div>
      </div>
    </div>
  );
}
