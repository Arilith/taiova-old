const haloColors = {
  ARR: "#fff",
  QBUZZ: "#fff",
  CXX: "#fff",
  RET: "#fff",
  EBS: "#fff",
  KEOLIS: "#fff",
  DELIJN: "#fff",
  SYNTUS: "#fff",
  GVB: "#fff",
  TEC: "#fff",
  BRAVO: "#fff",
  TWENTS: "#DC001A",
  TEXELHOPPER: "#fff",
  WATERBUS: "#fff",
  UOV: "#fff",
  OVREGIOY: "#fff",
  BRENG: "#fff",
  OVERAL: "#fff",
  ALLGO: "#fff",
  HTM: "#fff"
}


const textColors = {
  ARR: "#73DAE3",
  QBUZZ: "#FEAD60",
  CXX: "#006672",
  RET: "#FF2626",
  EBS: "#20BEDB",
  KEOLIS: "#BEB8B4",
  DELIJN: "#000",
  SYNTUS: "#C41521",
  GVB: "#000",
  TEC: "#000",
  BRAVO: "#5C2583",
  TWENTS: "#FFF",
  WATERBUS: "#000",
  TEXELHOPPER: "#EDD468",
  UOV: "#F48B34",
  OVREGIOY: "#0060A0",
  BRENG: "#E31082",
  OVERAL: "#469896",
  ALLGO: "#000",
  HTM: "#000",
}

export const MapOptions = key => ({
  layout: { 
    "icon-image": `${key}-marker`, 
    "icon-anchor" : 'bottom',
    "icon-rotation-alignment": "viewport",
    "icon-size": ["interpolate", ["exponential", 1], ["zoom"],10,1,15,0.75,21,0.5],
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
    // "text-allow-overlap": true,
    // "text-ignore-placement": true,
    'text-field': ['get', 'lineNumber'],
    'text-anchor': 'left',
    'text-radial-offset': 0.5,
    "text-line-height": 2,
    'text-justify': 'auto',
    "text-optional": true,
    "text-size": {
      "stops": [
        [0, 0],
        [11.9, 0],
        [12, 15]
      ]
    }
  },
  paint: {
    "text-color": textColors[key],
    'text-translate': [15, -20],
    "text-halo-color": haloColors[key],
    "text-halo-width": 100,
    "text-halo-blur" : 100,
    "icon-opacity": ["case",["boolean", ["feature-state", "hover"], false],0.5,1,],
    
  }
})
