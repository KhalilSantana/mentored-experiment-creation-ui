# MENTORED Topology Editor Web UI

A React-based visual editor for creating and configuring MENTORED Experiment topologies with drag-and-drop node creation, VXLAN tunnel configuration, static route management, and YAML export/import.

## Features

- **Visual Topology Editor**: Resizable panes with ReactFlow canvas — left sidebar for node management, right panel for properties
- **Toolbar**: Compact top bar with Import YAML, Export YAML, Load Settings, and Save Settings buttons
- **VXLAN Tunnel Configuration**: Auto-generate VNIs (starting from 100) and IP addresses via bridge creation
- **Static Route Management**: Configure per-node static routes including default routes (`ip route replace default via <gateway> dev <interface> onlink`)
- **Container Management**: Configure Docker images, commands, arguments, ports, resources, and privileged flag
- **Script Support**: Reference and manage experiment-level scripts (Python, shell scripts)
- **FRR Routing**: Built-in support for FRR configuration via `FRR_CONF_CONTENT` environment variable
- **Preview & Web Services**: Configure logging, file previews, and exposed web services
- **YAML Export/Import**: Download topologies as YAML or import existing experiments
- **Settings Save/Load**: Save and restore full canvas state (nodes, edges, drawing positions) as JSON

## Supported Schema

Full support for **MentoredExperimentValidator.v3** including:
- Experiment-level configuration (name, scripts, preview settings, network attachment)
- NodeActor configuration (name, replicas, region, containers, persistent volumes, static routes)
- Container specs (image, command, args, ports, resources, privileged flag)
- Script references and definitions
- Topology links and drawing metadata for canvas state restoration
- Environment variable management with special handling for `MENTORED_TOPOLOGY_CONFIG` and `FRR_CONF_CONTENT`

## Development

### Prerequisites
- Node.js 18+ 
- npm 9+

### Setup

```bash
# Install dependencies
npm install

# Start development server (accessible on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Project Structure

```
src/
├── types/
│   └── experiment.ts          # TypeScript interfaces for entire schema
├── hooks/
│   ├── useTopology.ts         # Central state management (context provider)
│   ├── useVNIGenerator.ts     # VNI auto-generation
│   └── useIPGenerator.ts      # IP auto-generation
├── components/
│   ├── TopologyCanvas.tsx     # ReactFlow canvas with custom nodes/edges
│   ├── CustomNode.tsx         # Node actor visual representation
│   ├── NodeActorPanel.tsx     # Node name, replicas, region, cluster config
│   ├── ContainerConfigPanel.tsx
│   ├── EnvVarEditor.tsx       # Environment variable editor
│   ├── VXLANConnectionPanel.tsx
│   ├── VXLANEdge.tsx          # VXLAN edge visual component
│   ├── RouteEditor.tsx        # Static route editor (dest, gateway, device, onlink, metric)
│   ├── PropertiesPanel.tsx    # Composite view: node props, bridges, routes, containers
│   ├── TopologyConfigPanel.tsx
│   ├── ScriptPanel.tsx        # Experiment-level script management
│   ├── ScriptEditor.tsx       # Inline script editor
│   ├── App.tsx                # Main app layout (toolbar + resizable panes)
│   ├── App.css                # App styling
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
├── utils/
│   ├── validators.ts          # IP/VNI/subnet validation
│   ├── yamlGenerator.ts       # UI state → YAML export
│   ├── yamlParser.ts          # YAML import → UI state
│   ├── addressing.ts          # Bridge IP allocation logic
│   ├── topologyConfigGenerator.ts  # MENTORED_TOPOLOGY_CONFIG builder
│   ├── envVarManager.ts       # Special env var handling
│   └── edgeColorMapper.ts     # Deterministic edge colors by VNI
```

## Docker

### Build Docker Image

```bash
docker build -t mentored-topology-ui:latest .
```

### Run Container

```bash
docker run -p 5173:5173 mentored-topology-ui:latest
```

Access the UI at `http://localhost:5173`

## Implementation Phases

- [x] **Phase 1**: Project setup, Docker, TypeScript types, validation utilities, hooks, basic UI layout
- [x] **Phase 2**: ReactFlow canvas with custom node/edge types (resizable panes, toolbar)
- [x] **Phase 3**: Node actor and container configuration panels
- [x] **Phase 4**: VXLAN auto-IP/VNI generation with edge configuration via bridge creation
- [x] **Phase 5**: Environment variables and script editor
- [x] **Phase 6**: Central state synchronization across components (useTopology context)
- [x] **Phase 7**: YAML export/import, settings save/load (JSON), edge color mapping
- [x] **Phase 8**: Static route management — per-node route editor with destination, gateway, device, onlink, metric
- [ ] **Phase 9**: Advanced features (preview, web services, FRR templates as presets)
- [ ] **Phase 10**: UI polish, keyboard shortcuts, error handling, documentation

## Environment Variables

### MENTORED_TOPOLOGY_CONFIG

Auto-generated JSON structure for network configuration:

```json
{
  "cluster_pod_cidr": "10.244.0.0/16",
  "bridges": [
    { "name": "br-isp", "ip": "10.10.0.1/24", "mtu": 1280 }
  ],
  "interfaces": [
    {
      "interface": "vxlan100",
      "vni": 100,
      "bridge": "br-isp",
      "remote_host": "other-node"
    }
  ],
  "routes": [
    { "to": "default", "via": "10.10.0.1", "dev": "br-isp", "onlink": true }
  ]
}
```

### FRR_CONF_CONTENT

BGP routing configuration (supports templates):

```
frr version 8.5
frr defaults traditional
hostname router-core
log syslog informational

router bgp 65000
 bgp router-id 10.10.0.1
 neighbor 10.10.0.2 remote-as 65001
 ...
```

## Validation Rules

- **Node name**: 1-32 characters, alphanumeric + hyphens
- **Subnet**: Valid CIDR notation (e.g., 10.10.0.0/24)
- **VNI**: 0-16777215 (24-bit)
- **Port**: 1-65535
- **Replicas**: ≥1
- **IP**: Valid IPv4 address

## Example Workflows

### Create a Simple 2-Node Topology with Default Route

1. Click **"+ Add Node"** in the left sidebar and enter a node name (e.g., `router-isp`)
2. Add another node (e.g., `client-home`)
3. For each node, add a container: image `ghcr.io/khalilsantana/mentored-base-utils:latest`
4. In the right panel, under **Bridges**, click **"+ bridge"** to create a bridge for the node
5. Drag from a node's handle (right edge) to another node's handle to create a VXLAN tunnel
6. The VNI auto-generates (starts at 100), bridge IPs auto-assign
7. Under **Static Routes**, click **"+ Route"** to add routes:
   - Destination: `default`
   - Gateway: e.g., `192.168.100.1`
   - Device: e.g., `office-lan`
   - On-link: checked
8. Click **📥 Export YAML** to download the topology as a MENTORED experiment YAML
9. Click **💾 Save Settings** to save the full canvas state as JSON for later editing

### Import Existing Topology

1. Click **📂 Import YAML** and select a YAML file (e.g., `BGP-Highjack-Plus-Services.yaml`)
2. Canvas restores with all nodes, edges, and drawing positions
3. Routes are automatically parsed from `MENTORED_TOPOLOGY_CONFIG` in each container
4. Edit and re-export as needed

### Save and Restore Work

1. **💾 Save Settings** exports the current state (nodes, edges, drawing positions) as `experiment-name-settings.json`
2. **📋 Load Settings** restores the saved state into the editor
3. This allows pausing work and resuming without losing canvas layout

## Contributing

Pull requests welcome! Please follow the phase structure and ensure all TypeScript types are properly defined.

## License

Same as parent project (MENTORED Testbed)
