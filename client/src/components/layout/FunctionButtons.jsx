import React, { useState } from 'react'
import { Button } from './Button'
import { FcSettings, FcClock, FcCalendar, FcSearch, FcCollapse, FcExpand } from "react-icons/fc";
export const FunctionButtons = (props) => {

  const [iconsHidden, setIconsHidden] = useState(false);
   

  return (
    <div className={`flex flex-row justify-between items-center ${!props.dark ? "bg-white-trans" : "bg-black-trans"} backdrop-blur rounded-2xl shadow-md mt-2 mr-4 ml-4 mb-4 lg:mb-0 lg:mr-0 lg:ml-0 h-16 p-2 z-10 w-auto lg:flex-col lg:h-auto lg:w-16 lg:mt-auto`}>
      
      {!iconsHidden && 
      <>
        <Button className={`h-full w-16 lg:h-12 lg:w-12 flex justify-center items-center shadow-sm rounded-xl bg-white appearance-none p-1 lg:mr-0 lg:mb-2`} icon={<FcClock className="h-full w-full" />} />
        <Button className={`h-full w-16 lg:h-12 lg:w-12 flex justify-center items-center shadow-sm rounded-xl bg-white appearance-none p-1 lg:mr-0 lg:mb-2`} icon={<FcCalendar className="h-full w-full" />} />
        <Button className={`h-full w-16 lg:h-12 lg:w-12 flex justify-center items-center shadow-sm rounded-xl bg-white appearance-none p-1 lg:mr-0 lg:mb-2`} icon={<FcSearch className="h-full w-full" />} />
        <Button className={`h-full w-16 lg:h-12 lg:w-12 flex justify-center items-center shadow-sm rounded-xl bg-white appearance-none p-1 lg:mr-0 lg:mb-2`} icon={<FcSettings className="h-full w-full" />} />
      </>}
      <Button onClick={() => setIconsHidden(!iconsHidden)} className={`h-full w-1/5 lg:h-12 p-1 lg:w-12 hidden shadow-sm bg-white rounded-xl appearance-none ${props.dark ? "text-white" : "text-gray-700"} lg:flex lg:items-center lg:justify-center `} icon={iconsHidden ? <FcCollapse className="h-full w-full" /> : <FcExpand className="h-full w-full" />} />
    </div>
  )
}


