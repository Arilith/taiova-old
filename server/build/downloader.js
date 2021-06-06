"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Downloader = void 0;
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const path_1 = require("path");
const date_1 = require("./converters/date");
const extract = require("extract-zip");
const csv = require("csvtojson");
class Downloader {
    constructor() {
        this.CheckForFilesInFolder = (path) => {
            fs.readdir(path, (err, files) => {
                if (err)
                    throw err;
                if (files)
                    console.log(`Found files in ${path}, deleting before proceeding.`);
                for (const file of files) {
                    fs.unlink(`${path}\\${file}`, (err) => {
                        if (err)
                            throw err;
                    });
                }
            });
        };
        this.convertCSVtoJSON = (path) => {
            let newPath = `${path}.json`;
            console.log(`Started converting ${path} to ${newPath}`);
            const readStream = fs.createReadStream(path);
            const writeStream = fs.createWriteStream(newPath);
            readStream.pipe(csv()).pipe(writeStream);
        };
        this.Init();
    }
    async Init() {
        this.CheckLatestGTFS();
    }
    CheckLatestGTFS() {
        const dest = process.env.GTFS_DOWNLOAD_LOCATION ? path_1.resolve(`${process.env.GTFS_DOWNLOAD_LOCATION}/${date_1.DateYYYYMMDD()}.zip`) : path_1.resolve(`GTFS/${date_1.DateYYYYMMDD()}.zip`);
        if (!fs.existsSync(dest))
            this.DownloadLatestGTFS();
        else {
            console.error("Latest GTFS already downloaded. Extracting instead...");
            this.ExtractFile(dest);
        }
    }
    async DownloadLatestGTFS() {
        const url = process.env.GTFS_URL || "http://gtfs.ovapi.nl/nl/gtfs-nl.zip";
        const dest = process.env.GTFS_DOWNLOAD_LOCATION ? path_1.resolve(`${process.env.GTFS_DOWNLOAD_LOCATION}/${date_1.DateYYYYMMDD()}.zip`) : path_1.resolve(`GTFS/${date_1.DateYYYYMMDD()}.zip`);
        console.log("Starting bus information download.");
        const file = fs.createWriteStream(dest);
        const request = http
            .get(url, function (response) {
            response.pipe(file);
            file.on("finish", function () {
                file.close();
                console.log("Finished downloading");
                this.ExtractFile(dest);
            });
        })
            .on("error", function (err) {
            // Handle errors
            fs.unlink(dest, this);
            console.error(err);
        });
    }
    ConvertExtractedFiles(path) {
        fs.readdir(path, (error, files) => {
            files.forEach((file) => {
                if (file != "stop_times.txt" && file != "shapes.txt")
                    this.convertCSVtoJSON(`${path}\\${file}`);
            });
        });
    }
    async ExtractFile(path) {
        try {
            console.log(`Starting extraction of ${path}`);
            const targetPath = path_1.resolve("GTFS/extracted");
            this.CheckForFilesInFolder(targetPath);
            await extract(path, { dir: targetPath });
            console.log("Extraction complete");
            this.ConvertExtractedFiles(targetPath);
        }
        catch (err) {
            // handle any errors
            console.log(err);
        }
    }
}
exports.Downloader = Downloader;
//# sourceMappingURL=downloader.js.map