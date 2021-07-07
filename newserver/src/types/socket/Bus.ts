export interface SmallBus {
  c: string,
  p: [number, number],
  v: number,
  n: string
}

export const ConvertToSmallBus = (bus) => {
  return {
    c: bus.company,
    v: bus.vehicleNumber,
    n: bus.lineNumber,
    p: [bus.long, bus.lat]
  }
}

export const ConvertToSmallBusses = (busses) => busses.map(bus => ConvertToSmallBus(bus))