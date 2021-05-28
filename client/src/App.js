import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import Map from "./components/map";

export default function App() {
  const [response, setResponse] = useState();
  useEffect(() => {
    console.log("Connecting to websocket...");
    const socket = io("wss://taiova.trvtserver.nl:3001");
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
