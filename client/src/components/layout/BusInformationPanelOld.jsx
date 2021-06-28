const [open, setOpen] = useState(false)
  const [showExtraData, setShowExtraData] = useState(true);

  const [busData, setBusData] = useState();
  
  const api = new DataFetcher();

  const closePanel = () => {
    setOpen(false);
    resetData();
  }

  const resetData = () => {
    props.setShape([]);
    props.setDrivenShape([]);
    setBusData([]);
  }

  useEffect(() => {
    setOpen(true);
    setBusData({...props.data});

    const fetchData = async() => {
      const receivedVehicleData = await api.FetchVehicle(props.data.company, props.data.vehicleNumber);
      const receivedTripData = await api.FetchTrip(receivedVehicleData.planningNumber, receivedVehicleData.journeyNumber, receivedVehicleData.originalCompany);
      let receivedRouteData; 
      let receivedShapeData;
      let receivedDrivenShapeData;
      if(Object.keys(receivedTripData).length !== 0) {
        receivedRouteData = await api.FetchRoute(receivedTripData.routeId);
        receivedShapeData = await api.FetchShape(receivedTripData.shapeId);
        receivedDrivenShapeData = await api.FetchDrivenShape(receivedVehicleData.originalCompany, receivedTripData.tripId);
      }
      setBusData({busData : {...receivedVehicleData}, tripData : {...receivedTripData}, routeData : {...receivedRouteData}, shapeData : receivedShapeData, drivenShapeData : receivedDrivenShapeData});
    }

    fetchData();
  }, [props.data])

  useEffect(() => {

  }, [props.open])

  useEffect(() => {
    if(busData) {
      if(busData.shapeData) props.setShape(busData.shapeData.positionsOnly)
      if(busData.drivenShapeData) props.setDrivenShape(busData.drivenShapeData)
    }
  }, [busData])

  



  return (
    <>{busData && 
      <div className={`relative ${!props.dark ? "bg-white-trans" : "bg-black-trans"} backdrop-blur rounded-xl shadow-md overflow-hidden w-auto z-10 lg:ml-4 lg:mt-auto lg:fit-content ${ props.open ? "" : "hidden"}`}>
        <div className=" p-8">
          <div onClick={e => closePanel()} className={`float-right hover:underline ${props.dark && "text-white"}`}>
            X
          </div>
          {busData && Object.keys(busData.routeData).length > 0 &&
          <>
            <div className={`uppercase tracking-wide text-lg ${colors[busData.company]} font-semibold`}>Lijn {busData.routeData.routeShortName}</div>
            <span className={`block mt-1 text-lg leading-tight font-medium ${props.dark && "text-white"} hover:underline`}>{busData.routeData.routeLongName}</span>
            <span onClick={() => setShowExtraData(!showExtraData)} className={`block mt-1 text-lg leading-tight font-medium ${colors[busData.company]} hover:underline`}>
              Show {!showExtraData ? "More"  : "Less" }{!showExtraData ? <ChevronDownIcon className="ml-1 h-4 inline"/> : <ChevronUpIcon className="ml-1 h-4 inline"/>}
            </span>
          </>
          }
          {busData && Object.keys(busData.routeData).length === 0 &&  <div className={`tracking-wide text-lg ${colors[busData.company]} font-semibold`}>Er is geen extra data beschikbaar voor dit voertuig.</div>}
          
          <div className={`mt-2  ${props.dark ? "text-white" : "text-gray-500"} ${!showExtraData && "hidden" }`}>
            <ul className="list-none">
              <li>Voertuignummer <span className={colors[busData.company]}>{busData.vehicleNumber}</span></li>
              <li>Planningnummer <span className={colors[busData.company]}>{busData.planningNumber}</span></li>
              <li>Ritnummer <span className={colors[busData.company]}>{busData.journeyNumber}</span></li>
              <li>Status <span className={colors[busData.company]}>{busData.status}</span></li>
              <li>Laatst geupdated <span className={colors[busData.company]}>{timeConverter(busData.updatedAt)}</span></li>
              {busData && Object.keys(busData.routeData).length > 0 &&
              <>
                <li>Rolstoelbereikbaar <span className={colors[busData.company]}>{busData.tripData.wheelchairAccessible === 1 ? "Ja" : "Nee"}</span></li>
                <li>Text op bus <span className={colors[busData.company]}>{busData.tripData.tripHeadsign}</span></li>
                <li>Subcompany <span className={colors[busData.company]}>{busData.routeData.company}</span></li>
              
              </>
              }
              <span>Punctualiteiten</span>
            </ul>
            {/* { busData && <Chart className="hidden" options={punctualityChart.options} series={punctualityChart.series} type="line" width={500} height={320} /> } */}
          </div>
        </div>
      </div>
      }
    </>
  )