const turf = require('@turf/turf')

const positions = [
  [4.387130375645958, 51.700438920636444],
  [4.372138377217438, 51.701298764184884],
  [4.377161755687695, 51.7011444269889],
  [4.38219856655286, 51.701034935159974]
];

const newPoints = positions.sort((a, b) => Math.sqrt(a[0] + a[1]) - Math.sqrt(a[0] + b[1]))

// const distance = (point1x, point1y, point2x, point2y) => {
//   var from = turf.point([point1x, point1y]);
//   var to = turf.point([point2x, point2y]);
//   return turf.distance(from, to);
// };

// const newPoints = [];

// let index = 0;

// for(let [x,y] of positions) {
//   let d = Number.MAX_VALUE
//   let cd = [0,0]
//   for(let [x2,y2] of positions.slice(index)) {
//     let nd = distance(x,y,x2,y2)
    
//     if(nd < d && x != x2 && y != y2) {
//       d = nd
//       cd = [x2,y2]
//     }
//   }
//   newPoints.push(cd)
//   index++;
// }

console.log(newPoints);
