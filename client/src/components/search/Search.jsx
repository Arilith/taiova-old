import React, { useState, useEffect}  from 'react'
import { Dropdown } from '../Dropdown'
import { SearchResult } from './SearchResult'
export const Search = (props) => {

  const [results, setResults] = useState([])

  return (
    <>
    <div className={`relative ${!props.dark ? "bg-white-trans" : "bg-black-trans"} backdrop-blur rounded-xl shadow-md md:max-w-xl md:w-full md:mr-0 sm:max-w-xs sm:max-h-xs z-10 ml-1 m-1`}>
      
      <div className="w-auto">
        <div className="p-8">
          
          <label className={`block ${props.dark ? "text-white" : "text-gray-500"} text-sm font-bold mb-2 `} htmlFor="username">
            Zoeken
          </label>
          <input className={`shadow w-auto appearance-none border rounded py-2 px-3 ${props.dark ? "text-white" : "text-gray-500"} leading-tight focus:outline-none focus:shadow-outline`} id="search" type="text" placeholder="Lijnnummer, plaatsnaaam, station" />
          {/* <SearchResults results={results} /> */}
          <Dropdown dark={props.dark} setFilter={props.setFilter} companies={props.companies} />
          
        </div>
      </div>
    </div>
    {/* <div className="relative bg-white rounded-xl shadow-md md:max-w-xl md:w-full md:mr-0 sm:max-w-xs sm:max-h-xs h-xl z-10 mt-2 p-2  mb-auto ml-6">
      <SearchResult data={""} />
    </div> */}
    </>
  )
}
