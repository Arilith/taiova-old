import { BusLogic } from '../logic/BusLogic'
export class BusController {

  public async GetAllBusses(req, res, next) {
    try {
      const busLogic = new BusLogic(true);
      res.status(200).json(await busLogic.GetAllBusses());
    } catch (err) {
      res.status(500).send({...err, message: err.message})
    }
  }

  public async GetAllBussesSmall(req, res, next) {
    try {
      const busLogic = new BusLogic(true);
      res.status(200).json(await busLogic.GetAllBusses(true));
    } catch (err) {
      res.status(500).send({...err, message: err.message})
    }
  }

  public async GetBus(req, res, next) {
    try {
      console.log("Getting bus")
      const company = req.params.company;
      const vehicleNumber = req.params.vehicleNumber;
      const busLogic = new BusLogic();
      res.status(200).json(await busLogic.GetBus(company, vehicleNumber));
    } catch (err) {
      res.status(500).send({...err, message: err.message})
    }
  }

}