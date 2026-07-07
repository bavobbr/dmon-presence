export function matchEventByDate<T extends {localDate:string}>(date:string,candidates:T[]):{status:'matched';value:T}|{status:'unmatched'|'ambiguous'} {
  const matches=candidates.filter(c=>c.localDate===date);return matches.length===1?{status:'matched',value:matches[0]}:{status:matches.length?'ambiguous':'unmatched'};
}
