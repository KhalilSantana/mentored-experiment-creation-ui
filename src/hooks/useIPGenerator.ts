/**
 * Hook for generating unique IPs within subnets
 */

import { useCallback, useState } from 'react';
import { generateIPInSubnet, validateSubnet } from '../utils/validators';

interface SubnetUsage {
  [subnet: string]: Set<string>; // subnet -> set of used IPs
}

interface IPGeneratorState {
  subnetUsage: SubnetUsage;
  ipCounters: Record<string, number>; // subnet -> next index
}

export const useIPGenerator = () => {
  const [state, setState] = useState<IPGeneratorState>({
    subnetUsage: {},
    ipCounters: {},
  });

  const generateIP = useCallback(
    (subnet: string): string | null => {
      if (!validateSubnet(subnet)) {
        console.error(`Invalid subnet: ${subnet}`);
        return null;
      }

      setState(prev => {
        const subnetUsage = { ...prev.subnetUsage };
        const ipCounters = { ...prev.ipCounters };

        if (!subnetUsage[subnet]) {
          subnetUsage[subnet] = new Set();
          ipCounters[subnet] = 0;
        }

        let index = ipCounters[subnet];
        let ip = generateIPInSubnet(subnet, index);

        while (ip && subnetUsage[subnet].has(ip)) {
          index++;
          ip = generateIPInSubnet(subnet, index);
        }

        if (ip) {
          subnetUsage[subnet].add(ip);
          ipCounters[subnet] = index + 1;
        }

        return { subnetUsage, ipCounters };
      });

      const subnetUsage = state.subnetUsage[subnet] || new Set();
      let index = state.ipCounters[subnet] || 0;
      let ip = generateIPInSubnet(subnet, index);

      while (ip && subnetUsage.has(ip)) {
        index++;
        ip = generateIPInSubnet(subnet, index);
      }

      return ip;
    },
    [state]
  );

  const registerIP = useCallback((subnet: string, ip: string) => {
    if (!validateSubnet(subnet)) {
      console.error(`Invalid subnet: ${subnet}`);
      return;
    }

    setState(prev => {
      const subnetUsage = { ...prev.subnetUsage };
      if (!subnetUsage[subnet]) {
        subnetUsage[subnet] = new Set();
      }
      subnetUsage[subnet].add(ip);
      return { ...prev, subnetUsage };
    });
  }, []);

  const unregisterIP = useCallback((subnet: string, ip: string) => {
    setState(prev => {
      const subnetUsage = { ...prev.subnetUsage };
      if (subnetUsage[subnet]) {
        subnetUsage[subnet].delete(ip);
      }
      return { ...prev, subnetUsage };
    });
  }, []);

  const getUsedIPsInSubnet = useCallback(
    (subnet: string): string[] => {
      return Array.from(state.subnetUsage[subnet] || []);
    },
    [state.subnetUsage]
  );

  const isIPUsed = useCallback(
    (subnet: string, ip: string): boolean => {
      return (state.subnetUsage[subnet] || new Set()).has(ip);
    },
    [state.subnetUsage]
  );

  return {
    generateIP,
    registerIP,
    unregisterIP,
    getUsedIPsInSubnet,
    isIPUsed,
  };
};
