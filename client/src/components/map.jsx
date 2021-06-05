import React, { useState, useEffect, useRef } from 'react'
import mapboxgl from "mapbox-gl";
import { MapOptions } from './MapOptions';
import BusInformationPanel from './BusInformationPanel';
import '../css/map.css';
mapboxgl.accessToken =
  "pk.eyJ1IjoiYXJpbGl0aCIsImEiOiJja29xODZiMHcwMjVjMnZvaHI5bGh3bjJ6In0.ZTVaklGwPP-wm9gNyfi6tA";

const Map = props => {

  const [mapData, setMapData] = useState();
  const [lng, setLng] = useState(4.8987713);
  const [lat, setLat] = useState(52.3778931);
  const [zoom, setZoom] = useState(9);

  const [busData, setBusData] = useState({});

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
      zoom: zoom,
      // maxBounds: [
      //   [3.31497114423, 50.803721015],
      //   [7.09205325687, 53.5104033474]
      // ]
    });
    
    if (!map.current) return; 
    map.current.on('move', () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });
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
            planningNumber: cur.planningNumber,
            journeyNumber: cur.journeyNumber,
            timestamp: cur.timestamp,
            vehicleNumber: cur.vehicleNumber,
            position: cur.position,
            status: cur.status,
            createdAt: cur.createdAt,
            updatedAt: cur.updatedAt,
            title: cur.vehicleNumber,
            description: `<b>This is a bus from ${cur.company} with vehicle number ${cur.vehicleNumber}</b>`
          }
      })
  
      return acc
    }, {})

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
          // var coordinates = e.features[0].geometry.coordinates.slice();
          // var description = e.features[0].properties.description;
          // console.log(e.features[0]);
          // new mapboxgl.Popup()
          //   .setLngLat(coordinates.map((cord, index) => cord += index === 0 ? 0 : 0.01))
          //   .setHTML(description)
          //   .addTo(map.current);
        });
           
        // Change the cursor to a pointer when the mouse is over the places layer.
        map.current.on('mouseenter', `busses_${company}`, function () {
          map.current.getCanvas().style.cursor = 'pointer';
        });
          
        // Change it back to a pointer when it leaves.
        map.current.on('mouseleave', `busses_${company}`, function () {
          map.current.getCanvas().style.cursor = '';
        });
      } else {
        map.current.getSource(`busses_${company}`).setData({
          type: "FeatureCollection",
          features: values
        });
      }
    }
  }, [props.data])

  const toggleInformation = (busData) => {
    setBusData(busData);
  }

  return (
    <>
      <div ref={mapContainer} className="map-container" />
      <BusInformationPanel data={busData}/>
    </>
  )
}

export default Map

