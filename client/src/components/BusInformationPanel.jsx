import { useState, useEffect } from 'react'
import Chart from 'react-apexcharts'
import { timeConverter } from '../components/functions/DateConverter'
import { MapDataFetcher } from '../components/api/fetchmapdata'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/outline'

const BusInformationPanel = (props) => {
  const [open, setOpen] = useState(false)
  const [showExtraData, setShowExtraData] = useState(true);

  const [busData, setBusData] = useState();
  
  const [extraData, setExtraData] = useState();

  const [punctualityChart, setPunctualityChart] = useState({
    options: {
      chart: {
        id: 'punctuality'
      },
      xaxis: {
        categories: []
      },
      stroke: {
        curve: 'smooth',
      }
    },
    series: [{
      name: 'Punctualiteit',
      data: []
    }]
  })

  const api = new MapDataFetcher();

  const closePanel = () => {
    setOpen(false);
    props.setShape([])
  }

  useEffect(() => {
    setOpen(true);
    setBusData(
      {...props.data, 
        position: JSON.parse(props.data.position),
      });

    const fetchData = async() => {
      const receivedVehicleData = await api.FetchVehicle(props.data.company, props.data.vehicleNumber);
      const receivedTripData = await api.FetchTrip(props.data.planningNumber, props.data.journeyNumber, props.data.originalCompany);
      let receivedRouteData; 
      let receivedShapeData;
      if(Object.keys(receivedTripData).length != 0) {
        receivedRouteData = await api.FetchRoute(receivedTripData.routeId);
        receivedShapeData = await api.FetchShape(receivedTripData.shapeId);
      }
        

        
       

      setExtraData({busData : {...receivedVehicleData}, tripData : {...receivedTripData}, routeData : {...receivedRouteData}, shapeData : receivedShapeData});
    }

    fetchData();
  }, [props.data])

  useEffect(() => {
    extraData
     && setPunctualityChart({
      options: {
        chart: {
          id: 'punctuality'
        },
        xaxis: {
          categories: extraData?.busData?.updatedTimes.map(time => {
            return timeConverter(time)
          })
        },
        stroke: {
          curve: 'smooth',
        }
      },
      series: [{
        name: 'Punctualiteit',
        data: extraData?.busData?.punctuality
      }]
    })

    extraData && extraData.shapeData && props.setShape(extraData.shapeData.positionsOnly);
  }, [extraData])

  const colors = {
    ARR: "blue-400",
    QBUZZ: "red-300",
    CXX: "green-300",
    RET: "red-500",
    EBS: "green-500",
    KEOLIS: "blue-500",
    DELIJN: "blue-500",
    SYNTUS: "red-500",
    GVB: "blue-500",
    TEC: "blue-500",
    BRAVO: "purple-500",
    TWENTS: "red-500",
    WATERBUS: "blue-500",
    BRENG: "pink-500",
    UOV : "red-300",
    HTM : "red-500",
    OVERAL : "green-600",
    ALLGO : "blue-300",
    OVREGIOY: "blue-500"
  }



  return (
    <>{busData && 
      // {`relative bg-white rounded-xl shadow-md overflow-hidden md:max-w-xl sm:max-w-xs sm:max-h-xs h-xl z-10 mr-1 ml-auto mt-auto mb-auto ${ open ? "mr-1" : "mr-outside"}`}
      <div className={`relative ${!props.dark ? "bg-white-trans" : "bg-black-trans"} backdrop-blur rounded-xl shadow-md overflow-hidden w-auto z-10 lg:ml-4   ${ open ? "" : "hidden"}`}>
        <div className=" p-8">
          <div onClick={e => closePanel()} className={`float-right hover:underline ${props.dark && "text-white"}`}>
            X
          </div>
          {extraData && Object.keys(extraData.routeData).length > 0 &&
          <>
            <div className={`uppercase tracking-wide text-lg text-${colors[busData.company]} font-semibold`}>Lijn {extraData.routeData.routeShortName}</div>
            <span className={`block mt-1 text-lg leading-tight font-medium ${props.dark && "text-white"} hover:underline`}>{extraData.routeData.routeLongName}</span>
            <span onClick={() => setShowExtraData(!showExtraData)} className={`block mt-1 text-lg leading-tight font-medium text-${colors[busData.company]} hover:underline`}>
              Show {!showExtraData ? "More"  : "Less" }{!showExtraData ? <ChevronDownIcon className="ml-1 h-4 inline"/> : <ChevronUpIcon className="ml-1 h-4 inline"/>}
            </span>
          </>
          }
          {extraData && Object.keys(extraData.routeData).length === 0 &&  <div className={`tracking-wide text-lg text-${colors[busData.company]} font-semibold`}>Er is geen extra data beschikbaar voor dit voertuig.</div>}
          
          <div className={`mt-2  ${props.dark ? "text-white" : "text-gray-500"} ${!showExtraData && "hidden" }`}>
            <ul className="list-none">
              <li>Voertuignummer <span className={`text-${colors[busData.company]}`}>{busData.vehicleNumber}</span></li>
              <li>Planningnummer <span className={`text-${colors[busData.company]}`}>{busData.planningNumber}</span></li>
              <li>Ritnummer <span className={`text-${colors[busData.company]}`}>{busData.journeyNumber}</span></li>
              <li>Status <span className={`text-${colors[busData.company]}`}>{busData.status}</span></li>
              <li>Laatst geupdated <span className={`text-${colors[busData.company]}`}>{timeConverter(busData.updatedAt)}</span></li>
              {extraData && Object.keys(extraData.routeData).length > 0 &&
              <>
                <li>Rolstoelbereikbaar <span className={`text-${colors[busData.company]}`}>{extraData.tripData.wheelchairAccessible === 1 ? "Ja" : "Nee"}</span></li>
                <li>Text op bus <span className={`text-${colors[busData.company]}`}>{extraData.tripData.tripHeadsign}</span></li>
                <li>Subcompany <span className={`text-${colors[busData.company]}`}>{extraData.routeData.company}</span></li>
              
              </>
              }
              <span>Punctualiteiten</span>
            </ul>
            { extraData && <Chart className="hidden" options={punctualityChart.options} series={punctualityChart.series} type="line" width={500} height={320} /> }
          </div>
        </div>
      </div>
      }
    </>
  )
}

export default BusInformationPanel
