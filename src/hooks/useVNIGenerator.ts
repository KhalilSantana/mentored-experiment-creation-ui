/**
 * Hook for generating unique VNIs
 */

import { useCallback, useState } from 'react';

interface VNIGeneratorState {
  usedVNIs: Set<number>;
  nextVNI: number;
}

export const useVNIGenerator = (startFrom: number = 100) => {
  const [state, setState] = useState<VNIGeneratorState>({
    usedVNIs: new Set(),
    nextVNI: startFrom,
  });

  const generateVNI = useCallback((): number => {
    let vni = state.nextVNI;
    while (state.usedVNIs.has(vni)) {
      vni++;
    }

    setState(prev => ({
      usedVNIs: new Set([...prev.usedVNIs, vni]),
      nextVNI: vni + 1,
    }));

    return vni;
  }, [state]);

  const registerVNI = useCallback((vni: number) => {
    setState(prev => ({
      ...prev,
      usedVNIs: new Set([...prev.usedVNIs, vni]),
    }));
  }, []);

  const unregisterVNI = useCallback((vni: number) => {
    setState(prev => {
      const newUsed = new Set(prev.usedVNIs);
      newUsed.delete(vni);
      return {
        ...prev,
        usedVNIs: newUsed,
      };
    });
  }, []);

  const isVNIUsed = useCallback((vni: number): boolean => {
    return state.usedVNIs.has(vni);
  }, [state.usedVNIs]);

  return {
    generateVNI,
    registerVNI,
    unregisterVNI,
    isVNIUsed,
    usedVNIs: state.usedVNIs,
  };
};
