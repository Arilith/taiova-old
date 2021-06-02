export interface VehicleApiData {
  VV_TM_PUSH: {
    SubscriberID : string,
    Version: string,
    DossierName: string,
    Timestamp: string,
    KV6posinfo: {
      ONROUTE : Array<VehiclePosData>,
      DEPARTURE : Array<VehiclePosData>,
      ONSTOP : Array<VehiclePosData>,
      ARRIVAL : Array<VehiclePosData>,
      END : Array<VehiclePosData>,
      INIT : Array<VehiclePosData>,
      DELAY : Array<VehiclePosData>
    }
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
