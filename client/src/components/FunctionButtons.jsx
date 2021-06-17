import React, { useState } from 'react'
import { Button } from './layout/Button'
import { ChevronDownIcon, ChevronUpIcon, SearchIcon, ClockIcon, CalendarIcon, ClipboardListIcon, SunIcon, MoonIcon } from '@heroicons/react/outline'

export const FunctionButtons = (props) => {

  const [iconsHidden, setIconsHidden] = useState(false);
   

  return (
    <div className={`flex flex-row justify-center items-center ${!props.dark ? "bg-white-trans" : "bg-black-trans"} backdrop-blur rounded-xl shadow-md mt-2 h-16 p-2 z-10 w-auto lg:flex-col lg:h-auto lg:w-16 lg:mt-auto`}>
      
      {!iconsHidden && 
      <>
        <Button className={`h-10 w-10 shadow rounded appearance-none mr-2 lg:mr-0 lg:mb-2 ${props.dark ? "text-white" : "text-gray-700"}`} icon={<ClockIcon />} />
        <Button className={`h-10 w-10 shadow rounded appearance-none mr-2 lg:mr-0 lg:mb-2 ${props.dark ? "text-white" : "text-gray-700"}`} icon={<CalendarIcon />} />
        <Button className={`h-10 w-10 shadow rounded appearance-none mr-2 lg:mr-0 lg:mb-2 ${props.dark ? "text-white" : "text-gray-700"}`} icon={<ClipboardListIcon />} />
        <Button className={`h-10 w-10 shadow rounded appearance-none mr-2 lg:mr-0 lg:mb-2 ${props.dark ? "text-white" : "text-gray-700"}`} icon={<SearchIcon />} />
        <Button onClick={() => props.toggleDark() } className={`h-10 w-10 shadow rounded appearance-none mr-2 lg:mr-0 lg:mb-2 ${props.dark ? "text-white" : "text-gray-700"}`} icon={<MoonIcon />} />
      </>}
      <Button onClick={() => setIconsHidden(!iconsHidden)} className={`h-10 w-10 hidden shadow rounded appearance-none ${props.dark ? "text-white" : "text-gray-700"} lg:block `} icon={iconsHidden ? <ChevronUpIcon /> : <ChevronDownIcon />} />
    </div>
  )
}


