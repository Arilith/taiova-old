import React from 'react'
import { SearchResult } from './SearchResult'

export const SearchResults = (props) => {

  const results = props.results;
  const dark = props.dark;
  return (
    <div className="z-10">
      {results.map(result => {
        return <SearchResult key={result._id} dark={dark} result={result} />
      })}
      
    </div>
  )
}
