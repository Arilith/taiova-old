import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Map from "./components/map";

export default function App() {
  const [response, setResponse] = useState();
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

  useEffect(() => {}, [response]);

  return (
    <div>
      <Map data={response !== undefined && response} />
    </div>
  );
}
