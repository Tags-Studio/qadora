// Lazy loader for the dieline catalog (~1MB JSON).
// Keeps the catalog out of the main bundle: it is fetched as a separate
// chunk the first time a template page is opened, then cached in-memory.
let catalogPromise = null;

export function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = import('./pacdora_dielines.json').then((m) => m.default);
  }
  return catalogPromise;
}
