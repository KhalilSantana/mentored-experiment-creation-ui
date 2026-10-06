/**
 * Validation utilities for MENTORED topology
 */

export const validateSubnet = (subnet: string): boolean => {
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  if (!cidrRegex.test(subnet)) {
    return false;
  }

  const [ip, mask] = subnet.split('/');
  const maskNum = parseInt(mask, 10);

  if (maskNum < 0 || maskNum > 32) {
    return false;
  }

  const parts = ip.split('.').map(p => parseInt(p, 10));
  return parts.every(p => p >= 0 && p <= 255);
};

export const validateIP = (ip: string): boolean => {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    return false;
  }

  const parts = ip.split('.').map(p => parseInt(p, 10));
  return parts.every(p => p >= 0 && p <= 255);
};

export const validateNodeName = (name: string): boolean => {
  return name.length > 0 && name.length <= 32 && /^[a-zA-Z0-9-]+$/.test(name);
};

export const validateVNI = (vni: number): boolean => {
  return vni >= 0 && vni <= 16777215; // VXLAN VNI is 24-bit
};

export const validatePort = (port: number): boolean => {
  return port >= 1 && port <= 65535;
};

/**
 * Parses CIDR subnet and returns network info
 */
export const parseSubnet = (
  subnet: string
): { network: string; mask: number; broadcastBits: number } | null => {
  if (!validateSubnet(subnet)) {
    return null;
  }

  const [ip, maskStr] = subnet.split('/');
  const mask = parseInt(maskStr, 10);

  return {
    network: ip,
    mask,
    broadcastBits: 32 - mask,
  };
};

/**
 * Generates next available IP in subnet
 */
export const generateIPInSubnet = (
  subnet: string,
  index: number
): string | null => {
  const parsed = parseSubnet(subnet);
  if (!parsed) {
    return null;
  }

  const [o1, o2, o3, o4] = parsed.network.split('.').map(o => parseInt(o, 10));
  let ipNum = (o1 << 24) + (o2 << 16) + (o3 << 8) + o4;

  // Skip network address (ipNum) and start from .1
  ipNum += index + 1;

  // Ensure we don't exceed broadcast
  const maxHosts = Math.pow(2, parsed.broadcastBits) - 2;
  if (index >= maxHosts) {
    return null; // Subnet exhausted
  }

  const newO1 = (ipNum >> 24) & 0xff;
  const newO2 = (ipNum >> 16) & 0xff;
  const newO3 = (ipNum >> 8) & 0xff;
  const newO4 = ipNum & 0xff;

  return `${newO1}.${newO2}.${newO3}.${newO4}/${parsed.mask}`;
};

/**
 * Converts CIDR IP to string without mask
 */
export const stripCIDR = (ip: string): string => {
  return ip.split('/')[0];
};

/**
 * Generate auto-incrementing CIDR subnets (10.x.y.0/24)
 * edgeIndex: 0 → 10.0.0.0/24, 1 → 10.1.0.0/24, etc.
 */
export const generateAutoIncrementCIDR = (edgeIndex: number): string => {
  const baseOctet2 = Math.floor(edgeIndex / 256); // 0-255
  const baseOctet3 = edgeIndex % 256; // 0-255
  return `10.${baseOctet2}.${baseOctet3}.0/24`;
};
