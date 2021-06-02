import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken =
  "pk.eyJ1IjoiYXJpbGl0aCIsImEiOiJja29xODZiMHcwMjVjMnZvaHI5bGh3bjJ6In0.ZTVaklGwPP-wm9gNyfi6tA";

export default function Map({ data }) {
  const response = data;
  const mapContainer = useRef(null);
  let map = useRef(null);
  const [lng, setLng] = useState(4.966336589911254);
  const [lat, setLat] = useState(51.952161496430836);
  const [zoom, setZoom] = useState(9);

  const [mapDataFeatures, setMapDataFeatures] = useState({
    ARR: [],
    CXX: [],
    EBS: [],
    KEOLIS: [],
    QBUZZ: [],
    RET: [],
    HTM: [],
    DELIJN: [],
    TEC: [],
  });

  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/arilith/ckoqabais7zs618pl77d73zaw",
      center: [lng, lat],
      zoom: zoom,
    });

    if (!map.current) return; // wait for map to initialize
    map.current.on("move", () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });

    map.current.on("load", function () {
      Object.keys(mapDataFeatures).forEach((key) => {
        map.current.loadImage(`images/${key}.png`, function (error, image) {
          if (error) throw error;
          map.current.addImage(`${key}-marker`, image);
          map.current.addSource(`${key}points`, {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: mapDataFeatures.ARR,
            },
          });
          map.current.addLayer({
            id: `${key}points`,
            type: "symbol",
            source: `${key}points`,
            layout: {
              "icon-image": `${key}-marker`,
              "icon-rotation-alignment": "viewport",
              "icon-size": [
                "interpolate",
                ["exponential", 1],
                ["zoom"],
                10,
                1,
                15,
                0.75,
                21,
                0.5,
              ],
              "text-field": "{title}",
              "text-allow-overlap": true,
              "icon-allow-overlap": true,
              "text-line-height": 0.9,
              "text-padding": [
                "interpolate",
                ["exponential", 9],
                ["zoom"],
                1,
                2,
                3,
                4,
              ],
              "text-offset": [0, 0.4],
              "icon-offset": [0, -40.6],
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
              "text-size": [
                "interpolate",
                ["exponential", 8],
                ["zoom"],
                10,
                10,
                21,
                14,
              ],
              "text-max-width": Infinity,
              "icon-ignore-placement": true,
              "text-rotation-alignment": "viewport",
            },
            paint: {
              "text-color": "#FFF",
              "text-halo-color": "#00318f",
              "text-halo-width": 0,
              "icon-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                0.5,
                1,
              ],
              "text-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                0.5,
                0,
              ],
            },
          });
        });
      });

      // Insert the layer beneath any symbol layer.
      var layers = map.current.getStyle().layers;
      var labelLayerId;
      for (var i = 0; i < layers.length; i++) {
        if (layers[i].type === "symbol" && layers[i].layout["text-field"]) {
          labelLayerId = layers[i].id;
          break;
        }
      }

      // The 'building' layer in the Mapbox Streets
      // vector tileset contains building height data
      // from OpenStreetMap.
      map.current.addLayer(
        {
          id: "add-3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 15,
          paint: {
            "fill-extrusion-color": "#aaa",

            // Use an 'interpolate' expression to
            // add a smooth transition effect to
            // the buildings as the user zooms in.
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["get", "height"],
            ],
            "fill-extrusion-base": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["get", "min_height"],
            ],
            "fill-extrusion-opacity": 0.6,
          },
        },

        labelLayerId
      );
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const convertDataToCoordinates = () => {
      const returnData = {
        ARR: [],
        CXX: [],
        EBS: [],
        KEOLIS: [],
        QBUZZ: [],
        RET: [],
        HTM: [],
        DELIJN: [],
        TEC: [],
      };
      response &&
        response.forEach((vehicleData) => {
          if (vehicleData.type === "END") return;
          if (vehicleData.vehicleData.position === "0, 0") return;
          const positionXY = vehicleData.vehicleData.position.split(", ");
          const coordinates = [positionXY[0], positionXY[1]];
          const company = vehicleData.vehicleData.company;
          returnData[company].push({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: coordinates,
            },
            properties: {
              title: vehicleData.vehicleId,
            },
          });
        });

      return returnData;
    };

    setMapDataFeatures(convertDataToCoordinates());

    Object.keys(mapDataFeatures).forEach((key) => {
      if (map.current.getSource(`${key}points`)) {
        map.current.getSource(`${key}points`).setData({
          type: "FeatureCollection",
          features: mapDataFeatures[key],
        });
      }
    });
  }, [response]);

  return (
    <>
      {/* <div className="sidebar">
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div> */}
      <div ref={mapContainer} className="map-container" />
    </>
  );
}
