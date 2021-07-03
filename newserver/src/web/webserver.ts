import * as https from 'https';
import * as express from "express";
import * as cors from 'cors';
import * as morgan from 'morgan';

import { privateKey, certificate, ca } from '../ssl'
import { busRouter } from '../routes/BusRouter'
import { tripRouter } from '../routes/TripRouter';

 class WebError extends Error  {
  status? : number;
}

export class WebServer {
  private port = process.env.PORT || 3000;
  constructor() {
    const corsOptions = {
      origin: '*',
      optionsSuccessStatus: 200
    }
  
    //Todo: Check for better cors opetions.
    app.use(cors(corsOptions))
    app.options('*', cors())

    this.InitializeWebserver();
  }

  private InitializeWebserver() {
    const server = https.createServer(
      {
        key: privateKey,
        cert: certificate,
        ca: ca,
        requestCert: true,
        rejectUnauthorized: false,
      },
      app
    );
    server.listen(this.port, () => console.log(`Listening at http://localhost:${this.port}`));

    this.Listeners();
  }

  private Listeners () {
    if(process.env.LOG_REQUESTS == "true")
      app.use(morgan('dev'))

    app.use('/busses', busRouter);
    app.use('/tripRouter', tripRouter);

    app.use((req, res, next) => {
      const error = new WebError('Not found.');
      error.status = 404;
      next(error);
    })

    app.use((error : WebError, req, res, next) => {
      res.status(error.status || 500);
      res.json({
        error: {
          message : error.message
        }
      })
    })
  }

}

export const app = express();