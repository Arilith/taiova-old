import * as fs from 'fs';
import * as http from 'http';
import { resolve } from 'path';
import { BusLogic } from './buslogic';
import { DateYYYYMMDD } from './converters/date';
import { Database } from './database';
const extract = require("extract-zip");
const csv = require("csvtojson");

export class Downloader {

  url: string;
  busLogic : BusLogic;
  constructor(db : Database) {
    this.Init();
    this.busLogic = new BusLogic(db);
  }

  async Init() {
    this.CheckLatestGTFS();
  }

  CheckLatestGTFS() {
    const dest = process.env.GTFS_DOWNLOAD_LOCATION ? resolve(`${process.env.GTFS_DOWNLOAD_LOCATION}/${DateYYYYMMDD()}.zip`) : resolve(`GTFS/${DateYYYYMMDD()}.zip`)
    if(!fs.existsSync(dest)) this.DownloadLatestGTFS();
    else {
      console.error("Latest GTFS already downloaded. Extracting instead...");
      this.ExtractFile(dest);
    }
  }

  async DownloadLatestGTFS()  {
    const url = process.env.GTFS_URL || "http://gtfs.openov.nl/gtfs-rt/gtfs-openov-nl.zip";
    const dest = process.env.GTFS_DOWNLOAD_LOCATION ? resolve(`${process.env.GTFS_DOWNLOAD_LOCATION}/${DateYYYYMMDD()}.zip`) : resolve(`GTFS/${DateYYYYMMDD()}.zip`)

    console.log("Starting bus information download.");
    const file = fs.createWriteStream(dest);
    const Extract = () => {
      this.ExtractFile(dest);
    }
    http.get(url, function (response) {
        response.pipe(file);
        file.on("finish", function () {
          file.close();
          console.log("Finished downloading");
          Extract();
        });
    }).on("error", function (err) {
      // Handle errors
      fs.unlink(dest, this);
      console.error(err);
    });
  }

  CheckForFilesInFolder = (path) => {
    fs.readdir(path, (err, files) => {
      if (err) throw err;
      if (files)
        console.log(`Found files in ${path}, deleting before proceeding.`);
  
      for (const file of files) {
        fs.unlink(`${path}\\${file}`, (err) => {
          if (err) throw err;
        });
      }
    });
  }

  ConvertExtractedFiles (path) {
    fs.readdir(path, (error, files) => {
      files.forEach((file) => {
        if(file != "stop_times.txt" && file != "shapes.txt")
          this.convertCSVtoJSON(`${path}\\${file}`);
      });
    });

    console.log("Done extracting!");
    this.busLogic.InitKV78();
  }

  async ExtractFile(path) {
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

  convertCSVtoJSON = (path) => {
    let newPath = `${path}.json`;
    console.log(`Started converting ${path} to ${newPath}`);
  
    const readStream = fs.createReadStream(path);
    const writeStream = fs.createWriteStream(newPath);
    readStream.pipe(csv()).pipe(writeStream);
  }

}