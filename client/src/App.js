import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = "pk.eyJ1IjoiYXJpbGl0aCIsImEiOiJja29xODZiMHcwMjVjMnZvaHI5bGh3bjJ6In0.ZTVaklGwPP-wm9gNyfi6tA"

export default function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(4.966336589911254);
  const [lat, setLat] = useState(51.952161496430836);
  const [zoom, setZoom] = useState(9);
  const [response, setResponse] = useState();

  useEffect(() => {

    console.log("Connecting to websocket...")
    const socket = io("ws://localhost:3001")
    socket.on("connect", () => {
      socket.on("ovdata", (data) => {
        console.log(data)
        setResponse(data)
      })
    })
  }, [])

  useEffect(() => {
    
  }, [response])

  useEffect(() => {
    if (map.current) return; // initialize map only once
      map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: zoom
    });

    if (!map.current) return; // wait for map to initialize
    map.current.on('move', () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });

    map.current.on('load', function () {
      // Insert the layer beneath any symbol layer.
      var layers = map.current.getStyle().layers;
      var labelLayerId;
      for (var i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
          labelLayerId = layers[i].id;
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
        'minzoom': 15,
        'paint': {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 1
        }
      }, labelLayerId);
    });
  });

  return (
    <div>
      <div className="sidebar">
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>
      <div ref={mapContainer} className="map-container" />
      <ul>
        {response && response.map(data => {
          return <li key={data.vehicleId}>{data.vehicleData.position}</li>
        })}
      </ul>
    </div>
  );
}

