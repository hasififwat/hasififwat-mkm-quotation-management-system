export type PackageReferenceConflict = {
  code: "PACKAGE_REFERENCE_CONFLICT";
  message: string;
};

export function isPackageReferenceConflict(value: unknown): value is PackageReferenceConflict {
  if (!value || typeof value !== "object") return false;
  const conflict = value as Record<string, unknown>;
  return conflict.code === "PACKAGE_REFERENCE_CONFLICT" &&
    typeof conflict.message === "string" && conflict.message.length > 0;
}
