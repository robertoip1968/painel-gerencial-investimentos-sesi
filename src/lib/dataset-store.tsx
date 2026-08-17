import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Dataset } from "@/lib/csv-import";

type Ctx = {
  dataset: Dataset | null;
  setDataset: (d: Dataset | null) => void;
};

const DatasetContext = createContext<Ctx>({ dataset: null, setDataset: () => {} });

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const value = useMemo(() => ({ dataset, setDataset }), [dataset]);
  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export const useDataset = () => useContext(DatasetContext);
