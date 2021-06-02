const zmq = require("zeromq");
var http = require("http");
var fs = require("fs");
const extract = require("extract-zip");
const resolve = require("path").resolve;
const csv = require("csvtojson");

const DateConvert = require("./DateConvert");

const checkFileExists = (path) => {
  return fs.existsSync(path);
};

const checkForFilesInFolder = (path) => {
  fs.readdir(path, (err, files) => {
    if (err) throw err;
    if (files)
      console.log(`Found files in ${path}, deleting before proceeding.`);

    for (const file of files) {
      fs.unlink(path.join(directory, file), (err) => {
        if (err) throw err;
      });
    }
  });
};

const extractFile = async (path) => {
  try {
    console.log(`Starting extraction of ${path}`);
    const targetPath = resolve("downloads/gtfs/extracted");
    checkForFilesInFolder(targetPath);
    await extract(path, { dir: targetPath });
    console.log("Extraction complete");
    convertExtractedFiles(targetPath);
  } catch (err) {
    // handle any errors
    console.log(err);
  }
};

const convertCSVtoJSON = (path) => {
  let newPath = `${path}.json`;
  console.log(`Started converting ${path} to ${newPath}`);

  const readStream = fs.createReadStream(path);
  const writeStream = fs.createWriteStream(newPath);
  readStream.pipe(csv()).pipe(writeStream);
};

const convertExtractedFiles = (path) => {
  fs.readdir(path, (error, files) => {
    files.forEach((file) => {
      convertCSVtoJSON(`${path}\\${file}`);
    });
  });
};

const downloadFile = function (url, dest) {
  console.log("Starting bus information download.");
  const file = fs.createWriteStream(dest);
  const request = http
    .get(url, function (response) {
      response.pipe(file);
      file.on("finish", function () {
        file.close();
        console.log("Finished downloading");
        extractFile(dest);
      });
    })
    .on("error", function (err) {
      // Handle errors
      fs.unlink(dest);
      console.error(err);
    });
};

const busApiInit = () => {
  const currentDate = DateConvert.DateYYYYMMDD();
  const filePath = `downloads/gtfs/${currentDate}.zip`;

  if (!checkFileExists(filePath))
    downloadFile("http://gtfs.ovapi.nl/govi/gtfs-kv7-20210517.zip", filePath);

  extractFile(filePath);
};

module.exports = {
  busApiInit,
};
