/* This example requires Tailwind CSS v2.0+ */
import { Fragment, useState, useEffect } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/solid'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export const Dropdown = (props) => {
  const [activeFilters, setActiveFilters] = useState([]);
  const [open, setOpen] = useState(false);
  const companies = props.companies;


  return (
    <Menu as="div" className="relative inline-block text-left ml-2">
     <>
          <div>
            <button onClick={() => setOpen(!open)} className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500">
              Filter
              <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <Transition
            show={open}
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items
              static
              className={`origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none`}
            >
              {/* FOR DIVIDER <div className="py-1"></div> */}
              <div className="py-1">
                { companies && Object.entries(companies).map(([originalCompany, company]) => {
                  return (
                    <Menu.Item key={company}>
                      {({ active }) => (
                        <span href={`#${company}`} className={classNames(active ? 'bg-gray-100 text-gray-900' : 'text-gray-700','block px-4 py-2 text-sm')}
                          onClick={() =>  { 
                            props.setFilter({ company: originalCompany }); 
                            if(!activeFilters.includes(originalCompany))
                              setActiveFilters([...activeFilters, originalCompany])
                            else
                              setActiveFilters(activeFilters.filter(name => name !== originalCompany))
                            }}>
                          
                          {company}
                          {!activeFilters.includes(originalCompany) && <CheckIcon className="w-3 mb-1 inline-block ml-2" />}
                        </span>
                      )}
                    </Menu.Item>
                  )
                })}
                
              </div>
             
            </Menu.Items>
          </Transition>
        </>
    </Menu>
  )
}
