import { execSync } from 'child_process';

const args = process.argv.slice(2);
const providedName = args[0];
const dataSourcePath = 'src/database/data-source.ts';
const migrationsDir = 'src/database/migrations';

if (!providedName) {
  console.error('❌ Error: You must provide a name for the migration.');
  console.log('Usage: pnpm migration generate <MigrationName>');
  console.log('Example: pnpm migration generate AddUserTable');
  process.exit(1);
}

const command = `pnpm typeorm migration:generate -d ${dataSourcePath} ${migrationsDir}/${providedName}`;

console.log(`🚀 Generating migration: ${providedName}...`);

try {
  execSync(command, { stdio: 'inherit' });
  console.log(`✅ Migration generated successfully.`);
} catch (error) {
  console.error('❌ Error generating migration.');
  process.exit(1);
}
