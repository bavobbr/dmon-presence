import ExcelJS from 'exceljs';
import { datasets, ranking } from './queries.js';

const columns: Array<{ header: string; key: string; width?: number }> = [
  { header: 'First name', key: 'firstName', width: 16 },
  { header: 'Last name', key: 'lastName', width: 18 },
  { header: 'Shirt number', key: 'shirtNumber', width: 8 },
  { header: 'Training attended', key: 'trainingNum', width: 10 },
  { header: 'Training scheduled', key: 'trainingDen', width: 10 },
  { header: 'Sportlink matches played', key: 'appearancesNum', width: 10 },
  { header: 'Sportlink matches scheduled', key: 'appearancesDen', width: 10 },
  { header: 'Twizzit matches available', key: 'availabilityNum', width: 10 },
  { header: 'Twizzit matches scheduled', key: 'availabilityDen', width: 10 },
  { header: 'Home appearances played', key: 'homeAppearancesNum', width: 10 },
  { header: 'Home appearances scheduled', key: 'homeAppearancesDen', width: 10 },
  { header: 'Away appearances played', key: 'awayAppearancesNum', width: 10 },
  { header: 'Away appearances scheduled', key: 'awayAppearancesDen', width: 10 },
  { header: 'Home availability yes', key: 'homeAvailabilityNum', width: 10 },
  { header: 'Home availability scheduled', key: 'homeAvailabilityDen', width: 10 },
  { header: 'Away availability yes', key: 'awayAvailabilityNum', width: 10 },
  { header: 'Away availability scheduled', key: 'awayAvailabilityDen', width: 10 },
  { header: 'Training admin answered', key: 'trainingAdminNum', width: 10 },
  { header: 'Training admin scheduled', key: 'trainingAdminDen', width: 10 },
  { header: 'Match admin answered', key: 'matchAdminNum', width: 10 },
  { header: 'Match admin scheduled', key: 'matchAdminDen', width: 10 },
  { header: 'Overall admin answered', key: 'overallAdminNum', width: 10 },
  { header: 'Overall admin scheduled', key: 'overallAdminDen', width: 10 }
];

function sheetName(displayName: string, season: string, used: Set<string>): string {
  const raw = `${displayName} ${season}`.replace(/[\\/*?:[\]]/g, ' ').trim();
  let base = raw.slice(0, 31);
  let name = base;
  let n = 2;
  while (used.has(name.toLowerCase())) { const suffix = ` (${n++})`; name = base.slice(0, 31 - suffix.length) + suffix; }
  used.add(name.toLowerCase());
  return name;
}

export async function buildRosterWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'D-MON Presence';
  workbook.created = new Date();
  const used = new Set<string>();
  for (const dataset of datasets()) {
    const sheet = workbook.addWorksheet(sheetName(dataset.displayName, dataset.season, used));
    sheet.columns = columns;
    sheet.getRow(1).font = { bold: true };
    for (const player of ranking(dataset.id).filter((p: any) => p.kind === 'core')) {
      const m = player.metrics;
      sheet.addRow({
        firstName: player.firstName,
        lastName: player.lastName,
        shirtNumber: player.shirtNumber ?? '',
        trainingNum: m.training.numerator, trainingDen: m.training.denominator,
        appearancesNum: m.appearances.numerator, appearancesDen: m.appearances.denominator,
        availabilityNum: m.availability.numerator, availabilityDen: m.availability.denominator,
        homeAppearancesNum: m.homeAppearances.numerator, homeAppearancesDen: m.homeAppearances.denominator,
        awayAppearancesNum: m.awayAppearances.numerator, awayAppearancesDen: m.awayAppearances.denominator,
        homeAvailabilityNum: m.homeAvailability.numerator, homeAvailabilityDen: m.homeAvailability.denominator,
        awayAvailabilityNum: m.awayAvailability.numerator, awayAvailabilityDen: m.awayAvailability.denominator,
        trainingAdminNum: m.trainingAdmin.numerator, trainingAdminDen: m.trainingAdmin.denominator,
        matchAdminNum: m.matchAdmin.numerator, matchAdminDen: m.matchAdmin.denominator,
        overallAdminNum: m.overallAdmin.numerator, overallAdminDen: m.overallAdmin.denominator
      });
    }
  }
  if (!workbook.worksheets.length) workbook.addWorksheet('No data');
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
