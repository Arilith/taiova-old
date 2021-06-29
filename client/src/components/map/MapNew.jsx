import React, { useState, useEffect, useRef } from 'react'
import mapboxgl from "mapbox-gl";
import { MapOptions } from './MapOptions';
import { accessToken } from "../api/token"

mapboxgl.accessToken = accessToken;

export const MapNew = props => {

  const mapContainer = useRef(null);
  const [map, setMap] = useState();
  
  const setMapLoaded = props.setMapLoaded;
  useEffect(() => {
    if(!map) {
      setMap(new mapboxgl.Map({
        container: mapContainer.current,
          style: 'mapbox://styles/arilith/ckoqabais7zs618pl77d73zaw',
          center: [4.8987713, 52.3778931],
          zoom: 9
      }))
    } else {
      map.on('load', () => {
        setMapLoaded(true)
        InitializeMap();
      })
    }
    
    const InitializeMap = () => {
      map.addSource('busses', {
        type: 'geojson',
        data: {
          "type": "FeatureCollection",
          'features': [
            {
                // feature for Mapbox DC
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [
                        -77.03238901390978, 38.913188059745586
                    ]
                }
            },
            {
                // feature for Mapbox SF
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [-122.414, 37.776]
                }
            }
        ]
        }
      });

      map.addLayer({
        'id': 'busses',
        'type': 'circle',
        'source': 'busses',
      })
    }

  }, [map, setMapLoaded])

  

  useEffect(() => {
    if(!map || !props.busses || !map.getSource('busses')) return;
    map.getSource('busses').setData({
      "type": "FeatureCollection",
      "features" : props.busses
    });
    //console.log(props.busses)
    


  }, [props.busses, map])

  return <div ref={mapContainer} className="map-container" />
}


