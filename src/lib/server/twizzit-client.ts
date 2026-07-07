import { setTimeout as delay } from 'node:timers/promises';
import { parseActivityDetails } from './twizzit-parser.js';

const BASE='https://app.twizzit.com';
function cookies(headers:Headers){ return (headers.getSetCookie?.()??[headers.get('set-cookie')??'']).map(x=>x.split(';')[0]).filter(Boolean).join('; '); }
async function timedFetch(url:string,init:RequestInit={}){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20_000);try{return await fetch(url,{...init,signal:controller.signal})}finally{clearTimeout(timer)}}

export class TwizzitSiteClient {
  private cookie='';
  constructor(private username:string,private password:string){}
  async login(){const page=await timedFetch(`${BASE}/login`);if(!page.ok)throw new Error(`Twizzit login page: HTTP ${page.status}`);const html=await page.text();const token=html.match(/name="_?token"\s+value="([^"]+)"/)?.[1]??html.match(/value="([^"]+)"\s+name="_?token"/)?.[1];if(!token)throw new Error('Twizzit CSRF token not found');const initial=cookies(page.headers);const res=await timedFetch(`${BASE}/v2/login`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',...(initial?{cookie:initial}:{})},body:new URLSearchParams({username:this.username,password:this.password,token}),redirect:'manual'});this.cookie=[initial,cookies(res.headers)].filter(Boolean).join('; ');if(!this.cookie)throw new Error(`Twizzit site login failed (HTTP ${res.status})`);}
  private async get(path:string,retry=true):Promise<string>{if(!this.cookie)await this.login();const res=await timedFetch(`${BASE}${path}`,{headers:{cookie:this.cookie},redirect:'manual'});if((res.status===302||res.status===403)&&retry){this.cookie='';await this.login();return this.get(path,false)}if(!res.ok)throw new Error(`Twizzit request failed: HTTP ${res.status}`);return res.text()}
  async activity(id:string){const html=await this.get(`/v2/activity/details?activity=${encodeURIComponent(id)}&view=info`);await delay(100);return parseActivityDetails(id,html)}
  async groups(organizationId:number|string,seasonId:number|string){const raw=await this.get(`/v2/ajax/group/search?seasonId=${seasonId}&organizationId=${organizationId}&active=1&teamColumns[]=name`);const payload=JSON.parse(raw) as {teamResults:string};const parts=payload.teamResults.split(/onclick="groupRelation\((\d+)\)"/);const out:Array<{id:string;name:string}>=[];for(let i=1;i<parts.length;i+=2){const name=parts[i+1]?.match(/dl-cell[^>]*>\s*([^<]+)/)?.[1]?.trim();if(name)out.push({id:parts[i],name})}return out}
  async feed(groupId:string,startDate:string){const raw=await this.get(`/v2/ajax/feed?favoriteId=${groupId}&favoriteType=group&startDate=${startDate}&direction=future&limit=500`);const parts=raw.split(/data-id="(\d+)"/);const out:Array<{id:string;date:string;name:string}>=[];for(let i=1;i<parts.length;i+=2){const block=parts[i+1]??'';const date=block.match(/data-date="([^"]+)"/)?.[1],name=block.match(/<strong>([^<]+)<\/strong>/)?.[1]?.trim();if(date&&name)out.push({id:parts[i],date,name})}return out}
}
