import React, { useState, useEffect } from 'react'

const BusInformationPanel = (props) => {

  useEffect(() => {
    console.log(props.data)
  }, [props.data])
  
  return (
    <div>
      
    </div>
  )
}

export default BusInformationPanel
