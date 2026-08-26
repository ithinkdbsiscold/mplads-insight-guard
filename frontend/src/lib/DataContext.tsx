import { createContext, useContext, useState, ReactNode } from "react";

export type House = "Lok Sabha" | "Rajya Sabha";
export type Term = "18" | "17" | null;

interface DataContextType {
  selectedHouse: House;
  setSelectedHouse: (house: House) => void;
  selectedTerm: Term;
  setSelectedTerm: (term: Term) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [selectedHouse, setSelectedHouse] = useState<House>("Lok Sabha");
  const [selectedTerm, setSelectedTerm] = useState<Term>("18");

  // When house changes to Rajya Sabha, term should ideally be null or ignored by backend,
  // but we keep it around so switching back remembers, or we explicitly nullify it.
  // The instructions say "Hide the Lok Sabha term selector. Do not send an ls_term parameter".
  
  return (
    <DataContext.Provider
      value={{
        selectedHouse,
        setSelectedHouse,
        selectedTerm,
        setSelectedTerm,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
