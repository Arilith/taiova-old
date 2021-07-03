import { Bus, BusState } from '../types/Bus'
import { ApiBus, ApiBusKeolis, ApiBusPos  } from '../types/api/Bus'
import { Companies } from '../types/Companies';
import { KV6Generic } from '../types/api/KV6Arriva';
import { DELAY, INIT, ONROUTE, Types } from '../types/api/KV6Common';
export class Converter {

  decode(data : any, operator : string) : any {
    const company = this.CheckCompany(operator);

    switch (company) {
      case Companies.ARR:
        return this.DecodeMain(data);
      case Companies.CXX:
        return this.DecodeMain(data);
      case Companies.EBS:
        return this.DecodeMain(data);
      case Companies.QBUZZ:
        return this.DecodeMain(data);
      case Companies.RIG:
        return this.DecodeMain(data);
      case Companies.OPENOV:
        return this.DecodeMain(data);
      case Companies.DITP:
        return this.DecodeMain(data);
      case Companies.KEOLIS:
        return this.DecodeOther(data);
      case Companies.GVB:
        return this.DecodeOther(data);
      default:
        console.error(`Company ${company} unknown.`)
        break;
    }

  } 

  /** 
  * This is the main decoding function. It works for Arriva, Connexxion, EBS, QBUZZ, RIG (RET), OPENOV, DITP
  * @param data The required data. It should be of type "KV6Generic", which works for the companies mentioned above.
  * @returns An array with the converted vehicledata.
  */
  DecodeMain (data : KV6Generic) : Array<Bus> {
    const returnData : Array<Bus> = [];

    if(data.VV_TM_PUSH.KV6posinfo) {
      const kv6posinfo = data.VV_TM_PUSH.KV6posinfo;
      if(Object.keys(kv6posinfo).length > 0)
        Object.keys(kv6posinfo).forEach(VehicleStatusCode => {
          
          if(Array.isArray(kv6posinfo[VehicleStatusCode])) {
            for(const vehicleData of kv6posinfo[VehicleStatusCode]) {
              //TODO: This maybe is stupid. Causes types without vehicleNumber to not appear.
              if(!vehicleData.vehiclenumber) continue;
              returnData.push(this.Mapper(vehicleData, VehicleStatusCode))
            }
          } else if(kv6posinfo[VehicleStatusCode].vehiclenumber) 
            returnData.push(this.Mapper(kv6posinfo[VehicleStatusCode], VehicleStatusCode))     
        })
    }

    return returnData;

  }
  /** 
  * This is the secondary decoding function. It works for Keolis and GVB
  * @param data The required data. It should be of type "KV6Generic", which works for the companies mentioned above.
  * @returns An array with the converted vehicledata.
  */
  DecodeOther(data) : Array<Bus> {
    const returnData : Array<Bus> = [];
    

    if(data.VV_TM_PUSH.KV6posinfo) {
      const kv6posinfo = data.VV_TM_PUSH.KV6posinfo;
      if(Array.isArray(kv6posinfo)) {
        for(const StatusObject of kv6posinfo) {
          const VehicleStatusCode = Object.keys(StatusObject)[0];
          returnData.push(this.Mapper(StatusObject[VehicleStatusCode], VehicleStatusCode))
        }
      } else {
        const VehicleStatusCode = Object.keys(kv6posinfo)[0];
        returnData.push(this.Mapper(kv6posinfo[VehicleStatusCode], VehicleStatusCode))
      }
    } 

    return returnData;
  }

  CheckCompany(operator : string) : string {
    let returnCompany : string;
    Object.values(Companies).forEach(company => {
      if(operator.includes(company)) returnCompany = company;
    })
    return returnCompany;
  }

  Mapper(vehiclePosData, status : string) { 
    const newData = {
      company: vehiclePosData.dataownercode,
      originalCompany: vehiclePosData.dataownercode,
      planningNumber: vehiclePosData.lineplanningnumber.toString(),
      journeyNumber: vehiclePosData.journeynumber,
      timestamp: Date.parse(vehiclePosData.timestamp),
      vehicleNumber: vehiclePosData.vehiclenumber ? vehiclePosData.vehiclenumber : 999999,
      lineNumber: "Onbekend",
      position: this.rdToLatLong(vehiclePosData['rd-x'], vehiclePosData['rd-y']),
      punctuality: [vehiclePosData.punctuality],
      status: BusState[status],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      updatedTimes: [Date.now()],
      currentRouteId: 0,
      currentTripId: 0
    }

    return newData;
  } 

  
  rdToLatLong (x, y) : [number, number] {
    if(x === undefined || y === undefined) return [0, 0];
    
    const dX = (x - 155000) * Math.pow(10, -5);
    const dY = (y - 463000) * Math.pow(10, -5);
    const SomN = (3235.65389 * dY) + (-32.58297 * Math.pow(dX, 2)) + (-0.2475 *
      Math.pow(dY, 2)) + (-0.84978 * Math.pow(dX, 2) *
      dY) + (-0.0655 * Math.pow(dY, 3)) + (-0.01709 *
      Math.pow(dX, 2) * Math.pow(dY, 2)) + (-0.00738 *
      dX) + (0.0053 * Math.pow(dX, 4)) + (-0.00039 *
      Math.pow(dX, 2) * Math.pow(dY, 3)) + (0.00033 * Math.pow(
      dX, 4) * dY) + (-0.00012 *
      dX * dY);
    const SomE = (5260.52916 * dX) + (105.94684 * dX * dY) + (2.45656 *
      dX * Math.pow(dY, 2)) + (-0.81885 * Math.pow(
      dX, 3)) + (0.05594 *
      dX * Math.pow(dY, 3)) + (-0.05607 * Math.pow(
      dX, 3) * dY) + (0.01199 *
      dY) + (-0.00256 * Math.pow(dX, 3) * Math.pow(
      dY, 2)) + (0.00128 *
      dX * Math.pow(dY, 4)) + (0.00022 * Math.pow(dY,
      2)) + (-0.00022 * Math.pow(
      dX, 2)) + (0.00026 *
      Math.pow(dX, 5));
    
    const Latitude = 52.15517 + (SomN / 3600);
    const Longitude = 5.387206 + (SomE / 3600);
    
    return [Longitude, Latitude]
  }

}