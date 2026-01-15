import type { PackageDetails } from "../quotation/types";
import { MOCK_PACKAGES } from "../quotation/constants";

const STORAGE_KEY = "mkm_packages";

// Initialize with mock data if empty
const getInitialPackages = (): PackageDetails[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);

  const initial = MOCK_PACKAGES.map((p) => ({
    ...p,
    status: "published" as const,
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
};

export const packageStore = {
  getAll: (): PackageDetails[] => {
    return getInitialPackages();
  },

  save: (pkg: PackageDetails) => {
    const packages = getInitialPackages();
    const index = packages.findIndex((p) => p.id === pkg.id);
    if (index >= 0) {
      packages[index] = pkg;
    } else {
      packages.push(pkg);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packages));
  },

  delete: (id: string) => {
    const packages = getInitialPackages().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packages));
  },

  toggleStatus: (id: string) => {
    const packages = getInitialPackages();
    const index = packages.findIndex((p) => p.id === id);
    if (index >= 0) {
      packages[index].status =
        packages[index].status === "published" ? "unpublished" : "published";
      localStorage.setItem(STORAGE_KEY, JSON.stringify(packages));
    }
  },
};
