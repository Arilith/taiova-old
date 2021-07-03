import * as express from 'express';

import { BusController } from '../controllers/buscontroller'
export const busRouter = express.Router();
const _busController = new BusController();

busRouter.get('/', _busController.GetAllBusses)

busRouter.get('/:company/:number', (req, res) => {
  const company = req.params.company;
  const number = req.params.number;

  res.status(200).json({ 
    message: `Handling GET requests to /busses/${company}/${number}`
  })
})

busRouter.get('/:routeId', (req, res) => {
  const routeId = req.params.routeId;
  res.status(200).json({ 
    message: `Handling GET requests to /busses/${routeId} 23`
  })
})