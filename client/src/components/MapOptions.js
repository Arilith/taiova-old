export const MapOptions = key => ({
  layout: { 
    "icon-image": `${key}-marker`, 
    "icon-rotation-alignment": "viewport",
    "icon-size": ["interpolate", ["exponential", 1], ["zoom"],10,1,15,0.75,21,0.5],
    "text-field": "{title}",
    "text-allow-overlap": true,
    "icon-allow-overlap": true,
    "text-line-height": 0.9,
    "text-padding": ["interpolate",["exponential", 9],["zoom"],1,2,3,4],
    "text-offset": [0, 0.4],
    "icon-offset": [0, -40.6],
    "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
    "text-size": ["interpolate",["exponential", 8],["zoom"],10,10,21,14],
    "text-max-width": Infinity,
    "icon-ignore-placement": true,
    "text-rotation-alignment": "viewport",
  },
  paint: {
    "text-color": "#FFF",
    "text-halo-color": "#00318f",
    "text-halo-width": 0,
    "icon-opacity": ["case",["boolean", ["feature-state", "hover"], false],0.5,1,],
    "text-opacity": ["case",["boolean", ["feature-state", "hover"], false],0.5,0,],
  }
})
