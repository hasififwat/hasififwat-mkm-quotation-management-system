export function packageSyncKey(name: string, season: string): string {
  return JSON.stringify([name.trim().toUpperCase(), season.trim().toUpperCase()]);
}

export type ReviewedPackageApplyIntent = {
  db_id: string;
  expected_edit_token: string;
};

export const PACKAGE_SYNC_CONFLICT_MESSAGE = "This package changed after review, is now unsynced, or already exists. No changes from this package request were saved. Review the retained files again before applying.";
