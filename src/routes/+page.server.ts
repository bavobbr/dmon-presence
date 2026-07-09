import type { PageServerLoad } from './$types';import {combinedRanking,ranking,selectedDataset} from '$lib/server/queries';
export const load:PageServerLoad=({url})=>{const {id,isAll}=selectedDataset(url.searchParams.get('dataset'));return {datasetId:id,isAll,rows:isAll?combinedRanking():id?ranking(id):[]}};
