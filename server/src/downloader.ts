import * as fs from 'fs';
import * as http from 'http';
import { resolve } from 'path';
import { BusLogic } from './buslogic';
import { DateYYYYMMDD } from './converters/date';
import { Database } from './database';
const extract = require("extract-zip");
const csv = require("csvtojson");

export class Downloader {

  private url: string;
  private busLogic : BusLogic;

  private callback : () => any;
  constructor(db : Database) {
    
    this.busLogic = new BusLogic(db);
  }

  public async DownloadGTFS(callback : () => any) {
    this.callback = callback;
    this.CheckLatestGTFS();  
  }

  public DownloadCentraalHalteBestand(callback : () => any) {
    this.callback = callback;
    this.CheckLatestCHB();
  }

  private async ExtractFile(path) {
    try {
      const targetPath = resolve("GTFS/extracted");
      this.CheckForFilesInFolder(targetPath);
      console.log(`Starting extraction of ${path}`);
      await extract(path, { dir: targetPath });
      console.log("Extraction complete");
      this.ConvertExtractedFiles(targetPath);
    } catch (err) {
      // handle any errors
      console.log(err);
    }
  }

  private CheckLatestGTFS() {
    const dest = process.env.GTFS_DOWNLOAD_LOCATION ? resolve(`${process.env.GTFS_DOWNLOAD_LOCATION}/${DateYYYYMMDD()}.zip`) : resolve(`GTFS/${DateYYYYMMDD()}.zip`)
    if(!fs.existsSync(dest)) this.DownloadLatestGTFS();
    else {
      console.error("Latest GTFS already downloaded. Extracting instead...");
      this.ExtractFile(dest);
    }
  }

  private async DownloadLatestGTFS()  {
    const url = process.env.GTFS_URL || "http://gtfs.openov.nl/gtfs-rt/gtfs-openov-nl.zip";
    const dest = process.env.GTFS_DOWNLOAD_LOCATION ? resolve(`${process.env.GTFS_DOWNLOAD_LOCATION}/${DateYYYYMMDD()}.zip`) : resolve(`GTFS/${DateYYYYMMDD()}.zip`)

    console.log("Starting bus information download.");
    const file = fs.createWriteStream(dest);
    http.get(url, function (response) {
        response.pipe(file);
        file.on("finish", function () {
          file.close();
          console.log("Finished downloading");
          console.log("Started extracting");
          this.ExtractFile(dest);
        });
    }).on("error", function (err) {
      fs.unlink(dest, this);
      console.error(err);
    });
  }

  private async DownloadLatestCHB() {
    this.callback();
  }

  private async CheckLatestCHB () {
    this.DownloadLatestCHB();
  }

  private CheckForFilesInFolder = (path) => {
    fs.readdir(path, (err, files) => {
      if (err) throw err;
      if (files)
        console.log(`Found files in ${path}, deleting before proceeding.`);
  
      for (const file of files) {
        fs.unlink(`${path}/${file}`, (err) => {
          if (err) throw err;
        });
      }
    });
  }

  private ConvertExtractedFiles (path) {
    const promises : Array<Promise<any>> = [];
    fs.readdir(path, (error, files) => {
      files.forEach((file) => {
          if(file !== "stop_times.txt")
          promises.push(this.convertCSVtoJSON(`${path}/${file}`, file));
      });

      Promise.allSettled(promises).then((values) => {
        console.log("Done extracting!");
        this.callback();
      })

    });

    
    
  }


  private convertCSVtoJSON = (path, file) => {
    return new Promise((resolve, reject) => {
      const newName = file.split('.')[0] + ".json"
      let newPath = `./GTFS/converted/${newName}`;
      console.log(`Started converting ${path} to ${newPath}`);
    
      const readStream = fs.createReadStream(path);
      const writeStream = fs.createWriteStream(newPath);
      
      readStream.pipe(csv()).pipe(writeStream);
      writeStream.on('finish', () => {
        resolve("Finished!");
      })

      writeStream.on('error', () => {
        reject(`Failed to convert ${newPath}`)
      })
      
    })
  }

}