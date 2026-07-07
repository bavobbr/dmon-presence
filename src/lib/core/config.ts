import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import YAML from 'yaml';
import type { DatasetConfig } from './types.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function loadDatasetConfig(path: string): DatasetConfig {
  const absolute = resolve(path);
  const raw = YAML.parse(readFileSync(absolute, 'utf8')) as DatasetConfig;
  for (const key of ['id', 'displayName', 'season', 'startDate', 'endDate', 'timezone', 'rosterPath', 'sportlinkPdfDirectory'] as const) {
    if (!raw[key]) throw new Error(`Dataset config missing ${key}`);
  }
  if (!DATE.test(raw.startDate) || !DATE.test(raw.endDate) || raw.startDate > raw.endDate) throw new Error('Invalid dataset date range');
  if (!raw.twizzit?.groupName || raw.twizzit.organizationId == null || !raw.sportlink?.teamName) throw new Error('Dataset config missing source settings');
  const base = dirname(absolute);
  const root = resolve(base, '../..');
  return { ...raw, rosterPath: resolve(root, raw.rosterPath), sportlinkPdfDirectory: resolve(root, raw.sportlinkPdfDirectory) };
}
