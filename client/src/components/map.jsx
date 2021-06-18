import React, { useState, useEffect, useRef } from 'react'
import mapboxgl from "mapbox-gl";
import { MapOptions } from './MapOptions';
import BusInformationPanel from './BusInformationPanel';
import '../css/map.css';
import { accessToken } from "./api/token"
import { Search } from './search/Search';
import { CompanyNameFromArray } from './functions/CompanyConverter'
import { FunctionButtons } from './FunctionButtons';
import { turf } from '@turf/turf';
mapboxgl.accessToken = accessToken;
const Map = props => {

  const [mapData, setMapData] = useState();
  const [lng, setLng] = useState(4.8987713);
  const [lat, setLat] = useState(52.3778931);
  const [zoom, setZoom] = useState(9);

  const [busData, setBusData] = useState();

  const [dark, setDark] = useState(localStorage.getItem('dark-mode') === "false" ? false : true);

  const mapContainer = useRef(null);
  let map = useRef(null);

  

  useEffect(() => {
    InitializeMap();
  });

  const [companies, setCompanies] = useState([]);

  const InitializeMap = () => {
    if (map.current) return; 
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/arilith/ckoqabais7zs618pl77d73zaw',
      center: [lng, lat],
      zoom: zoom,
      // maxBounds: [
      //   [3.31497114423, 50.803721015],
      //   [7.09205325687, 53.5104033474]
      // ]
    });
   // map.current.scrollZooom.setWheelZoomRate('1/135');
    if (!map.current) return; 
    
    map.current.on('move', () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });

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
    })
  }

  const AnimateCamera = () => {
    
  }

  useEffect(() => {
    setMapData(props.data);

    if(!mapData) return;
    if(!map.current) InitializeMap();

    const convertedData = props.data.reduce((acc, cur) => {
      if(!acc[cur.company]) acc[cur.company] = []
  
      acc[cur.company].push({
          type: "Feature",
          geometry: {
              type: "Point",
              coordinates: cur.position,
          },
          properties: {
            company: cur.company,
            originalCompany: cur.originalCompany,
            planningNumber: cur.planningNumber,
            journeyNumber: cur.journeyNumber,
            timestamp: cur.timestamp,
            vehicleNumber: cur.vehicleNumber,
            position: cur.position,
            status: cur.status,
            createdAt: cur.createdAt,
            updatedAt: cur.updatedAt,
            lineNumber: cur.lineNumber,
            title: cur.vehicleNumber,
            description: `<b>This is a bus from ${cur.company} with vehicle number ${cur.vehicleNumber}</b>`
          }
      })
  
      return acc
    }, {})
    
    setCompanies(CompanyNameFromArray(Object.keys(convertedData)));

    for(let [company, values] of Object.entries(convertedData)) {
      if(!map.current.getSource(`busses_${company}`)) {
        map.current.loadImage(`images/${company}.png`, function (error, image) {
          map.current.addImage(`${company}-marker`, image);
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
        
  }, [props.data]) // eslint-disable-line

  

  const toggleInformation = (busData) => {
    setBusData(busData);
  }

  const setShape = (shapeArray) => {

    

    if(map.current.getSource('shape'))  {
      //console.log(map.current.getSource('shape'));
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

  const toggleDark = () => {
    
    if(localStorage.getItem('dark-mode') === "false")
      localStorage.setItem('dark-mode', true)
    else
      localStorage.setItem('dark-mode', false)

    setDark(!dark);
  }

  return (
    <>
      <Search setFilter={setFilter} companies={companies} dark={dark} />
      <div className="flex lg:flex-row flex-col-reverse p-1 mt-auto">
        <FunctionButtons dark={dark} toggleDark={toggleDark} />
        {busData && <BusInformationPanel data={busData} setShape={setShape} dark={dark} />}
      </div>
      <div ref={mapContainer} className="map-container" />
    </>
  )
}

export default Map

