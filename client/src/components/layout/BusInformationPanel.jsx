import { useState, useEffect } from 'react'
import { TimeConverter } from '../functions/DateConverter'
import { DataFetcher } from '../api/datafetcher'
import { FaWheelchair, FaChevronDown, FaChevronUp } from 'react-icons/fa';

import { TextColors } from './Colors'
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton'
import { CompanyName } from '../functions/CompanyConverter'
export const BusInformationPanel = (props) => {
   
  const [company, setCompany] = useState();
  const [time, setTime] = useState();

  const [routeData, setRouteData] = useState();
  const [tripData, setTripData] = useState();

  const [showExtra, setShowExtra] = useState(false);
  useEffect(() => {
      if(!props.data) ClearData();

      setCompany(props.data?.company)
      setTime(props.data?.updatedAt)
      

      const fetchTripData = async () => {
        if(props.data.currentTripId === 0) return;
        const api = new DataFetcher();
        setTripData(await api.FetchTrip(props.data.planningNumber, props.data.journeyNumber, props.data.originalCompany));
      }

      if(props.data) fetchTripData(props.data)
  }, [props.data])

  useEffect(() => {
    const fetchRouteData = async (trip) => {
      const api = new DataFetcher();
      setRouteData(await api.FetchRoute(trip.routeId));

    }
   if(tripData) fetchRouteData(tripData);
  }, [tripData])

  const ClearData = () => {
    setTripData();
    setRouteData();
    setTime();
    setCompany();
  }

  return (
    
      <div className={`flex flex-row ${!props.dark ? "bg-white-trans" : "bg-black-trans"} lg:min-w-25 md:max-w-xl backdrop-blur rounded-xl shadow-md overflow-hidden w-auto z-10 lg:ml-4 lg:mt-auto lg:fit-content ${ props.open ? "" : "hidden"} p-8`}>
        
        <div className="flex flex-col w-full">
          <div className="mr-8 flex flex-col">
            <span className="text-xl">Lijn { routeData ? <> {routeData?.routeShortName} - {routeData?.routeLongName} </> : <Skeleton width={300} />}</span>
            <span className="text-lg">richting <span className={` ${TextColors[company]} font-bold `}>{ tripData?.tripHeadsign || <Skeleton width={100} /> } {tripData?.tripName && `(${tripData.tripName})`}</span> </span>
          </div>
          <div className="flex flex-col w-full">
            <span className="flex flex-row text-gray-700">Vervoerder: { company ? <span className={`ml-2 font-bold ${TextColors[company]}`}> {CompanyName(company)} </span> : <Skeleton width={100} className="ml-2" count={1} /> } </span>
            <span className="flex flex-row text-gray-700">Laatste update: { time ? <span className={`ml-2 font-bold ${TextColors[company]}`}> {TimeConverter(time)} </span> : <Skeleton width={200} className="ml-2" count={1} /> } </span>
            <span onClick={() => setShowExtra(!showExtra)} className={`flex flex-row items-center ${TextColors[company]}`}>{ !showExtra ? <><FaChevronDown className="mr-2 mt-1" /> Toon meer  </>  : <><FaChevronUp className="mr-2 mt-1" /> Toon minder  </> }</span>
            {/* TODO: Fix roelstoeltoegankelijkheid voor RET? */}
            {tripData?.company !== "RET" && <span className="mt-12 flex items-center">{ tripData  ? <><FaWheelchair className="inline mr-2" />Dit voertuig is {!tripData.wheelchairAccessible && <b>&nbsp;niet&nbsp;</b>} toegankelijk voor rolstoelen.  </> : <Skeleton /> } </span>}
          </div>
        </div>
        <span onClick={() => props.setInformationPanelOpen(false)} className={`ml-auto hover:underline ${props.dark && "text-white"}`}>X</span>
      </div>
 
  )
}


