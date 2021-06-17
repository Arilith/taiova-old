import React, { useEffect, useState } from "react";
import { MapDataFetcher } from './components/api/fetchmapdata'
import Map from "./components/Map";
import { io } from "socket.io-client";

export default function App() {

  const [response, setResponse] = useState([])

  const [mapHasLoaded, setMapHasLoaded] = useState(false);
  
  useEffect(() => {
    const DataFetcher = new MapDataFetcher();
    async function fetchAPI() {
      let response = await DataFetcher.FetchAllVehicles();
      setResponse(response);
    }

    fetchAPI()
  }, [])


  useEffect(() => {
    console.log("Connecting to websocket...");
    const url = window.location.href.includes("localhost")
      ? "wss://localhost:3002"
      : "wss://taiova.trvtserver.nl:3002";
    const socket = io(url);
    socket.on("connect", () => {
      socket.on("ovdata", (data) => {
        if(response !== [] && mapHasLoaded)
          setResponse(data);
      });
    });
  }, [mapHasLoaded]);


  return (
    <div className="h-screen flex flex-col">
      { <Map data={response !== undefined && response} setMapLoaded={setMapHasLoaded} /> }
    </div>
  );
}
