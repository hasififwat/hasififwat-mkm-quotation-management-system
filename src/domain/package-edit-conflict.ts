export const PACKAGE_EDIT_CONFLICT_MESSAGE = "This package changed after you opened it, or its edit baseline is missing. Your changes were not saved. Download your complete draft before leaving. Open the latest package in another tab and manually re-enter the changes you still need.";

export type PackageEditConflict = {
  code: "PACKAGE_EDIT_CONFLICT";
  message: string;
};

export function isPackageEditConflict(value: unknown): value is PackageEditConflict {
  if (!value || typeof value !== "object") return false;
  const conflict = value as Record<string, unknown>;
  return conflict.code === "PACKAGE_EDIT_CONFLICT" && typeof conflict.message === "string" && conflict.message.length > 0;
}
