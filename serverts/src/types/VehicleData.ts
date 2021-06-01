export enum vehicleState {
  ONROUTE = 'ONROUTE',
  ENDED = 'ENDED',
  DEPARTURE = 'DEPARTURE'
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
  updatedAt: number
}
