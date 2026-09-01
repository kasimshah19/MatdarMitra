"use client";

import { Search } from "lucide-react";
import { GenderType } from "../types";

interface SearchFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  genderFilter: GenderType | "All";
  setGenderFilter: (val: GenderType | "All") => void;
  ageRange: [number, number];
  setAgeRange: (val: [number, number]) => void;
}

export function SearchFilters({
  searchQuery,
  setSearchQuery,
  genderFilter,
  setGenderFilter,
  ageRange,
  setAgeRange
}: SearchFiltersProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center gap-4">
      {/* Search Bar */}
      <div className="relative flex-grow">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Name, EPC, House No..."
          className="font-devanagari w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 shrink-0">
        {/* Gender Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-slate-600">Gender:</label>
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as any)}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="All">All</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        {/* Age Filters */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-slate-600">Age:</label>
          <div className="flex items-center space-x-1">
            <input
              type="number"
              min="18"
              max="120"
              value={ageRange[0]}
              onChange={(e) => setAgeRange([Number(e.target.value) || 18, ageRange[1]])}
              className="w-16 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 text-center"
            />
            <span className="text-slate-400">-</span>
            <input
              type="number"
              min="18"
              max="120"
              value={ageRange[1]}
              onChange={(e) => setAgeRange([ageRange[0], Number(e.target.value) || 120])}
              className="w-16 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 text-center"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
