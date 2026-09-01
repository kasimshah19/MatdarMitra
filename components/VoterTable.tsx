"use client";

import { Voter } from "../types";
import { AlertTriangle } from "lucide-react";

interface VoterTableProps {
  voters: Voter[];
  totalRecords: number;
  isLoading: boolean;
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
  onToggleAll: (ids: string[], isSelected: boolean) => void;
}

export function VoterTable({ voters, totalRecords, isLoading, selectedIds, onToggleSelection, onToggleAll }: VoterTableProps) {
  const allCurrentSelected = voters.length > 0 && voters.every(v => selectedIds.includes(v.id));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
      <div className="overflow-auto flex-grow">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allCurrentSelected}
                  onChange={(e) => onToggleAll(voters.map(v => v.id), e.target.checked)}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                  disabled={isLoading || voters.length === 0}
                />
              </th>
              <th className="px-4 py-3 font-semibold text-slate-600">Sr No</th>
              <th className="px-4 py-3 font-semibold text-slate-600">EPC No</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Voter Name</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Relative Name</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Relation</th>
              <th className="px-4 py-3 font-semibold text-slate-600">House No</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Age</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Gender</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              // Skeleton Loader
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="animate-pulse bg-white">
                  <td className="px-4 py-3"><div className="w-4 h-4 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-3"><div className="w-6 h-4 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-3"><div className="w-24 h-4 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-3"><div className="w-32 h-4 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-3"><div className="w-24 h-4 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-3"><div className="w-16 h-4 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-3"><div className="w-10 h-4 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-3"><div className="w-8 h-4 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-3"><div className="w-12 h-4 bg-slate-200 rounded"></div></td>
                </tr>
              ))
            ) : voters.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  No voter records found matching your filters.
                </td>
              </tr>
            ) : (
              voters.map((v) => (
                <tr 
                  key={v.id} 
                  className={`hover:bg-cyan-50/50 transition-colors ${selectedIds.includes(v.id) ? 'bg-cyan-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(v.id)}
                      onChange={() => onToggleSelection(v.id)}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.serialNo}</td>
                  <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                       {v.epcNumber}
                       {v.needsReview && (
                         <div title="Flagged for manual review (OCR uncertainty)">
                           <AlertTriangle className="w-4 h-4 text-amber-500" />
                         </div>
                       )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-devanagari text-slate-900">{v.voterName}</td>
                  <td className="px-4 py-3 font-devanagari text-slate-600">{v.relativeName}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                      {v.relation}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.houseNo}</td>
                  <td className="px-4 py-3 text-slate-600">{v.age}</td>
                  <td className="px-4 py-3 text-slate-600">{v.gender}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-50 border-t border-slate-200 p-3 text-xs text-slate-500 flex justify-between items-center">
        <span>Showing {voters.length > 0 ? 1 : 0}–{voters.length} of {totalRecords} records</span>
        {selectedIds.length > 0 && (
          <span className="font-medium text-cyan-700">{selectedIds.length} selected overall</span>
        )}
      </div>
    </div>
  );
}
