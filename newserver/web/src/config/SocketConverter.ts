import { SmallBus } from "../types/socket/Bus"
// export const CreateBufferFromBikes = (vehicles : Array<SmallBus>) => { 
//   const buf = Buffer.alloc((4 + 4 + 4 + 15) * vehicles.length)
//   vehicles.forEach((vehicle : SmallBus, index : number) => {
//     buf.writeFloatBE(vehicle.p[0], index * 27)
//     buf.writeFloatBE(vehicle.p[1], index * 27 + 4)
//     buf.writeUInt32BE(vehicle.v, index * 27 + 4 + 4)
//     buf.write(`${vehicle.c}|${vehicle.n}`, index * 27 + 4 + 4 + 4)
//     for(let i = 0; i < 15 - (vehicle.c.length + 1 + vehicle.n.length); i++) {
//       buf.writeUInt8(0, index * 27 + 4 + 4 + 4 + vehicle.c.length + 1 + vehicle.n.length)
//     }
//   })

//   return buf;
// }

export const CreateBufferFromVehicles = (vehicles : Array<SmallBus>) => { 
  const buf = Buffer.alloc((4 + 4 + 4 + 15) * vehicles.length)
  vehicles.forEach((vehicle : SmallBus, index : number) => {
    buf.writeFloatBE(vehicle.p[0], index * 27)
    buf.writeFloatBE(vehicle.p[1], index * 27 + 4)
    buf.writeUInt32BE(vehicle.v, index * 27 + 4 + 4)
    buf.write(`${vehicle.c}|${vehicle.n}`, index * 27 + 4 + 4 + 4)
    for(let i = 0; i < 15 - (vehicle.c.length + 1 + vehicle.n.length); i++) {
      buf.writeUInt8(0, index * 27 + 4 + 4 + 4 + vehicle.c.length + 1 + vehicle.n.length)
    }
  })

  return buf;
}