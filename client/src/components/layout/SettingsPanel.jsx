import React from 'react'

export const SettingsPanel = (props) => {

  const open = props.open;

  const setUpdateSpeed = (speed) => {
    props.connectToSocket(speed)
  }

  return (
    <div className={`z-20 flex flex-col lg:relative h-96 w-full lg:w-96 bg-white-trans backdrop-blur rounded-xl overflow-hidden ${!open && 'hidden'}`}>
      <div className="topbar bg-white p-4 text-xl">
        Instellingen
      </div>
      <div className="content p-4 h-full flex flex-col">
        <div className="group flex flex-col">
          <label>Update snelheid</label>
          <select onChange={e => setUpdateSpeed(e.target.value)} className="rounded-xl p-2 mt-2 focus:outline-none focus:border-transparent">
            <option value="superfast">Super snel</option>
            <option value="veryfast">Zeer snel</option>
            <option value="fast">Snel</option>
            <option value="normal">Normaal</option>
            <option value="slow">Langzaam</option>
          </select>
        </div>
      </div>
    </div>
  )
}
