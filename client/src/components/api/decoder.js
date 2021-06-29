import * as zlib from 'zlib';

export const decodeBuffer = buffer => {
  buffer = Buffer.from(buffer);
  
  const vehicles = [];

  for(let i = 0; i < (buffer.byteLength / 51); i++) {
    const x = buffer.readFloatBE(i * 51)
    const y =buffer.readFloatBE(i * 51 + 4)
    const v = buffer.readUInt32BE(i * 51 + 4 + 4)
    const combined = buffer.slice(i * 51 + 4 + 4 + 4, i * 51 + 4 + 4 + 4 + 39).toString().split('\u0000')[0];
    const c = combined.split("|")[0];
    const n = combined.split("|")[1];
    const id = combined.split("|")[2];
    vehicles.push({
      i: id,
      p: [x, y],
      c: c,
      v: v,
      n : n
    })
  }

  return vehicles;
}

export const convertToMapData = vehicles => {
  return vehicles.reduce((acc, cur) => {
    if(!acc[cur.c]) acc[cur.c] = []

    acc[cur.c].push({
        type: "Feature",
        geometry: {
            type: "Point",
            coordinates: cur.p,
        },
        properties: {
          position : cur.p,
          vehicleNumber: cur.v,
          company: cur.c,
          title: cur.n,
          lineNumber: cur.n,
        }
    })

    return acc
  }, {})
}

export const ConvertToMapDataNew = vehicles => {
  return vehicles.map(vehicle => {
    return {
      'type': 'Feature',
      'geometry': {
          'type': 'Point',
          'coordinates': vehicle.p
      }
    }
  })
}