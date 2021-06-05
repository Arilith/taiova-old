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

}