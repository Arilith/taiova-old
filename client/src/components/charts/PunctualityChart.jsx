import React, { useState, useEffect } from 'react'
import { timeConverter } from '../components/functions/DateConverter'
// import Chart from 'react-apexcharts'

export const PunctualityChart = (props) => {

  const updatedTimes = props.chartData.updatedTimes;
  const punctuality = props.chartData.punctuality;

  const chartData = {
    options: {
      chart: {
        id: 'punctuality'
      },
      xaxis: {
        categories: updatedTimes.map(time => {
          return timeConverter(time)
        })
      },
      stroke: {
        curve: 'smooth',
      }
    },
    series: [{
      name: 'Punctualiteit',
      data: punctuality
    }]
  }

  // return <Chart className="hidden" options={chartData.options} series={chartData.series} type="line" width={500} height={320} />
}
