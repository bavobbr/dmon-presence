const BASE='https://app.twizzit.com';
type Organization={id:number;name:string}; type Season={id:number;name:string;'start-date':string;'end-date':string};
export type ApiGroup={id:number;name:string;'short-name':string;season:Season};
export type ApiEvent={id:number;name:string|null;start:string;end:string;address?:string;score?:string;'event-groups'?:Array<{'group-id':number;'group-name':string;'is-home-team':boolean}>};

async function timedFetch(url:string,init:RequestInit={}){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20_000);try{return await fetch(url,{...init,signal:controller.signal})}finally{clearTimeout(timer)}}
export class TwizzitApi {
  private token=''; constructor(private username:string,private password:string){}
  private async authenticate(){const res=await timedFetch(`${BASE}/v2/api/authenticate`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:this.username,password:this.password})});if(!res.ok)throw new Error(`Twizzit API authentication failed: HTTP ${res.status}`);const body=await res.json() as {token?:string};if(!body.token)throw new Error('Twizzit API authentication returned no token');this.token=body.token;}
  private async get<T>(path:string,params:Record<string,string|number|boolean|undefined>={}){if(!this.token)await this.authenticate();const url=new URL(`${BASE}${path}`);for(const [k,v] of Object.entries(params))if(v!==undefined)url.searchParams.append(k,String(v));let res=await timedFetch(url.toString(),{headers:{authorization:`Bearer ${this.token}`}});if(res.status===401){this.token='';await this.authenticate();res=await timedFetch(url.toString(),{headers:{authorization:`Bearer ${this.token}`}})}if(!res.ok)throw new Error(`Twizzit API ${path} failed: HTTP ${res.status}`);return res.json() as Promise<T>}
  organizations(){return this.get<Organization[]>('/v2/api/organizations')}
  seasons(org:number){return this.get<Season[]>('/v2/api/seasons',{'organization-ids[]':org})}
  groups(org:number,season:number,offset=0){return this.get<ApiGroup[]>('/v2/api/groups',{'organization-ids[]':org,'season-id':season,limit:100,offset})}
  async events(org:number,start:string,end:string,offset=0){const rows=await this.get<Array<ApiEvent&{eventGroups?:Array<{groupId:number;groupName:string;isHomeTeam:boolean}>}>>('/v2/api/events',{'organization-ids[]':org,'start-date':start,'end-date':end,limit:100,offset});return rows.map(e=>({...e,'event-groups':(e['event-groups']??e.eventGroups??[]).map((g:any)=>({'group-id':g['group-id']??g.groupId,'group-name':g['group-name']??g.groupName,'is-home-team':g['is-home-team']??g.isHomeTeam}))}))}
  async discover(groupName:string,seasonLabel:string,organizationSetting:number|'discover'){
    const organizations=await this.organizations();const candidates=organizationSetting==='discover'?organizations:organizations.filter(o=>o.id===organizationSetting);
    const seasonKey=(value:string)=>value.replace(/\D+/g,'-').replace(/^-|-$/g,'');
    for(const organization of candidates){const seasons=await this.seasons(organization.id);for(const season of seasons.filter(s=>seasonKey(s.name)===seasonKey(seasonLabel))){const groups=await this.groups(organization.id,season.id);const group=groups.find(g=>g.name===groupName||g['short-name']===groupName);if(group)return {organization,season,group}}}
    throw new Error(`Twizzit group ${groupName} for season ${seasonLabel} not found`);
  }
  async allEvents(org:number,start:string,end:string){const out:ApiEvent[]=[];for(let offset=0;;offset+=100){const page=await this.events(org,start,end,offset);out.push(...page);if(page.length<100)break}return out}
}
