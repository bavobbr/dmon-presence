import type { PageServerLoad } from './$types';import {ranking,selectedDataset} from '$lib/server/queries';
export const load:PageServerLoad=({url})=>{const {id}=selectedDataset(url.searchParams.get('dataset'));return {datasetId:id,rows:id?ranking(id):[]}};
