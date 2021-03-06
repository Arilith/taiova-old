import { VehicleData, vehicleState } from './types/VehicleData'
import { VehicleApiData, VehiclePosData, VehicleApiDataKeolis } from './types/VehicleApiData'
export class Converter {

  decode(data: VehicleApiData, isKeolis : boolean = false) : any {
    
    let newData : any = data;

    if(JSON.stringify(data).includes('tmi8:'))
      newData = this.removeTmi8(data); 

    if(!isKeolis)
      return this.convertKV6ToJson(newData);

    return this.convertKV6ToJsonKeolis(newData);
  } 

  convertKV6ToJsonKeolis(data: any) : any {
    const array : Array<VehicleData> = [];
    const kv6posinfo = data.VV_TM_PUSH.KV6posinfo;
    
    if(kv6posinfo.length !== undefined) {
      kv6posinfo.forEach(statusWithBus => {
        const vehiclePosData : VehiclePosData = statusWithBus[Object.keys(statusWithBus)[0]];
          array.push({
            company: vehiclePosData.dataownercode,
            planningNumber: vehiclePosData.lineplanningnumber.toString(),
            journeyNumber: vehiclePosData.journeynumber,
            timestamp: Date.parse(vehiclePosData.timestamp),
            vehicleNumber: vehiclePosData.vehiclenumber,
            position: this.rdToLatLong(vehiclePosData['rd-x'], vehiclePosData['rd-y']),
            punctuality: [vehiclePosData.punctuality],
            status: vehicleState[Object.keys(statusWithBus)[0]],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            updatedTimes: [Date.now()]
          })
      })
    } else {
      const vehiclePosData : VehiclePosData = kv6posinfo[Object.keys(kv6posinfo)[0]];
      array.push({
        company: vehiclePosData.dataownercode,
        planningNumber: vehiclePosData.lineplanningnumber.toString(),
        journeyNumber: vehiclePosData.journeynumber,
        timestamp: Date.parse(vehiclePosData.timestamp),
        vehicleNumber: vehiclePosData.vehiclenumber,
        position: this.rdToLatLong(vehiclePosData['rd-x'], vehiclePosData['rd-y']),
        punctuality: [vehiclePosData.punctuality],
        status: vehicleState[Object.keys(kv6posinfo)[0]],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        updatedTimes: [Date.now()]
      })
    }
    

    return array;
  }

  convertKV6ToJson (data : VehicleApiData) : any {

    let kv6posinfo = data.VV_TM_PUSH.KV6posinfo;
    const array : Array<VehicleData> = [];

    if(kv6posinfo != undefined) {
      Object.entries(kv6posinfo).forEach(([key, value]) => {
        //If true, the received data is just one object instead of array. Typeof VehiclePosData
        if(value.hasOwnProperty("dataownercode")) { 

          const vehiclePosData : VehiclePosData = kv6posinfo[key];
          if(!(!parseInt(vehiclePosData['rd-x'] + "") || !parseInt(vehiclePosData['rd-y'] + ""))) {
            array.push(
              {
                company: vehiclePosData.dataownercode,
                planningNumber: vehiclePosData.lineplanningnumber.toString(),
                journeyNumber: vehiclePosData.journeynumber,
                timestamp: Date.parse(vehiclePosData.timestamp),
                vehicleNumber: vehiclePosData.vehiclenumber,
                position: this.rdToLatLong(vehiclePosData['rd-x'], vehiclePosData['rd-y']),
                punctuality: [vehiclePosData.punctuality],
                status: vehicleState[key],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                updatedTimes: [Date.now()]
              }
            )
          }  
        //If this is true, the received data is an array of objects.  Typeof VehiclePosData[]
        } else if(value[Object.keys(value)[0]] !== undefined) {
          for(let j =0; j < kv6posinfo[key].length; j++) {
            const vehiclePosData : VehiclePosData = kv6posinfo[key][j];
            if(!parseInt(vehiclePosData['rd-x'] + "") || !parseInt(vehiclePosData['rd-y'] + "")) continue; 
            array.push(
              {
                company: vehiclePosData.dataownercode,
                planningNumber: vehiclePosData.lineplanningnumber.toString(),
                journeyNumber: vehiclePosData.journeynumber,
                timestamp: Date.parse(vehiclePosData.timestamp),
                vehicleNumber: vehiclePosData.vehiclenumber,
                position: this.rdToLatLong(vehiclePosData['rd-x'], vehiclePosData['rd-y']),
                punctuality: [vehiclePosData.punctuality],
                status: vehicleState[key],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                updatedTimes: [Date.now()]
              }
            )
          }
        } 
      });
    }

    return array;

  }

  removeTmi8 (data : VehicleApiData) : VehicleApiData {
    let dataString : string = JSON.stringify(data);
    dataString = dataString.replace(/tmi8:/g, "");
    return JSON.parse(dataString);
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