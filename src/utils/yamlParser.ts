/**
 * YAML parser utility - converts YAML to UI state
 */

import YAML from 'js-yaml';
import { Experiment, TopologyConfig, Route } from '../types/experiment';

/**
 * Parses YAML string to Experiment object
 */
export const yamlToExperiment = (yamlContent: string): Experiment | null => {
  try {
    const parsed = YAML.load(yamlContent) as any;

    // Handle both { Experiment: {...} } and direct experiment object
    const experiment = parsed.Experiment || parsed;

    if (!experiment.name || !experiment.nodeactors) {
      console.error('Invalid experiment format: missing name or nodeactors');
      return null;
    }

    return experiment as Experiment;
  } catch (error) {
    console.error('Failed to parse YAML:', error);
    return null;
  }
};

/**
 * Extracts MENTORED_TOPOLOGY_CONFIG JSON from env vars
 */
export const extractTopologyConfig = (
  envVars?: Array<{ name: string; value: string }>
): TopologyConfig | null => {
  if (!envVars) {
    return null;
  }

  const configVar = envVars.find(e => e.name === 'MENTORED_TOPOLOGY_CONFIG');
  if (!configVar) {
    return null;
  }

  try {
    return JSON.parse(configVar.value);
  } catch (error) {
    console.error('Failed to parse MENTORED_TOPOLOGY_CONFIG:', error);
    return null;
  }
};

/**
 * Extracts routes from MENTORED_TOPOLOGY_CONFIG for use in node.routes
 */
export const extractRoutes = (
  envVars?: Array<{ name: string; value: string }>
): Route[] => {
  const config = extractTopologyConfig(envVars);
  if (!config?.routes) {
    return [];
  }
  return config.routes;
};

/**
 * Extracts all container env vars as a simple object
 */
export const extractContainerEnv = (
  envVars?: Array<{ name: string; value: string }>
): Record<string, string> => {
  if (!envVars) {
    return {};
  }

  return envVars.reduce(
    (acc, env) => {
      acc[env.name] = env.value;
      return acc;
    },
    {} as Record<string, string>
  );
};

/**
 * Validates experiment structure
 */
export const validateExperiment = (exp: any): exp is Experiment => {
  if (!exp || typeof exp !== 'object') {
    return false;
  }

  if (!exp.name || typeof exp.name !== 'string') {
    console.error('Missing or invalid experiment name');
    return false;
  }

  if (!Array.isArray(exp.nodeactors)) {
    console.error('Missing or invalid nodeactors');
    return false;
  }

  if (exp.nodeactors.length === 0) {
    console.error('Experiment must have at least one nodeactor');
    return false;
  }

  // Validate each nodeactor
  for (const node of exp.nodeactors) {
    if (!node.name || typeof node.name !== 'string') {
      console.error('Invalid nodeactor: missing or invalid name');
      return false;
    }

    if (typeof node.replicas !== 'number' || node.replicas < 1) {
      console.error(`Invalid replicas for nodeactor ${node.name}`);
      return false;
    }

    if (!node.region || typeof node.region !== 'string') {
      console.error(`Invalid region for nodeactor ${node.name}`);
      return false;
    }

    if (node.name.length > 32) {
      console.error(`Nodeactor name ${node.name} exceeds 32 characters`);
      return false;
    }
  }

  return true;
};
