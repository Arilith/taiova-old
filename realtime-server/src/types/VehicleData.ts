export enum vehicleState {
  ONROUTE = 'ONROUTE',
  OFFROUTE = 'OFFROUTE',
  END = "END",
  DEPARTURE = 'DEPARTURE',
  INIT = 'INIT',
  DELAY = 'DELAY',
  ONSTOP = 'ONSTOP',
  ARRIVAL = 'ARRIVAL'
}

export interface VehicleData {
  company: string,
  originalCompany: string,
  planningNumber: string,
  journeyNumber: number,
  lineNumber : string,
  timestamp: number,
  vehicleNumber: number,
  position: [number, number],
  status: vehicleState,
  createdAt: number,
  updatedAt: number,
  punctuality: Array<number>,
  updatedTimes: Array<number>,
  currentRouteId: number,
  currentTripId: number
}
