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
          setResponse(decodeBuffer(data))
      });
    });
  }, [mapHasLoaded]);

  const decodeBuffer = buffer => {
    buffer = Buffer.from(buffer);

    const vehicles = [];

    for(let i = 0; i < (buffer.byteLength / 27); i++) {
      const x = buffer.readFloatBE(i * 27)
      const y =buffer.readFloatBE(i * 27 + 4)
      const v = buffer.readUInt32BE(i * 27 + 4 + 4)
      const combined = buffer.slice(i * 27 + 4 + 4 + 4, i * 27 + 4 + 4 + 4 + 15).toString().split('\u0000')[0];
      const c = combined.split("|")[0];
      const n = combined.split("|")[1];
      vehicles.push({
        p: [x, y],
        c: c,
        v: v,
        n : n
      })
    }

    return vehicles;
  }


  return (
    <div className="h-screen flex flex-col">
      { <Map data={response !== undefined && response} setMapLoaded={setMapHasLoaded} /> }
    </div>
  );
}
