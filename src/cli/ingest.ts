import 'dotenv/config';
import { loadDatasetConfig } from '../lib/core/config.js';
import { ingest } from '../lib/server/ingestion.js';

const args=process.argv.slice(2);const configArg=args[args.indexOf('--dataset')+1];if(!configArg){console.error('Usage: npm run ingest -- --dataset config/datasets/example.yaml [--skip-twizzit]');process.exit(2)}
try{const result=await ingest(loadDatasetConfig(configArg),{skipTwizzit:args.includes('--skip-twizzit')});console.log(`Roster: ${result.roster.players} core players`);console.log(`Sportlink: ${result.sportlink.imported} imported, ${result.sportlink.skipped} unchanged, ${result.sportlink.failed} failed`);console.log(`Twizzit: ${result.twizzit.events} events, ${result.twizzit.failed} failed`);console.log(`Open data-quality issues: ${result.issues}`);if(result.sportlink.failed||result.twizzit.failed)process.exitCode=1}catch(e){console.error(`Ingestion failed: ${e instanceof Error?e.message:'unknown error'}`);process.exitCode=1}
