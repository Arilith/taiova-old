export const decodeBuffer = buffer => {
  buffer = Buffer.from(buffer);

  const vehicles = [];

  for(let i = 0; i < (buffer.byteLength / 27); i++) {
    const x = buffer.readFloatBE(i * 27)
    const y =buffer.readFloatBE(i * 27 + 4)
    const v = buffer.readUInt32BE(i * 27 + 4 + 4)
    const combined = buffer.slice(i * 27 + 4 + 4 + 4, i * 27 + 4 + 4 + 4 + 15).toString().split('\u0000')[0];
    const c = combined.split("|")[0];
    const n = combined.split("|")[1];
    vehicles.push({
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