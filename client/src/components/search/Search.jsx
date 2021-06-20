import React, { useState, useEffect}  from 'react'
import { Dropdown } from '../Dropdown'
import { SearchResults } from './SearchResults'
export class Search extends React.Component {

  constructor(props) {
    super(props);
    this.state = { 
      results : [{"_id":"60cb15fd80bf4cdcb7bf7cfc","routeId":54180,"company":"IFF","subCompany":"ARR","routeShortName":"325","routeLongName":"Breda - Oosterhout","routeDescription":"","routeType":3},{"_id":"60cb15fd80bf4cdcb7bf7d00","routeId":54181,"company":"TWENTS","subCompany":"ARR","routeShortName":"326","routeLongName":"Breda via Oosterhout - Geertruidenberg","routeDescription":"","routeType":3},{"_id":"60cb15fd80bf4cdcb7bf7d09","routeId":54182,"company":"BRAVO","subCompany":"ARR","routeShortName":"327","routeLongName":"Breda via Oosterhout - Tilburg","routeDescription":"","routeType":3}]
    }
  }

  render() {
    return (
      <>
      <div className={`relative ${!this.props.dark ? "bg-white-trans" : "bg-black-trans"} flex flex-col backdrop-blur rounded-xl shadow-md  md:max-w-md md:w-full md:mr-0 sm:max-w-xs sm:max-h-xs z-10 ml-1 m-1`}>
        <div className="p-4 invisible lg:visible ">
          <label className={`block ${this.props.dark ? "text-white" : "text-gray-500"} text-lg font-bold`} htmlFor="username"> 
            Zoeken
          </label>
        </div>
        <div className="flex bg-white p-4 rounded-bl-xl rounded-br-xl">
          <input className={` flex-grow appearance-none  rounded py-2 px-3 ${this.props.dark ? "text-white" : "text-gray-500"} leading-tight focus:outline-none focus:shadow-outline`} id="search" type="text" placeholder="Lijnnummer, plaatsnaam, station" />
          <Dropdown dark={this.props.dark} setFilter={this.props.setFilter} companies={this.props.companies} />
        </div>
        
      </div>
      {this.state.results && <SearchResults results={this.state.results} dark={this.props.dark} /> }
      </>
    )
  }
  
}
