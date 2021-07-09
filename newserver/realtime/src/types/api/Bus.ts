export interface RouteTypesArray {
  ONROUTE : Array<ApiBusPos>,
  DEPARTURE : Array<ApiBusPos>,
  ONSTOP : Array<ApiBusPos>,
  ARRIVAL : Array<ApiBusPos>,
  END : Array<ApiBusPos>,
  INIT : Array<ApiBusPos>,
  DELAY : Array<ApiBusPos>
}

export interface RouteTypesSingle {
  ONROUTE : ApiBusPos,
  DEPARTURE : ApiBusPos,
  ONSTOP : ApiBusPos,
  ARRIVAL : ApiBusPos,
  END : ApiBusPos,
  INIT : ApiBusPos,
  DELAY : ApiBusPos
}
export interface ApiBus {
  VV_TM_PUSH: {
    SubscriberID : string,
    Version: string,
    DossierName: string,
    Timestamp: string,
    KV6posinfo: RouteTypesArray
  }
}

export interface ApiBusKeolis {
  VV_TM_PUSH: {
    SubscriberID : string,
    Version: string,
    DossierName: string,
    Timestamp: string,
    KV6posinfo: Array<RouteTypesSingle> //| RouteTypesSingle
  }
}


export interface ApiBusPos {
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
