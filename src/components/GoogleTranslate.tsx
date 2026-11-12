'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    retranslate?: () => void;
    __domGuard?: boolean;
  }
}

// Browser page translation (Safari / Chrome "Translate to Arabic") and some
// extensions swap React's text nodes for their own <font> wrappers. When React
// later removes or re-inserts those nodes it throws NotFoundError
// ("The object can not be found here." in Safari) and the page crashes.
// Make removeChild / insertBefore tolerant of nodes that were moved out from
// under React. Runs at module load, before hydration commits.
// See https://github.com/facebook/react/issues/11538
if (typeof window !== 'undefined' && typeof Node === 'function' && !window.__domGuard) {
  window.__domGuard = true;
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

export default function GoogleTranslate() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.retranslate = () => {};
    }
  }, []);

  return null;
}
