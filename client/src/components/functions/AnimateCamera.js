// import { turf } from '@turf/turf'

// export const AnimateCamera = (map) => {
//   var animationDuration = 80000;
//   var cameraAltitude = 4000;
//   // get the overall distance of each route so we can interpolate along them
//   var routeDistance = turf.lineDistance(turf.lineString(targetRoute));
//   var cameraRouteDistance = turf.lineDistance(
//   turf.lineString(cameraRoute)
//   );
  
//   var start;
  
//   function frame(time) {
//   if (!start) start = time;
//   // phase determines how far through the animation we are
//   var phase = (time - start) / animationDuration;
  
//   // phase is normalized between 0 and 1
//   // when the animation is finished, reset start to loop the animation
//   if (phase > 1) {
//   // wait 1.5 seconds before looping
//   setTimeout(function () {
//   start = 0.0;
//   }, 1500);
//   }
  
//   // use the phase to get a point that is the appropriate distance along the route
//   // this approach syncs the camera and route positions ensuring they move
//   // at roughly equal rates even if they don't contain the same number of points
//   var alongRoute = turf.along(
//   turf.lineString(targetRoute),
//   routeDistance * phase
//   ).geometry.coordinates;
  
//   var alongCamera = turf.along(
//   turf.lineString(cameraRoute),
//   cameraRouteDistance * phase
//   ).geometry.coordinates;
  
//   var camera = map.getFreeCameraOptions();
  
//   // set the position and altitude of the camera
//   camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
//   {
//   lng: alongCamera[0],
//   lat: alongCamera[1]
//   },
//   cameraAltitude
//   );
  
//   // tell the camera to look at a point along the route
//   camera.lookAtPoint({
//   lng: alongRoute[0],
//   lat: alongRoute[1]
//   });
  
//   map.setFreeCameraOptions(camera);
  
//   window.requestAnimationFrame(frame);
//   }
  
//   window.requestAnimationFrame(frame);
// }