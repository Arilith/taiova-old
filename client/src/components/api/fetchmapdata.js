const axios = require('axios');

export class MapDataFetcher {
  
  url;

  constructor() {
    const dataURL = window.location.href.includes("localhost")
      ? "https://localhost:3001"
      : "https://taiova.trvtserver.nl:3001";
    this.url = dataURL;
  }

  async FetchAllVehicles() {
    const result = await axios.get(`${this.url}/busses`);
    return result.data;
  }

  async FetchVehicle(company, vehicleNumber) {
    const result = await axios.get(`${this.url}/busses/${company}/${vehicleNumber}`);
    return result.data;
  }

  async FetchTrip(planningNumber, tripNumber) {
    const result = await axios.get(`${this.url}/trip/${planningNumber}/${tripNumber}`);
    return result.data;
  }

  async FetchRoute(routeId) {
    const result = await axios.get(`${this.url}/route/${routeId}`);
    return result.data;
  }

  async FetchShape(shapeId) {
    const result = await axios.get(`${this.url}/shape/${shapeId}`);
    const sortedList = result.data.sort((a, b) => (a.shapeSequenceNumber > b.shapeSequenceNumber ? 1 : -1));

    const positions = [];
    sortedList.forEach(shapePoint => {
      positions.push([shapePoint.Position[1], shapePoint.Position[0]])
    }) 

    const returnData = {
      allShapeInfo : sortedList,
      positionsOnly: positions
    }

    return returnData;
  }

}