"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { UploadPanel } from "@/components/UploadPanel";
import { MetadataForm } from "@/components/MetadataForm";
import { SearchFilters } from "@/components/SearchFilters";
import { VoterTable } from "@/components/VoterTable";
import { FamilyListPanel } from "@/components/FamilyListPanel";
import { ExportPanel } from "@/components/ExportPanel";

import { Voter, ConstituencyMetadata, GenderType } from "@/types";
import { Users, X, ChevronUp, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") + "/api";

export default function Home() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [totalVoters, setTotalVoters] = useState(0);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [metadata, setMetadata] = useState<ConstituencyMetadata>({
    assemblyConstituency: "",
    partNumber: "",
    pollingStation: "",
  });

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<GenderType | "All">("All");
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 120]);

  // Debounced filter states for API querying
  const debouncedSearch = useDebounce(searchQuery, 400);
  const debouncedAgeMin = useDebounce(ageRange[0], 400);
  const debouncedAgeMax = useDebounce(ageRange[1], 400);

  // Selection State
  const [selectedVoterIds, setSelectedVoterIds] = useState<string[]>([]);
  const [selectedVotersFull, setSelectedVotersFull] = useState<Voter[]>([]);
  const [isSyncingFamily, setIsSyncingFamily] = useState(false);

  const initialMount = useRef(true);

  // Mobile drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  /** Maps backend DB format to frontend typing format */
  const mapVoterDto = (dbV: any): Voter => ({
    id: dbV._id,
    serialNo: String(dbV.srNo || ""),
    epcNumber: dbV.epcNo,
    voterName: dbV.voterName,
    relativeName: dbV.relativeName,
    relation: dbV.relationType,
    houseNo: dbV.houseNo,
    age: dbV.age,
    gender: (dbV.gender === "Male" || dbV.gender === "Female") ? dbV.gender : "Male",
    needsReview: dbV.needsReview
  });

  // 1. Initial Load: Fetch saved family list across past sessions
  useEffect(() => {
    const fetchFamilyList = async () => {
      try {
        const res = await fetch(`${API_BASE}/family-list`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.voterIds) {
             const preloaded = data.voterIds.map(mapVoterDto);
             setSelectedVotersFull(preloaded);
             setSelectedVoterIds(preloaded.map((v: Voter) => v.id));
             if (preloaded.length > 0) setHasLoadedData(true);
          }
        }
      } catch (err) {
        console.error("Could not fetch family list:", err);
      }
    };
    fetchFamilyList();
  }, []);

  // 2. Continuous Querying: Fetch Voters when filters change
  useEffect(() => {
    // Prevent fetching on mount unless a file was just uploaded or preloaded
    if (!hasLoadedData) return;
    
    const fetchFilteredVoters = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (debouncedSearch) queryParams.set("search", debouncedSearch);
        if (genderFilter !== "All") queryParams.set("gender", genderFilter);
        if (debouncedAgeMin) queryParams.set("ageMin", String(debouncedAgeMin));
        if (debouncedAgeMax) queryParams.set("ageMax", String(debouncedAgeMax));
        // Retrieve comprehensive list ensuring all legitimate scanned document sections are present
        queryParams.set("limit", "5000"); 

        const res = await fetch(`${API_BASE}/voters?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Search API failed");
        
        const data = await res.json();
        setVoters(data.voters.map(mapVoterDto));
        setTotalVoters(data.total || 0);

        // Pre-fill metadata form if not yet done, grabbing from first record implicitly
        if (data.voters.length > 0 && !metadata.assemblyConstituency) {
            const first = data.voters[0];
            setMetadata({
               assemblyConstituency: first.assemblyConstituency || "",
               partNumber: first.partNo || "",
               pollingStation: first.boothName || ""
            });
        }
        
      } catch (err) {
        console.error("Voters API Query Failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredVoters();
  }, [debouncedSearch, genderFilter, debouncedAgeMin, debouncedAgeMax, hasLoadedData, refreshKey]); 
  // removed metadata from deps to avoid infinite loops

  // 3. Selection Synchronization (Debounced posting)
  const debouncedSelectedIds = useDebounce(selectedVoterIds, 600);
  
  useEffect(() => {
    if (initialMount.current) {
        initialMount.current = false;
        return;
    }
    const syncSelections = async () => {
        setIsSyncingFamily(true);
        try {
            const res = await fetch(`${API_BASE}/family-list`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ voterIds: debouncedSelectedIds })
            });

            if (res.ok) {
                const data = await res.json();
                const updatedList = (data.voterIds || []).map(mapVoterDto);
                setSelectedVotersFull(updatedList);
            }
        } catch (err) {
             console.error("Failed to sync selections:", err);
        } finally {
             setIsSyncingFamily(false);
        }
    };

    syncSelections();
  }, [debouncedSelectedIds]);

  const handleToggleSelection = (id: string) => {
    setSelectedVoterIds((prev) =>
      prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id]
    );
  };

  const handleToggleAll = (ids: string[], isSelected: boolean) => {
    setSelectedVoterIds((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        ids.forEach(id => newSet.add(id));
      } else {
        ids.forEach(id => newSet.delete(id));
      }
      return Array.from(newSet);
    });
  };

  const handleRemoveFromFamily = async (id: string) => {
    // Optimistic UI update
    setSelectedVoterIds((prev) => prev.filter((vId) => vId !== id));
    setSelectedVotersFull((prev) => prev.filter((v) => v.id !== id));

    // Force strict targeted DELETE to preserve immediacy safely
    try {
        await fetch(`${API_BASE}/family-list/${id}`, { method: "DELETE" });
    } catch(err) {
        console.error("Removal sync failed:", err);
    }
  };

  const handleUploadSuccess = async () => {
     setHasLoadedData(true); // Triggers main fetching effect first time
     setRefreshKey(prev => prev + 1); // Forces refetch on subsequent uploads
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      <Header />

      <main className="flex-grow p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        {!hasLoadedData && !isUploading ? (
          <div className="max-w-3xl mx-auto mt-10">
            <UploadPanel 
                onUploadSuccess={handleUploadSuccess} 
                isLoading={isUploading} 
                setIsLoading={setIsUploading} 
            />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 pb-24 lg:pb-0">
            
            {/* Left Column: Data & Table */}
            <div className="flex-grow space-y-6 min-w-0">
              <MetadataForm metadata={metadata} setMetadata={setMetadata} />
              
              <div className="space-y-4">
                <SearchFilters
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  genderFilter={genderFilter}
                  setGenderFilter={setGenderFilter}
                  ageRange={ageRange}
                  setAgeRange={setAgeRange}
                />
                
                <div className="relative">
                    {/* Interstitial loading overlay for searches */}
                    {isLoading && hasLoadedData && (
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-20 flex items-center justify-center rounded-xl pointer-events-none">
                            <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
                        </div>
                    )}
                    <VoterTable
                      voters={voters}
                      totalRecords={totalVoters}
                      isLoading={isLoading && !hasLoadedData} // Only skeleton block on initial heavy load
                      selectedIds={selectedVoterIds}
                      onToggleSelection={handleToggleSelection}
                      onToggleAll={handleToggleAll}
                    />
                </div>
              </div>

              {/* Show export panel here on smaller screens since sidebar is hidden */}
              <div className="lg:hidden">
                <ExportPanel selectedVoters={selectedVotersFull} />
              </div>
            </div>

            {/* Right Column: Family List Sidebar (Desktop) */}
            <div className="hidden lg:flex flex-col w-[340px] shrink-0 space-y-6">
              <div className="sticky top-6 h-[calc(100vh-2rem)] flex flex-col space-y-6">
                <div className="flex-grow min-h-0 relative">
                   {isSyncingFamily && (
                       <div className="absolute top-4 right-4 z-10 flex items-center text-xs font-medium text-cyan-700 bg-cyan-50 px-2 py-1 rounded-full border border-cyan-100">
                           <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Syncing...
                       </div>
                   )}
                  <FamilyListPanel
                    selectedVoters={selectedVotersFull}
                    onRemove={handleRemoveFromFamily}
                  />
                </div>
                <div className="shrink-0">
                  <ExportPanel selectedVoters={selectedVotersFull} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Floating Button */}
      {hasLoadedData && (
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className={`lg:hidden fixed bottom-6 right-6 z-40 bg-cyan-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ${isMobileDrawerOpen ? 'scale-0' : 'scale-100'}`}
        >
          <div className="relative">
            <Users className="w-6 h-6" />
            {selectedVoterIds.length > 0 && (
              <span className="absolute -top-2 -right-3 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full border-2 border-cyan-700">
                {selectedVoterIds.length}
              </span>
            )}
          </div>
        </button>
      )}

      {/* Mobile Drawer */}
      <div 
        className={`lg:hidden fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-in-out ${
          isMobileDrawerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-white rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col h-[70vh]">
          <div className="flex justify-between items-center p-4 border-b border-slate-100 shrink-0 bg-cyan-900 text-white rounded-t-2xl relative">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-cyan-200" />
              <h2 className="font-semibold tracking-wide">My Family List</h2>
              <span className="bg-cyan-800 px-2 py-0.5 rounded-full text-xs font-medium border border-cyan-700 ml-2">
                {selectedVoterIds.length}
              </span>
              {isSyncingFamily && <Loader2 className="w-4 h-4 ml-2 animate-spin text-cyan-300" />}
            </div>
            <button 
              onClick={() => setIsMobileDrawerOpen(false)}
              className="p-1 hover:bg-cyan-800 rounded-lg transition-colors"
            >
              <ChevronUp className="w-6 h-6 rotate-180" />
            </button>
          </div>
          
          <div className="flex-grow overflow-auto p-4 bg-slate-50">
            {selectedVotersFull.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Users className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">No members added yet.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {selectedVotersFull.map(v => (
                  <li key={v.id} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-medium font-devanagari text-slate-800 truncate">
                        {v.voterName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {v.epcNumber} • {v.relation}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveFromFamily(v.id || "")}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}
    </div>
  );
}
