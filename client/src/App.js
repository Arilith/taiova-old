//* NPM MODULES *//
import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

//* API MODULES *//
import { DataFetcher } from './components/api/datafetcher'
import { decodeBuffer } from './components/api/decoder'

//* COMPONENTS *//
import { Map } from "./components/map/Map";
import { BusInformationPanel } from './components/layout/BusInformationPanel';
import { Search } from './components/search/Search';
import { FunctionButtons } from './components/layout/FunctionButtons';

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

  useEffect(() => {
    const fetchAPI = async () => setResponse(await new DataFetcher().FetchAllVehicles());
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
  }, [mapHasLoaded]); // eslint-disable-line

  useEffect(() => {
    if(clickedBusData) {
      const foundBus = response.find(bus => bus.v === clickedBusData.vehicleNumber && bus.c === clickedBusData.company);
      if(foundBus.p[0] !== updatedBus?.p[0] || foundBus.p[1] !== updatedBus?.p[1]) setUpdatedBus(foundBus)
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
    <div className="h-screen flex flex-col">
      <Map busses={response} setMapLoaded={setMapHasLoaded} setClickedBusData={setClickedBusData} shape={shape} drivenShape={drivenShape} setCompanies={setCompanies} filter={filter} /> 
      <Search setFilter={setFilter} companies={companies} />
      <div className="flex lg:flex-row flex-col-reverse p-1 mt-auto">
        <FunctionButtons />
        <BusInformationPanel open={informationPanelOpen} setInformationPanelOpen={setInformationPanelOpen} data={receivedBusData} />
      </div>
    </div>
  );
}
