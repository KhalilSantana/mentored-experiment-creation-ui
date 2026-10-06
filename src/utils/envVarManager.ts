/**
 * Utility functions for environment variable handling and injection
 */

import { EnvVar } from '../types/experiment';
import { TopologyConfig } from '../types/experiment';
import { topologyConfigToJSON } from './topologyConfigGenerator';

/**
 * Environment variable injection constants
 */
export const RESERVED_ENV_VARS = {
  MENTORED_TOPOLOGY_CONFIG: 'MENTORED_TOPOLOGY_CONFIG',
  MENTORED_EXPERIMENT_NAME: 'MENTORED_EXPERIMENT_NAME',
  MENTORED_NODE_ID: 'MENTORED_NODE_ID',
  MENTORED_CONTAINER_INDEX: 'MENTORED_CONTAINER_INDEX',
};

/**
 * Check if an environment variable is reserved (auto-generated)
 */
export const isReservedEnvVar = (name: string): boolean => {
  return Object.values(RESERVED_ENV_VARS).includes(name);
};

/**
 * Get user-editable environment variables (excluding reserved ones)
 */
export const getUserEnvVars = (envVars: EnvVar[]): EnvVar[] => {
  return (envVars || []).filter((env) => !isReservedEnvVar(env.name));
};

/**
 * Get all reserved environment variables that should be auto-injected
 */
export const getReservedEnvVars = (
  experimentName: string,
  nodeId: string,
  containerIndex: number,
  topologyConfig?: TopologyConfig
): EnvVar[] => {
  const reserved: EnvVar[] = [
    {
      name: RESERVED_ENV_VARS.MENTORED_EXPERIMENT_NAME,
      value: experimentName,
    },
    {
      name: RESERVED_ENV_VARS.MENTORED_NODE_ID,
      value: nodeId,
    },
    {
      name: RESERVED_ENV_VARS.MENTORED_CONTAINER_INDEX,
      value: containerIndex.toString(),
    },
  ];

  // Add MENTORED_TOPOLOGY_CONFIG if topology config is provided
  if (topologyConfig) {
    reserved.push({
      name: RESERVED_ENV_VARS.MENTORED_TOPOLOGY_CONFIG,
      value: topologyConfigToJSON(topologyConfig),
    });
  }

  return reserved;
};

/**
 * Merge user env vars with reserved/auto-generated ones
 * Reserved vars take precedence and override user-provided ones
 */
export const mergeEnvVars = (
  userEnvVars: EnvVar[],
  reservedEnvVars: EnvVar[]
): EnvVar[] => {
  // Start with user vars
  const merged = [...(userEnvVars || [])];

  // Remove any that are now reserved
  const filtered = merged.filter(
    (env) => !reservedEnvVars.find((r) => r.name === env.name)
  );

  // Add reserved vars (they override any user-provided values)
  return [...filtered, ...reservedEnvVars];
};

/**
 * Format environment variable for display/export
 */
export const formatEnvVar = (envVar: EnvVar): string => {
  return `${envVar.name}=${envVar.value}`;
};

/**
 * Validate environment variable name
 */
export const validateEnvVarName = (name: string): boolean => {
  // Environment variable names must be alphanumeric (and underscore)
  return /^[A-Z_][A-Z0-9_]*$/i.test(name) && name.length > 0 && name.length <= 255;
};

/**
 * Validate environment variable value (any value is technically valid)
 * But we can add length limits for practical reasons
 */
export const validateEnvVarValue = (value: string): boolean => {
  return value.length <= 10000; // 10KB limit for env var values
};

/**
 * Parse environment variables from string format
 * Format: "KEY1=value1\nKEY2=value2"
 */
export const parseEnvVarsFromString = (input: string): EnvVar[] => {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  return lines
    .map((line) => {
      const [name, ...valueParts] = line.split('=');
      return {
        name: name.trim(),
        value: valueParts.join('=').trim(),
      };
    })
    .filter((env) => validateEnvVarName(env.name));
};

/**
 * Export environment variables as shell commands
 * Format: export KEY1=value1; export KEY2=value2
 */
export const exportEnvVarsAsShell = (envVars: EnvVar[]): string => {
  return envVars
    .map((env) => {
      // Escape single quotes in value
      const escapedValue = env.value.replace(/'/g, "'\\''");
      return `export ${env.name}='${escapedValue}'`;
    })
    .join('; ');
};

/**
 * Export environment variables as JSON
 */
export const exportEnvVarsAsJSON = (envVars: EnvVar[]): string => {
  const obj: Record<string, string> = {};
  envVars.forEach((env) => {
    obj[env.name] = env.value;
  });
  return JSON.stringify(obj, null, 2);
};

/**
 * Export environment variables as .env file format
 */
export const exportEnvVarsAsEnvFile = (envVars: EnvVar[]): string => {
  return envVars
    .map((env) => {
      // Check if value needs quoting
      const needsQuotes =
        env.value.includes(' ') ||
        env.value.includes('=') ||
        env.value.includes('$');
      if (needsQuotes) {
        // Escape double quotes
        const escapedValue = env.value.replace(/"/g, '\\"');
        return `${env.name}="${escapedValue}"`;
      }
      return `${env.name}=${env.value}`;
    })
    .join('\n');
};
