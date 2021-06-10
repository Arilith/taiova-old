const convertCTXtoJSON = (ctx) => {
  const test = `\GKV8turbo_passtimes|KV8turbo_passtimes|OpenOV EBS-hgl|||UTF-8|0.1|2021-06-06T18:26:05+02:00|﻿
\TDATEDPASSTIME|DATEDPASSTIME|start object
\LDataOwnerCode|OperationDate|LinePlanningNumber|JourneyNumber|FortifyOrderNumber|UserStopOrderNumber|UserStopCode|LocalServiceLevelCode|JourneyPatternCode|LineDirection|LastUpdateTimeStamp|DestinationCode|IsTimingStop|ExpectedArrivalTime|ExpectedDepartureTime|TripStopStatus|MessageContent|MessageType|SideCode|NumberOfCoaches|WheelChairAccessible|OperatorCode|ReasonType|SubReasonType|ReasonContent|AdviceType|SubAdviceType|AdviceContent|TimingPointDataOwnerCode|TimingPointCode|JourneyStopType|TargetArrivalTime|TargetDepartureTime|RecordedArrivalTime|RecordedDepartureTime|DetectedUserStopCode|DistanceSinceDetectedUserStop|Detected_RD_X|Detected_RD_Y|VehicleNumber|BlockCode|LineVeTagNumber|VejoJourneyNumber|VehicleJourneyType|VejoBlockNumCode|JourneyModificationType|VejoDepartureTime|VejoArrivalTime|VejoTripStatusType|ExtraJourney|CancelledJourney|ShowCancelledTrip|ShowFlexibleTrip|Monitored|MonitoringError|ExtraCall|CancelledCall|ShowCancelledStop|AimedQuayRef|ExpectedQuayRef|ActualQuayRef|Occupancy|LineDestIcon|LineDestColor|LineDestTextColor
EBS|2021-06-06|3051|7039|0|20|54002060|6787227|298074|1|2021-06-06T18:26:05+02:00|3042|0|18:24:55|18:24:51|PASSED|\0|\0|-|1|UNKNOWN|\0|\0|\0|\0|\0|\0|\0|ALGEMEEN|42013502|INTERMEDIATE|18:26:02|18:26:02|18:24:51|18:25:05|54002060|700|80485|454340|5172|206|51|7039|PUJO|\0|NONE|17:55:00|18:30:00|\0|0|0|TRUE|1|1|0|0|0|1|\0|\0|\0|\0|\0|\0|\0
EBS|2021-06-06|3051|7040|0|7|54002150|6787227|298091|2|2021-06-06T18:26:05+02:00|3044|0|18:40:44|18:40:44|DRIVING|\0|\0|-|\0|ACCESSIBLE|\0|\0|\0|\0|\0|\0|\0|ALGEMEEN|42018901|INTERMEDIATE|18:40:44|18:40:44|\0|\0|54002150|326|\0|\0|\0|\0|51|7040|PUJO|\0|NONE|18:31:00|19:08:00|\0|0|0|TRUE|1|1|0|0|0|1|\0|\0|\0|\0|\0|\0|\0
EBS|2021-06-06|3051|7040|0|13|54160030|6787227|298091|2|2021-06-06T18:26:05+02:00|3007|0|18:50:05|18:50:05|DRIVING|\0|\0|-|\0|ACCESSIBLE|\0|\0|\0|\0|\0|\0|\0|ALGEMEEN|32005405|INTERMEDIATE|18:50:05|18:50:05|\0|\0|54160030|732|\0|\0|\0|\0|51|7040|PUJO|\0|NONE|18:31:00|19:08:00|\0|0|0|TRUE|1|1|0|0|0|1|\0|\0|\0|\0|\0|\0|\0
EBS|2021-06-06|3051|7040|0|12|54162030|6787227|298091|2|2021-06-06T18:26:05+02:00|3007|0|18:48:05|18:48:05|DRIVING|\0|\0|-|\0|ACCESSIBLE|\0|\0|\0|\0|\0|\0|\0|ALGEMEEN|42046701|INTERMEDIATE|18:48:05|18:48:05|\0|\0|54162030|885|\0|\0|\0|\0|51|7040|PUJO|\0|NONE|18:31:00|19:08:00|\0|0|0|TRUE|1|1|0|0|0|1|\0|\0|\0|\0|\0|\0|\0
`

  const header = test.split('\G')[1].split('\n')[0];
  const table = test.split("\n")[1];
  const columnNames = test.split("\n")[2].split("|");
  const rows = test.split("\n").slice(3, test.split("\n").length);
  const rowsSplit = rows.map(row => {
    const split = row.split("|");
    if(split.length != 1) return row.split("|")
  })
  const finalRows = rowsSplit.filter(row => row != undefined);
  const result = [];

  finalRows.forEach(row => {
    // const tempRes = row.reduce((result, field, index) => {
    //   result[columnNames[index]] = field;
    //   return result;
    // })

    // result.push(tempRes);

    console.log(row);
  })

  // console.log(result);
}

convertCTXtoJSON("");