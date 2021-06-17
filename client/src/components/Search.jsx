import React from 'react'
import { Dropdown } from './Dropdown'
export const Search = (props) => {

  return (
    <>
    <div className="relative bg-white rounded-xl shadow-md md:max-w-xl md:w-full md:mr-0 sm:max-w-xs sm:max-h-xs h-xl z-10 mb-auto ml-1 mt-1">
      
      <div className="w-auto">
        <div className="p-8">
          
          <label className="block text-gray-700 text-sm font-bold mb-2 " htmlFor="username">
            Zoeken
          </label>
          <input className="shadow w-3/4 appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="search" type="text" placeholder="Lijnnummer, plaatsnaaam, station" />
          <Dropdown setFilter={props.setFilter} companies={props.companies} />
          
        </div>
      </div>
    </div>
    
    </>
  )
}
