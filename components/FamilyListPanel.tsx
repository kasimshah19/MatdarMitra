"use client";

import { X, Users } from "lucide-react";
import { Voter } from "../types";

interface FamilyListPanelProps {
  selectedVoters: Voter[];
  onRemove: (id: string) => void;
}

export function FamilyListPanel({ selectedVoters, onRemove }: FamilyListPanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="bg-cyan-900 text-white p-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-cyan-200" />
          <h2 className="font-semibold tracking-wide">My Family List</h2>
        </div>
        <div className="bg-cyan-800 px-2 py-0.5 rounded-full text-xs font-medium border border-cyan-700">
          {selectedVoters.length} added
        </div>
      </div>
      
      <div className="flex-grow overflow-auto p-2">
        {selectedVoters.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Users className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">No members added yet.</p>
            <p className="text-xs mt-1">Select rows from the table to build your family list.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {selectedVoters.map(v => (
              <li key={v.id} className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 p-3 rounded-lg border border-slate-100 transition-colors group">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-medium font-devanagari text-slate-800 truncate" title={v.voterName}>
                    {v.voterName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {v.epcNumber} • {v.relation}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(v.id)}
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
