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
  punctuality: Array<number>,
  updatedTimes: Array<number>,
  currentRouteId: number,
  currentTripId: number
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