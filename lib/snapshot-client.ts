import { BASE_PATH } from "./base-path.ts";
import { cleanSnapshot, sgDate, type SnapshotDoc } from "./edge/snapshot.ts";

let loaded: Promise<SnapshotDoc | null> | null = null;

/** The Worker's latest daily check, fetched once per page load. Null when there is none, and the page keeps its built-in date and list. */
export function loadSnapshot(fetchImpl: typeof fetch = fetch): Promise<SnapshotDoc | null> {
  loaded ??= fetchImpl(`${BASE_PATH}/api/snapshot`)
    .then((response) => (response.ok ? response.json() : null))
    .then((json) => cleanSnapshot(json))
    .catch(() => null);
  return loaded;
}

export const checkedLabel = (doc: SnapshotDoc | null, fallback: string) => (doc ? sgDate(doc.checked) : fallback);
