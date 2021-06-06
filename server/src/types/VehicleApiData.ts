export interface RouteTypesArray {
  ONROUTE : Array<VehiclePosData>,
  DEPARTURE : Array<VehiclePosData>,
  ONSTOP : Array<VehiclePosData>,
  ARRIVAL : Array<VehiclePosData>,
  END : Array<VehiclePosData>,
  ENDED : Array<VehiclePosData>,
  INIT : Array<VehiclePosData>,
  DELAY : Array<VehiclePosData>
}

export interface RouteTypesSingle {
  ONROUTE : VehiclePosData,
  DEPARTURE : VehiclePosData,
  ONSTOP : VehiclePosData,
  ARRIVAL : VehiclePosData,
  END : VehiclePosData,
  ENDED : VehiclePosData,
  INIT : VehiclePosData,
  DELAY : VehiclePosData
}
export interface VehicleApiData {
  VV_TM_PUSH: {
    SubscriberID : string,
    Version: string,
    DossierName: string,
    Timestamp: string,
    KV6posinfo: RouteTypesArray
  }
}

export interface VehicleApiDataKeolis {
  VV_TM_PUSH: {
    SubscriberID : string,
    Version: string,
    DossierName: string,
    Timestamp: string,
    KV6posinfo: Array<RouteTypesSingle> //| RouteTypesSingle
  }
}


export interface VehiclePosData {
  dataownercode: string,
  lineplanningnumber: string,
  operatingday: string,
  journeynumber: number,
  reinforcementnumber: number,
  userstopcode: number,
  passagesequencenumber: number,
  timestamp: string,
  source: string,
  vehiclenumber: number,
  punctuality: number,
  "rd-x": number,
  "rd-y": number
}
