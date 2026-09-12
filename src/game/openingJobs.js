
// Root-split helper: the 15 opening moves can be solved independently.
// Intended for Node worker_threads or browser Workers after rules.js is shared.

import { makeInitialState, generateAllLegalActions, applyLegalAction, actionLabel } from "./rules.js";

export function openingJobs() {
  const root = makeInitialState();
  return generateAllLegalActions(root).map((action, index) => ({
    index,
    label: actionLabel(root, action),
    action,
    state: applyLegalAction(root, action),
  }));
}
