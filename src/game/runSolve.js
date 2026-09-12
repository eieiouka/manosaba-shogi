
import { createSolver } from "./solver.js";
import {
  makeInitialState,
  generateAllLegalActions,
  applyLegalAction,
  terminalResult,
  actionLabel,
} from "./rules.js";

export function solveInitialPosition({maxNodes=Infinity,onProgress=null}={}) {
  const root=makeInitialState();
  const solver=createSolver({
    generateAllLegalActions,
    applyLegalAction,
    terminalResult,
    maxNodes,
    onProgress,
  });
  const result=solver.solve(root);

  const labels=[];
  let s=root;
  for (const a of result.pv || []) {
    labels.push(actionLabel(s,a));
    s=applyLegalAction(s,a);
  }

  return {...result,pvLabels:labels};
}
