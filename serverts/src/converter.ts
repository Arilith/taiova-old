import { VehicleData } from './types/VehicleData'
import { VehicleApiData } from './types/VehicleApiData'
export class Converter {

  convertKV6ToJson (data : VehicleApiData) : any {

    const busses = data.VV_TM_PUSH.KV6posinfo;

    return busses;

  }

}