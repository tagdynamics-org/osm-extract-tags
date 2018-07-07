/** Test if two string arrays are equal */
const arraysEqual = (arr1: string[], arr2: string[]) => {
  if (arr1.length === 0 && arr2.length === 0) {
    return true;
  } else if (arr1.length !== arr2.length) {
    return false;
  }
  // Both arrays are non-empty and have equal number of entries.
  return arr1.every((t, idx) => t === arr2[idx]);
};

/**
 * From an array [x1, x2, x3, ..] remove entries where p(xi) is repeating (while keeping
 * the first occurence).
 *
 * For example, the output with the below input would be [1, 2, 3, 4, 3].
 *    arr:      [1, 2, 3, 4, 3, 3, 3]
 *    p:        x => x
 *    compare:  (x, y) => x === y
 *
 */
function removeRepeated<A>(arr: A[], areEqual: ((x: A, y: A) => boolean)): A[] {
  return arr.filter((a, idx) => (idx === 0) || !areEqual(arr[idx - 1], a));
}

export { arraysEqual, removeRepeated };
