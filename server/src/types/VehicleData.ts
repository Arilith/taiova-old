export enum vehicleState {
  ONROUTE = 'ONROUTE',
  ENDED = 'ENDED',
  DEPARTURE = 'DEPARTURE',
  INIT = 'INIT',
  DELAY = 'DELAY',
  ONSTOP = 'ONSTOP',
  ARRIVAL = 'ARRIVAL'
}

export interface VehicleData {
  company: string,
  planningNumber: string,
  journeyNumber: number,
  timestamp: number,
  vehicleNumber: number,
  position: [number, number],
  status: vehicleState,
  createdAt: number,
  updatedAt: number,
  punctuality: Array<number>,
  updatedTimes: Array<number>
}
