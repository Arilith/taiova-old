import * as express from 'express';

export const tripRouter = express.Router();

tripRouter.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Handling GET requests to /trips'
  })
})

// tripRouter.get
