import { vehicleState } from './VehicleData'

export interface VehicleDataViewModel {
  company: string,
  planningNumber: string,
  journeyNumber: number,
  timestamp: number,
  vehicleNumber: number,
  position: [number, number],
  status: vehicleState,
  createdAt: number,
  updatedAt: number,
  punctuality: Array<number>
}
