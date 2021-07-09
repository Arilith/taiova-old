import { Bus, BusState } from "../../types/Bus"

export interface DatabaseBus {
  id?: number,
  company: string,
  originalCompany: string,
  planningNumber: string,
  journeyNumber: number,
  timestamp: number,
  vehicleNumber: number,
  lat: number,
  long: number,
  status: BusState,
  createdAt: number,
  updatedAt: number,
  routeId: number,
  tripId: number,
  lineNumber: string,
  userStopCode?: string,
  passageSequenceNumber?: string
}


// export const MapBus = (databaseBus : DatabaseBus) : Bus => {

//   return null;

// }

// export const MapBusses = (databaseBusses : Array<DatabaseBus>) : Array<DatabaseBus> => {

//   return null;
  
// }