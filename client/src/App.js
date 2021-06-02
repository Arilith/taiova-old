import React, { useEffect, useState } from "react";
import { MapDataFetcher } from './components/api/fetchmapdata'
import Map from "./components/Map";

export default function App() {

  const [response, setResponse] = useState([])

  
  useEffect(() => {
    const dataURL = window.location.href.includes("localhost")
      ? "https://localhost:3001"
      : "https://taiova.trvtserver.nl:3001";
    const DataFetcher = new MapDataFetcher(dataURL);
    async function fetchAPI() {
      let response = await DataFetcher.FetchAllVehicles();
      setResponse(response);
    }

    fetchAPI()
  }, [])


  // useEffect(() => {
  //   console.log("Connecting to websocket...");
  //   const url = window.location.href.includes("localhost")
  //     ? "wss://localhost:3001"
  //     : "wss://taiova.trvtserver.nl:3001";
  //   const socket = io(url);
  //   socket.on("connect", () => {
  //     socket.on("ovdata", (data) => {
  //       setResponse(data);
  //     });
  //   });
  // }, []);




  return (
    <div>
      { <Map data={response !== undefined && response} /> }
    </div>
  );
}
