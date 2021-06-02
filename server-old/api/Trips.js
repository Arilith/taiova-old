const mongoose = require("mongoose");
var fs = require("fs");
const readline = require("readline");
const resolve = require("path").resolve;
const csv = require("csvtojson");
const DateConvert = require("./DateConvert");
const LineByLineReader = require("line-by-line");
let tripModel;

const currentDateYYYYMMDD = DateConvert.DateYYYYMMDD();
const dateTime = Math.floor(+new Date() / 1000);

const databaseInit = (db) => {
  tripsSchema = new mongoose.Schema({
    date: Number,
    datetime: Number,
    identifier: String,
    planningNumber: String,
    journeyNumber: Number,
    data: Object,
  });

  tripModel = mongoose.model("trips", tripsSchema);

  getAllTrips().then((trips) => {
    console.log(trips);
  });
};

const checkDate = () => {};

const getAllTrips = async () => {
  console.log("Started loading all trips.");
  const targetPath = resolve("downloads/gtfs/extracted/trips.txt.json");
  const trips = [];

  const lr = new LineByLineReader(targetPath);
  lr.on("error", (error) => {
    console.log(error);
  });

  lr.on("line", (line) => {
    const json = JSON.parse(line);
    const trip_identifiers = json.trip_id.split("|");
    // const company = trip_identifiers[0];
    const planningNumber = trip_identifiers[1];
    // const identifier = trip_identifiers[2];
    const journeyNumber = trip_identifiers[3];
    // const zeroOrOne = trip_identifiers[4];

    trips.push({
      date: currentDateYYYYMMDD,
      dateTime: dateTime,
      identifier: json.trip_id,
      planningNumber: planningNumber,
      journeyNumber: journeyNumber,
      data: json,
    });
  });

  lr.on("end", () => {
    console.log(`Returning ${trips.length} trips`);
    return trips;
  });
};

module.exports = { getAllTrips, databaseInit };
