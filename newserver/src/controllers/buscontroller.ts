import { BusLogic } from '../logic/BusLogic'
export class BusController {

  private _busLogic : BusLogic = new BusLogic();

  public async GetAllBusses(req, res, next) {
    try {
      res.status(200).json(this._busLogic.GetAllBusses());
    } catch (err) {
      res.status(500).send({...err, message: err.message})
    }
  }

  public async GetAllBussesSmall(req, res, next) {
    try {
      res.status(200).json(this._busLogic.GetAllBussesSmall())
    } catch (err) {
      res.status(500).send({...err, message: err.message})
    }
  }

}