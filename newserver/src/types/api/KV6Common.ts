export interface Types {
  DELAY : DELAY,
  INIT : INIT,
  ARRIVAL: ARRIVAL,
  ONSTOP: ONSTOP,
  DEPARTURE: DEPARTURE,
  ONROUTE: ONROUTE,
  OFFROUTE: OFFROUTE,
  END: END

}

export interface DELAY {
  dataownercode : string,
  lineplanningnumber : string | number,
  operatingday : string,
  journeynumber : number,
  reinforcementnumber : number,
  timestamp : string,
  source : string,
  punctuality : number
}

export interface INIT {
  dataownercode : string,
  lineplanningnumber : string | number,
  operatingdate : string,
  journeynumber : number,
  reinforcementnumber : number,
  timestamp : string,
  source : string,
  userstopcode : number | string,
  passagesequencenumber: number,
  vehiclenumber: number,
  blockcode : string,
  wheelchairAccessible : number,
  numberofcoaches : number
}

export interface ARRIVAL {
  dataownercode : string,
  lineplanningnumber : string | number,
  operatingday : string,
  journeynumber : number,
  reinforcementnumber : number,
  userstopcode : number | string,
  passagesequencenumber: number,
  timestamp : string,
  source : string,
  vehiclenumber: number,
  punctuality : number
}
export interface ONSTOP {
  dataownercode : string,
  lineplanningnumber : string | number,
  operatingday : string,
  journeynumber : number,
  reinforcementnumber : number,
  userstopcode : number | string,
  passagesequencenumber: number,
  timestamp : string,
  source : string,
  vehiclenumber: number,
  punctuality : number
}

export interface DEPARTURE {
  dataownercode : string,
  lineplanningnumber : string | number,
  operatingday : string,
  journeynumber : number,
  reinforcementnumber : number,
  userstopcode : number | string,
  passagesequencenumber: number,
  timestamp : string,
  source : string,
  vehiclenumber: number,
  punctuality : number
}

export interface ONROUTE {
  dataownercode : string,
  lineplanningnumber : string | number,
  operatingday : string,
  journeynumber : number,
  reinforcementnumber : number,
  userstopcode : number | string,
  passagesequencenumber: number,
  timestamp : string,
  source : string,
  punctuality : number,
  vehiclenumber : number,
  distancesincelastuserstop: number,
  "rd-x" : number,
  "rd-y" : number
}

export interface OFFROUTE {
  dataownercode : string,
  lineplanningnumber : string | number,
  operatingday : string,
  journeynumber : number,
  reinforcementnumber : number,
  timestamp : string,
  source : string,
  userstopcode : number | string,
  passagesequencenumber: number,
  vehiclenumber : number,
  "rd-x" : number,
  "rd-y" : number
}



export interface END {
  dataownercode : string,
  lineplanningnumber : string | number,
  operatingday : string,
  journeynumber : number,
  reinforcementnumber : number,
  timestamp : string,
  source : string,
  userstopcode : number | string,
  passagesequencenumber: number,
  vehiclenumber : number,
}