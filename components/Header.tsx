import { Users } from "lucide-react";

export function Header() {
  return (
    <header className="bg-cyan-900 text-white shadow-md py-4 px-6 shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">MatdarMitra</h1>
            <p className="text-cyan-100 text-sm font-devanagari mt-0.5">
              अपल्या कुटुंबाची मतदार यादी सोपी करा
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
