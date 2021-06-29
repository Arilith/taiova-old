//* NPM MODULES *//
import React, { useEffect, useState } from "react";
import socketIOClient from "socket.io-client";

//* API MODULES *//
import { DataFetcher } from './components/api/datafetcher'
import { decodeBuffer } from './components/api/decoder'
import { convertToMapData, ConvertToMapDataNew } from './components/api/decoder';
import { CompanyNameFromArray } from './components/functions/CompanyConverter'

//* COMPONENTS *//
import { Map } from "./components/map/Map";
import { BusInformationPanel } from './components/layout/BusInformationPanel';
import { Search } from './components/search/Search';
import { FunctionButtons } from './components/layout/FunctionButtons';
import { MapNew } from "./components/map/MapNew";

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

  const [buffer, setBuffer] = useState();

  const [busses, setBusses] = useState();

  const url = window.location.href.includes("localhost")
        ? "wss://localhost:3002"
        : "wss://taiova.trvtserver.nl:3002";
  useEffect(() => {
    const fetchAPI = async () => setResponse(await new DataFetcher().FetchAllVehicles());
    fetchAPI()
  }, [])

  useEffect(() => {
    if(mapHasLoaded) {
      console.log("Connecting to socket")
      const socket = socketIOClient(url);
      socket.on("ovdata", data => {
        const decoded = decodeBuffer(data);
        setBuffer(decoded)
        
      });
    }
  }, [mapHasLoaded, url]); 

  useEffect(() => {
    if(buffer) {
      const cleanedResponse = response.filter( x => {
        return !buffer.some(t => t.v === x.v && t.c === x.c)
      })
  
      const newResponse = cleanedResponse.concat(buffer);
      setResponse(newResponse);
    }
    
  }, [buffer])

  useEffect(() => {
    if(clickedBusData) {
      const foundBus = response.find(bus => bus.v === clickedBusData.vehicleNumber && bus.c === clickedBusData.company);
      if(foundBus.p[0] !== updatedBus?.p[0] || foundBus.p[1] !== updatedBus?.p[1]) setUpdatedBus(foundBus)
    }     
  }, [response, clickedBusData, updatedBus]); // es

  useEffect(() => {
    if(response) {
      setBusses(ConvertToMapDataNew(response));
      //Todo: this is inefficient
      CompanyNameFromArray(Object.keys(convertToMapData(response)))
    }
  }, [response])

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
      <MapNew busses={busses} setMapLoaded={setMapHasLoaded} setClickedBusData={setClickedBusData} shape={shape} drivenShape={drivenShape} setCompanies={setCompanies} filter={filter} />
      {/* <Map busses={response} setMapLoaded={setMapHasLoaded} setClickedBusData={setClickedBusData} shape={shape} drivenShape={drivenShape} setCompanies={setCompanies} filter={filter} />  */}
      <Search setFilter={setFilter} companies={companies} />
      <div className="flex lg:flex-row flex-col-reverse p-1 mt-auto">
        <FunctionButtons />
        <BusInformationPanel open={informationPanelOpen} setInformationPanelOpen={setInformationPanelOpen} data={receivedBusData} />
      </div>
    </div>
  );
}
