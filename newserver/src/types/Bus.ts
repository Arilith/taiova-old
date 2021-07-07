export interface Bus {
  company: string,
  originalCompany: string,
  planningNumber: string,
  journeyNumber: number,
  timestamp: number,
  vehicleNumber: number,
  position: [number, number],
  status: BusState,
  createdAt: number,
  updatedAt: number,
  routeId: number,
  tripId: number,
  lineNumber : string,
  userStopCode?: string,
  passageSequenceNumber?: string
}

export enum BusState {
  ONROUTE = 'ONROUTE',
  OFFROUTE = 'OFFROUTE',
  END = "END",
  DEPARTURE = 'DEPARTURE',
  INIT = 'INIT',
  DELAY = 'DELAY',
  ONSTOP = 'ONSTOP',
  ARRIVAL = 'ARRIVAL'
}