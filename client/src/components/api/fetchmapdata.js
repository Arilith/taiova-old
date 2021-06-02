const axios = require('axios');

export class MapDataFetcher {
  
  url;

  constructor(url) {
    this.url = url;
  }

  async FetchAllVehicles() {
    const result = await axios.get(`${this.url}/busses`);
    return result.data;
  }

}