import { Types, INIT, DELAY, ONROUTE, OFFROUTE, END, ONSTOP, ARRIVAL, DEPARTURE } from "./KV6Common";

export interface KV6Generic {
  VV_TM_PUSH: VV_TM_PUSH
}

interface VV_TM_PUSH {
  SubscriberID: string,
  Version: string,
  DossierName: string,
  Timestamp: string,
  KV6posinfo: ArrivaTypes
}

interface ArrivaTypes {
  ONSTOP: Array<ONSTOP>,
  INIT: Array<INIT>,
  DELAY: Array<DELAY>,
  ONROUTE: Array<ONROUTE>,
  OFFROUTE: Array<OFFROUTE>,
  END: Array<END>,
  ARRIVAL : Array<ARRIVAL>,
  DEPARTURE: Array<DEPARTURE>
}

