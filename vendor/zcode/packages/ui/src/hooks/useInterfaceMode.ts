import { useHawkNextStoreWithDefault } from "@/store/StoreProvider.js";

export function useIsOfficeMode(): boolean {
  return useHawkNextStoreWithDefault((state) => state.interfaceMode === "office", false);
}
