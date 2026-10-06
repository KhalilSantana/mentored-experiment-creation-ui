# MENTORED Topology Editor Web UI

A React-based visual editor for creating and configuring MENTORED Experiment topologies with drag-and-drop node creation, VXLAN tunnel configuration, and YAML export/import.

## Features

- **Visual Topology Editor**: Drag-and-drop node actors with ReactFlow canvas
- **VXLAN Tunnel Configuration**: Auto-generate VNIs (starting from 100) and IP addresses
- **Container Management**: Configure Docker images, commands, arguments, and environment variables
- **Script Support**: Reference and manage experiment-level scripts
- **FRR Routing**: Built-in templates for BGP configuration
- **Preview & Web Services**: Configure logging, file previews, and exposed services
- **YAML Export/Import**: Download topologies as YAML or import existing experiments

## Supported Schema

Full support for **MentoredExperimentValidator.v3** including:
- Experiment-level configuration (name, scripts, preview settings, network attachment)
- NodeActor configuration (name, replicas, region, containers, persistent volumes)
- Container specs (image, command, args, ports, resources, privileged flag)
- Script references and definitions
- Topology links and drawing metadata for canvas state restoration
- Environment variable management with special handling for MENTORED_TOPOLOGY_CONFIG and FRR_CONF_CONTENT

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
│   ├── useTopology.ts         # Central state management
│   ├── useVNIGenerator.ts     # VNI auto-generation
│   └── useIPGenerator.ts      # IP auto-generation
├── components/
│   ├── TopologyCanvas.tsx     # ReactFlow canvas (Phase 2)
│   ├── NodeActorPanel.tsx     # Node configuration (Phase 3)
│   ├── ContainerConfigPanel.tsx
│   ├── EnvVarsPanel.tsx
│   ├── VXLANConnectionPanel.tsx
│   ├── FRRConfigPanel.tsx
│   └── ExportPanel.tsx
├── utils/
│   ├── validators.ts          # IP/VNI/subnet validation
│   ├── yamlGenerator.ts       # Convert state → YAML
│   └── yamlParser.ts          # Parse YAML → state
├── App.tsx                    # Main app component
├── App.css                    # App styling
├── main.tsx                   # Entry point
└── index.css                  # Global styles
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
- [ ] **Phase 2**: ReactFlow canvas with custom node/edge types
- [ ] **Phase 3**: Node actor and container configuration panels
- [ ] **Phase 4**: VXLAN auto-IP/VNI generation with edge configuration modal
- [ ] **Phase 5**: Environment variables and script editor
- [ ] **Phase 6**: Central state synchronization across components
- [ ] **Phase 7**: Advanced features (preview, web services, FRR templates)
- [ ] **Phase 8**: YAML export/import with full validation
- [ ] **Phase 9**: UI polish, keyboard shortcuts, error handling, documentation

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

## Keyboard Shortcuts (Phase 9)

- `Delete`: Remove selected node/edge
- `Ctrl+Z` / `Cmd+Z`: Undo
- `Ctrl+Y` / `Cmd+Y`: Redo
- `Ctrl+S` / `Cmd+S`: Save/Export YAML
- `Ctrl+O` / `Cmd+O`: Open/Import YAML

## Example Workflows

### Create a Simple 2-Node Topology

1. Click "+ Add Node" and create "router-core" (replicas: 1, region: ufpe-vm1)
2. Click "+ Add Node" and create "client-node" (replicas: 1, region: ufpe-vm1)
3. Add container to "router-core": image `ghcr.io/khalilsantana/mentored-base-utils:latest`
4. Drag from router-core handle to client-node handle to create VXLAN edge
5. In the modal, set subnet to `10.10.0.0/24` → VNI auto-generates (100), IPs auto-assigned (.1, .2)
6. Export to YAML → Download and apply to Kubernetes cluster

### Import Existing Topology

1. Click File → Upload YAML
2. Select BGP-Highjack-Plus-Services.yaml
3. Canvas restores with all nodes, edges, and positions preserved
4. Edit and re-export as needed

## Contributing

Pull requests welcome! Please follow the phase structure and ensure all TypeScript types are properly defined.

## License

Same as parent project (MENTORED Testbed)
