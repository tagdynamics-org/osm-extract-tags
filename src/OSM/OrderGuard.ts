interface LoopState {
  type: "node" | "way" | "relation";
  id: number;
  version: number;
}

/** Can state `t2` proceed state `t1`? */
function _canProceed(t1: LoopState, t2: LoopState): boolean {
  if (t1.type === t2.type) {
    return (
      (t1.id === t2.id && t1.version < t2.version) ||
      t1.id < t2.id
    );
  }
  return (
    (t1.type === "node" && t2.type === "way") ||
    (t1.type === "way" && t2.type === "relation")
  );
}

/** canProceed(null, x) called to check validity of first entry `x` */
function canProceed(t1: LoopState | null, t2: LoopState): boolean {
  if (t1 === null) {
    return t2.type === "node"; // first state should be a node
  }
  return _canProceed(t1, t2);
}

/**
 * Returns a function that does nothing as longs as `LoopState`:s come
 * in order, but throws an exception if elements appear out of order.
 *
 * TODO: Could this be rewritten using Highland's `scan` method?
 *   http://highlandjs.org/#scan
 */
function guardMap(): ((_: LoopState) => void) {
  let lastState: null | LoopState = null;

  return (e: LoopState) => {
    if (canProceed(lastState, e)) {
      lastState = e;
    } else {
      throw new Error(`Elements out of order: ${JSON.stringify(lastState)} -> ${JSON.stringify(e)}`);
    }
  };
}

export { LoopState, canProceed, guardMap };
