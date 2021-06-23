import React, { useState, useEffect}  from 'react'
import { Dropdown } from '../Dropdown'
import { SearchResults } from './SearchResults'
import { MapDataFetcher } from '../api/fetchmapdata';
export class Search extends React.Component {

  API;

  constructor(props) {
    super(props);
    this.state = { 
      searchValue: "",
      results : []
    }

    this.API = new MapDataFetcher();
    this.handleChange = this.handleChange.bind(this);
  }

  async handleChange(event) {
    const value = event.target.value
    this.setState({
      searchValue:value,
      results : value ? await this.API.Search(value) : [],
    }) 
  }

  render() {
    return (
      <>
      <div className={`relative ${!this.props.dark ? "bg-white-trans" : "bg-black-trans"} flex flex-col backdrop-blur rounded-xl shadow-md  md:max-w-md md:w-full md:mr-0 sm:max-w-xs sm:max-h-xs z-10 ml-1 m-1`}>
        <div className="p-4 hidden lg:block ">
          <label className={`block ${this.props.dark ? "text-white" : "text-gray-500"} text-lg font-bold`} htmlFor="username"> 
            Zoeken
          </label>
        </div>
        <div className="flex bg-white p-2 lg:p-4 rounded-xl lg:rounded-bl-xl lg:rounded-br-xl lg:rounded-tl-none lg:rounded-tr-none">
          <input value={this.state.searchValue} onChange={this.handleChange} className={` flex-grow appearance-none  rounded py-2 px-3 ${this.props.dark ? "text-white" : "text-gray-500"} leading-tight focus:outline-none focus:shadow-outline`} id="search" type="text" placeholder="Lijnnummer, plaatsnaam, station" />
          <Dropdown dark={this.props.dark} setFilter={this.props.setFilter} companies={this.props.companies} />
        </div>
        
      </div>
      {this.state.results && <SearchResults results={this.state.results} dark={this.props.dark} /> }
      </>
    )
  }
  
}