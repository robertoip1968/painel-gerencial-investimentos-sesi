import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Dataset } from "@/lib/csv-import";
import { realDataset } from "@/lib/real-data";

type Ctx = {
  dataset: Dataset;
  isUpload: boolean;
  setDataset: (d: Dataset | null) => void;
};

const DatasetContext = createContext<Ctx>({
  dataset: realDataset,
  isUpload: false,
  setDataset: () => {},
});

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [upload, setUpload] = useState<Dataset | null>(null);
  const value = useMemo(
    () => ({ dataset: upload ?? realDataset, isUpload: upload !== null, setDataset: setUpload }),
    [upload],
  );
  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export const useDataset = () => useContext(DatasetContext);
