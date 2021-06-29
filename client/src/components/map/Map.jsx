import React, { useState, useEffect, useRef } from 'react'
import mapboxgl from "mapbox-gl";
import { MapOptions } from './MapOptions';
import { accessToken } from "../api/token"
import { CompanyNameFromArray } from '../functions/CompanyConverter'
import { convertToMapData } from '../api/decoder';

mapboxgl.accessToken = accessToken;

export const Map = props => {

  const [busses, setBusses] = useState();

  const [lng, setLng] = useState(4.8987713);
  const [lat, setLat] = useState(52.3778931);
  const [zoom, setZoom] = useState(9);

  const mapContainer = useRef(null);
  let map = useRef(null);

  useEffect(() => {
    InitializeMap();
  });

  

  const InitializeMap = () => {
    if (map.current) return; 
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/arilith/ckoqabais7zs618pl77d73zaw',
      center: [lng, lat],
      zoom: zoom
    });

    if (!map.current) return; 
    

    map.current.on('load', () => {
      
      // Insert the layer beneath any symbol layer.
      const layers = map.current.getStyle().layers;
      let buildingLayerId;
      for (var i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
          buildingLayerId = layers[i].id;
          break;
        }
      }

      map.current.addLayer(
        {
          'id': 'add-3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 10,
          'paint': {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': ['interpolate',['linear'],['zoom'],15,0,15.05,['get', 'height']],
            'fill-extrusion-base': ['interpolate', ['linear'],['zoom'],15,0,15.05,['get', 'min_height']],
            'fill-extrusion-opacity': 0.8
          }
        },
        buildingLayerId
      );
      map.current.addSource('shape', {
        'type' : 'geojson',
        'data' : {
          'type': 'Feature',
          'properties': {},
          'geometry': {
            'type': 'LineString',
            'coordinates': []
          }
        }
      })
  
      map.current.addSource('drivenPoints', {
        'type' : 'geojson',
        'data' : {
          'type': 'Feature',
          'properties': {},
          'geometry': {
            'type': 'Point',
            'coordinates': []
          }
        }
      })

      map.current.addLayer({
        'id': 'shapes',
        'type': 'line',
        'source': 'shape',
        'layout': {
          'line-join': 'round',
          'line-cap': 'round'
        },
        'paint': {
          'line-blur' : 2,
          'line-color': '#7B1010',
          'line-width': 4
        }
      });


      map.current.addLayer({
        id: `drivenPoints`,
        type: "circle",
        source: `drivenPoints`,
        paint: {
          'circle-radius': 5,
          'circle-color': '#A96ECA'
        }
      });

      props.setMapLoaded(true);

    })
  }

  useEffect(() => {
    setBusses(props.busses);

    if(!busses) return;
    if(!map.current) InitializeMap();

    const convertedData = convertToMapData(props.busses)
    
    props.setCompanies(CompanyNameFromArray(Object.keys(convertedData)));

    for(let [company, values] of Object.entries(convertedData)) {
      if(!map.current.getSource(`busses_${company}`)) {
        map.current.loadImage(`images/${company}.png`, function (error, image) {
          if(!map.current.hasImage(`${company}-marker`)) map.current.addImage(`${company}-marker`, image);
          if(map.current.getSource(`busses_${company}`)) return;
          map.current.addSource(`busses_${company}`, {
            type: 'geojson',
            data: {
              "type": "FeatureCollection",
              "features": values
            }
          });
          map.current.addLayer({
            id: `busses_${company}`,
            type: "symbol",
            source: `busses_${company}`,
            ...MapOptions(company)
          });
        });
        map.current.on('click', `busses_${company}`, function (e) {
          toggleInformation(e.features[0]?.properties);
        });
           
        map.current.on('mouseenter', `busses_${company}`, function () {
          map.current.getCanvas().style.cursor = 'pointer';
        });
          
        map.current.on('mouseleave', `busses_${company}`, function () {
          map.current.getCanvas().style.cursor = '';
        });
      } else {
        map.current.getSource(`busses_${company}`).setData({
          type: "FeatureCollection",
          features: values
        });
      }
      props.setMapLoaded(true);
    }
        
  }, [props.busses]) // eslint-disable-line

  useEffect(() => {
    if(props.shape)
      setShape(props.shape)
  }, [props.shape])

  useEffect(() => {
    if(props.drivenShape)
      setDrivenShape(props.drivenShape)
  }, [props.drivenShape])


  const toggleInformation = (busData) => {
    props.setClickedBusData(busData);
  }

  const setShape = (shapeArray) => {
    if(map.current.getSource('shape'))  {
      map.current.getSource('shape').setData({
        'type': 'Feature',
        'properties': {},
        'geometry': {
          'type': 'LineString',
          'coordinates': shapeArray
        }
      })
    }  
  }

  const setDrivenShape = (shapeArray) => {
    if(map.current.getSource('drivenPoints'))  {
      const points = [];
      shapeArray.forEach(point => {
        points.push({
          'type': 'Feature',
          'properties': {},
          'geometry': {
            'type': 'Point',
            'coordinates': point
          }
        })
      })

      map.current.getSource('drivenPoints').setData({
        type: "FeatureCollection",
        features: points
      })
    }  
  }

  useEffect(() => {
    setFilter(props.filter)
  }, [props.filter])

  const setFilter = (filter) => {
    if(filter.company) {
      const filterLayer = map.current.getLayer(`busses_${filter.company}`);
      if(filterLayer) {
        if(map.current.getLayoutProperty(`busses_${filter.company}`, 'visibility') !== 'none')
          map.current.setLayoutProperty(`busses_${filter.company}`, 'visibility', 'none')
        else
          map.current.setLayoutProperty(`busses_${filter.company}`, 'visibility', 'visible')
      }
    }
  }

  

  return <div ref={mapContainer} className="map-container" />
}


