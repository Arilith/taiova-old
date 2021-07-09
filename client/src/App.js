//* NPM MODULES *//
import React, { useEffect, useState } from "react";
import socketIOClient from "socket.io-client";

//* API MODULES *//
import { DataFetcher } from './components/api/datafetcher'
import { decodeBuffer } from './components/api/decoder'

//* COMPONENTS *//
import { Map } from "./components/map/Map";
import { BusInformationPanel } from './components/layout/BusInformationPanel';
import { Search } from './components/search/Search';
import { FunctionButtons } from './components/layout/FunctionButtons';
import { SettingsPanel } from "./components/layout/SettingsPanel";

export default function App() {

  const [response, setResponse] = useState([])

  const [mapHasLoaded, setMapHasLoaded] = useState(false);
  
  const [companies, setCompanies] = useState([]);

  const [shape, setShape] = useState([]);
  const [drivenShape, setDrivenShape] = useState([]);

  const [filter, setFilter] = useState({});

  const [clickedBusData, setClickedBusData] = useState();
  const [updatedBus, setUpdatedBus] = useState();

  const [receivedBusData, setReceivedBusData] = useState();
  const [informationPanelOpen, setInformationPanelOpen] = useState(false);

  const [socket, setSocket] = useState(false)

  const [settingsOpen, setSettingsOpen] = useState(false);

  const url = window.location.href.includes("localhost")
        ? "wss://localhost:3002"
        : "wss://taiova.trvtserver.nl:3002";

  const updateSpeed = localStorage.getItem('update_speed') || "fast";

  useEffect(() => {
    
    const fetchAPI = async () => setResponse(await new DataFetcher().FetchAllVehicles());
    fetchAPI()
  }, [])

  useEffect(() => {
    if(!mapHasLoaded) return;
    console.log("Connecting to websocket.")
    if(!socket) setSocket(socketIOClient(url));
    
  }, [mapHasLoaded, url, socket]); // eslint-disable-line

  useEffect(() => {
    if(socket) ConnectToSocket(updateSpeed)
  }, [socket])

  const ConnectToSocket = room => {
    socket.disconnect();
    console.log(`Disconnecting from current socket.`)
    const newSocket = socketIOClient(url);
    newSocket.on('connect',() => {
      console.log(`Connected to new socket with speed ${room}`)
      newSocket.emit('room', room)
      newSocket.on("ovdata", data => {
        setResponse(decodeBuffer(data))
      });

    })
  }

  useEffect(() => {
    if(clickedBusData) {
      const foundBus = response.find(bus => bus.v === clickedBusData.vehicleNumber && bus.c === clickedBusData.company);
      if(foundBus?.p[0] !== updatedBus?.p[0] || foundBus?.p[1] !== updatedBus?.p[1]) setUpdatedBus(foundBus)
    }     
  }, [response, clickedBusData, updatedBus]); // es

  useEffect(() => {
    const fetchUpdatedBusData = async () => {
      const fetchBusData = async bus => await new DataFetcher().FetchVehicle(bus.c, bus.v);
      setReceivedBusData(await fetchBusData(updatedBus))
    }
    if(updatedBus && receivedBusData) fetchUpdatedBusData();
  }, [updatedBus])
  useEffect(() => {
    const fetchBusData = async () => {

      if(clickedBusData) {
        setInformationPanelOpen(true);
        setReceivedBusData()
        const fetchBusData = async bus => await new DataFetcher().FetchVehicle(bus.company, bus.vehicleNumber);
        setReceivedBusData(await fetchBusData(clickedBusData))  
      } 
    }
    fetchBusData(); 
  }, [clickedBusData])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Map busses={response} setMapLoaded={setMapHasLoaded} setClickedBusData={setClickedBusData} shape={shape} drivenShape={drivenShape} setCompanies={setCompanies} filter={filter} /> 
      <Search setFilter={setFilter} companies={companies} />
      <div className={`overlay h-full w-full fixed z-10 bg-black bg-opacity-50 ${!settingsOpen && 'hidden'}`} />
      <div className="flex lg:flex-row flex-col-reverse p-1 mt-auto">
        <FunctionButtons settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen} />
        <BusInformationPanel open={informationPanelOpen} setInformationPanelOpen={setInformationPanelOpen} data={receivedBusData} />
        <SettingsPanel connectToSocket={ConnectToSocket} open={settingsOpen} setSettingsPanelOpen={setSettingsOpen} />
      </div>
      
    </div>
  );
}
