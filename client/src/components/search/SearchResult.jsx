import React from 'react'

export class SearchResult extends React.Component {
  result;
  color;
  company;
  constructor(props) {
    super(props);
    this.result = props.result;
    this.CheckCompanyAndColor();
  }
  
  CheckCompanyAndColor() {
    this.company = this.result.subCompany === "Onbekend" ? this.result.subCompany : this.result.company;

    switch (this.company) {
      case "IFF":
        this.color = "#FFCD18"
        break;
      case "TWENTS":
        this.color = "#CC0023";
        break;
      case "KEOLIS":
        this.color = "#00AAC3";
        break;
      default:
        this.color = "#FFFFFF";
        break;
    }
  }

  render () {
    return (
      <article className={`relative overflow-hidden ${!this.props.dark ? "bg-white-trans" : "bg-black-trans"} flex space-x-4 backdrop-blur rounded-xl shadow-md  md:max-w-md md:w-full md:mr-0 sm:max-w-xs sm:max-h-xs z-10 ml-1 m-1`}>
        <div className="flex min-width-icon w-1/6" style={{ backgroundColor: this.color}}>
          <img src={`/images/original/${this.company}.png`} alt="" className="h-8 m-auto" />
        </div>
        <div className="p-2">
        <div className="min-w-0 relative flex-auto sm:pr-20 lg:pr-0 xl:pr-20">
          <h3 className={`text-md font-semibold ${this.props.dark && "text-white"} mb-0.5`}>
            { this.result.routeLongName }
          </h3>
        </div>
        </div>
        
        
      </article>
    )
  }
  
}
