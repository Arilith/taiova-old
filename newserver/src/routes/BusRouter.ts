import * as express from 'express';

import { BusController } from '../controllers/buscontroller'
export const busRouter = express.Router();
const _busController = new BusController();

busRouter.get('/', _busController.GetAllBusses)

busRouter.get('/small', _busController.GetAllBussesSmall)

//Todo: Fix that for busses with subcompany, it looks for the original company.
busRouter.get('/:company/:vehicleNumber', _busController.GetBus)


busRouter.get('/:routeId', (req, res) => {
  const routeId = req.params.routeId;
  res.status(200).json({ 
    message: `Handling GET requests to /busses/${routeId} 23`
  })
})