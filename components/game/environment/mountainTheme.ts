// Central customization theme for Genting Highlands mountain, roads, and atmosphere.

export interface RoadSurfaceConfig {
  color: string;
  roughness: number;
  metalness: number;
}

export interface MountainTheme {
  // Road surface materials across all 5 surveyed categories
  roads: {
    collector: RoadSurfaceConfig; // Primary mountain pass highway
    local: RoadSurfaceConfig;     // Local connecting roads
    service: RoadSurfaceConfig;   // Service & utility access roads
    paths: RoadSurfaceConfig;     // Footpaths & walking tracks
    bridge: RoadSurfaceConfig;    // Elevated concrete bridge decks
  };

  // Malaysian JKR road infrastructure & safety markings
  markings: {
    centerDoubleYellow: string;   // Continuous double yellow line (no overtaking)
    shoulderWhite: string;        // White shoulder boundary line
    rumbleStrips: string;         // Yellow ribbed rumble strips at hairpin approaches
    catEyes: {
      color: string;
      emissive: string;
      emissiveIntensity: number;
    };
    guardrails: {
      color: string;              // Galvanized W-beam steel
      metalness: number;
      roughness: number;
    };
    curbs: {
      color: string;              // Concrete roadside curb
      roughness: number;
    };
    posts: {
      color: string;              // Concrete kilometre milestone marker
    };
  };

  // 1:1 Mountain terrain styling
  terrain: {
    baseColor: string;
    roughness: number;
    metalness: number;
    wireframe: boolean;
  };

  // Genting Highlands resort architecture
  buildings: {
    facadeColor: string;          // Highland limestone / concrete
    roofColor: string;            // Terracotta / resort accent
    glassColor: string;           // Tinted reflective windows
    roughness: number;
    metalness: number;
  };

  // Tropical rainforest tree foliage
  trees: {
    foliageColor: string;         // Highland canopy green
    canopyColor: string;          // Sunlit upper leaves
    trunkColor: string;           // Weathered tree bark
    roughness: number;
  };

  // Lighting, sky and Genting mountain mist
  atmosphere: {
    fogColor: string;             // Characteristic Genting cool mountain mist
    fogDensity: number;
    skyColor: string;
    hemisphereSky: string;
    hemisphereGround: string;
    hemisphereIntensity: number;
    sunPosition: [number, number, number];
    sunColor: string;
    sunIntensity: number;
  };
}

export const DEFAULT_MOUNTAIN_THEME: MountainTheme = {
  roads: {
    collector: {
      color: "#2f3336",          // Freshly paved dark asphalt
      roughness: 0.88,
      metalness: 0.04,
    },
    local: {
      color: "#383c3e",          // Slightly weathered local asphalt
      roughness: 0.90,
      metalness: 0.02,
    },
    service: {
      color: "#464a47",          // Coarser access asphalt/aggregate
      roughness: 0.93,
      metalness: 0.0,
    },
    paths: {
      color: "#5a5d57",          // Paved walkway / gravel tone
      roughness: 0.95,
      metalness: 0.0,
    },
    bridge: {
      color: "#43494d",          // Reinforced concrete bridge deck
      roughness: 0.82,
      metalness: 0.12,
    },
  },

  markings: {
    centerDoubleYellow: "#f5b722", // JKR specification bright yellow
    shoulderWhite: "#ededed",      // JKR specification crisp white
    rumbleStrips: "#eab308",       // High-visibility hazard yellow
    catEyes: {
      color: "#ffffff",
      emissive: "#ffffff",
      emissiveIntensity: 0.85,
    },
    guardrails: {
      color: "#cdd4d8",            // Hot-dip galvanized steel
      metalness: 0.84,
      roughness: 0.24,
    },
    curbs: {
      color: "#97a0a3",            // Precast concrete roadside curb
      roughness: 0.92,
    },
    posts: {
      color: "#ffffff",            // White milestone marker
    },
  },

  terrain: {
    baseColor: "#ffffff",          // Multiplied by slope-based vertexColors
    roughness: 0.98,
    metalness: 0.0,
    wireframe: false,
  },

  buildings: {
    facadeColor: "#c6beaf",        // Highland resort stone
    roofColor: "#823c34",          // Terracotta resort roof
    glassColor: "#3c5866",         // Tinted blue-grey glass
    roughness: 0.68,
    metalness: 0.22,
  },

  trees: {
    foliageColor: "#2c5427",       // Dense tropical rainforest green
    canopyColor: "#486e33",        // Bright upper canopy
    trunkColor: "#3b342b",         // Deep weathered bark
    roughness: 0.96,
  },

  atmosphere: {
    fogColor: "#b8cbd2",           // Genting cool mountain mist
    fogDensity: 0.0013,
    skyColor: "#b8cbd2",
    hemisphereSky: "#cadbe3",
    hemisphereGround: "#2c3e2e",
    hemisphereIntensity: 1.75,
    sunPosition: [400, 900, -250],
    sunColor: "#f4f8fa",
    sunIntensity: 2.3,
  },
};
