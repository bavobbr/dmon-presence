import type { LayoutServerLoad } from './$types';
import { selectedDataset } from '$lib/server/queries';
export const load:LayoutServerLoad=({url})=>selectedDataset(url.searchParams.get('dataset'));
