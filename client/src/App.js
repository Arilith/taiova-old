import React, { useEffect, useState } from "react";
import { MapDataFetcher } from './components/api/fetchmapdata'
import Map from "./components/Map";
import { io } from "socket.io-client";

export default function App() {

  const [response, setResponse] = useState([])

  
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
      ? "wss://localhost:3001"
      : "wss://taiova.trvtserver.nl:3001";
    const socket = io(url);
    socket.on("connect", () => {
      socket.on("ovdata", (data) => {
        setResponse(data);
      });
    });
  }, []);


  return (
    <div className="h-screen flex">
      { <Map data={response !== undefined && response} /> }
    </div>
  );
}
