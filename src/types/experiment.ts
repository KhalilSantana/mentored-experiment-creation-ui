/**
 * Complete TypeScript types for MENTORED Experiment schema (v3)
 * Based on MentoredExperimentValidator.v3.yaml
 */

export interface SecurityContext {
  privileged?: boolean;
}

export interface Port {
  containerPort: number;
}

export interface Resources {
  limits?: {
    cpu?: string;
    memory?: string;
  };
  requests?: {
    cpu?: string;
    memory?: string;
  };
}

export interface EnvVar {
  name: string;
  value: string;
}

export interface Container {
  name: string;
  image: string;
  imagePullPolicy?: 'Always' | 'IfNotPresent';
  command?: string[];
  args?: string[];
  env?: EnvVar[];
  ports?: Port[];
  resources?: Resources;
  securityContext?: SecurityContext;
}

export interface ScriptContainer {
  name: string;
  script_id: string;
  env?: EnvVar[];
}

export interface PreviewedFile {
  container: string;
  path: string;
}

export interface ExposedWebService {
  container: string;
  port: number;
  scheme?: 'http' | 'https';
}

export interface NodeActor {
  name: string; // max 32 chars
  replicas: number; // min 1
  region: string;
  cluster?: string;
  icon?: string;
  description?: string;
  underlay_interface?: string;
  persistent_volume_path?: string | string[];
  containers?: (Container | ScriptContainer)[];
  previewed_files_path?: PreviewedFile[];
  preview_stdout?: boolean;
  preview_logs?: boolean;
  exposed_web_services?: ExposedWebService[];
  bridges?: UIBridge[]; // UI-only: layer 2 connection points, stripped on export
}

export interface Bridge {
  id?: string; // UI-only stable id, never exported
  name: string;
  ip?: string;
  mtu?: number;
}

/** Bridge as stored in the UI state (id always present). */
export interface UIBridge extends Bridge {
  id: string;
}

export interface VXLANInterface {
  interface: string;
  vni: number;
  bridge?: string;
  remote_host?: string;
  ip?: string;
  mtu?: number;
  learning?: boolean;
  flood?: boolean;
}

export interface Route {
  to?: string; // or 'dst'
  via?: string; // or 'gw' or 'gateway'
  dev?: string;
  metric?: number;
  onlink?: boolean;
}

export interface TopologyConfig {
  cluster_pod_cidr?: string;
  underlay?: string;
  dstport?: number;
  vni?: number;
  bridges?: Bridge[];
  interfaces?: VXLANInterface[];
  routes?: Route[];
}

export interface TopologyLink {
  id: string;
  source: string;
  target: string;
  interaction?: string;
  metadata?: Record<string, any>;
}

export interface Topology {
  links?: TopologyLink[];
}

export interface DrawingNodePosition {
  x: number;
  y: number;
}

export interface DrawingNode {
  id: string;
  label?: string;
  position?: DrawingNodePosition;
  data?: Record<string, any>;
}

export interface Drawing {
  nodes?: DrawingNode[];
}

export interface Script {
  script_id: string;
  script_type: 'python' | 'python3' | 'shellscript' | 'sh' | 'bash';
  script_code: string;
}

export interface Experiment {
  name: string;
  nodeactors: NodeActor[];
  default_persistent_volume_path?: string | string[];
  scripts?: Script[];
  preview_stdout?: boolean;
  network_attachment?: boolean;
  underlay_interface?: string;
  topology?: Topology;
  drawing?: Drawing;
}

/**
 * Internal UI state types
 */

export interface VNIMapping {
  [key: string]: number; // node-id or edge-id -> VNI
}

export interface IPMapping {
  [key: string]: string; // node-id -> IP
}

export interface VXLANEdge {
  id: string;
  source: string; // node actor name
  target: string; // node actor name
  sourceBridgeId: string;
  targetBridgeId: string;
  vni: number;
}

export interface UIState {
  experiment: Experiment;
  vxlanEdges: VXLANEdge[];
  vniCounter: number;
  ipMappings: IPMapping;
  selectedNodeId?: string;
  selectedEdgeId?: string;
}
