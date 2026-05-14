import { execSync } from 'child_process';

const args = process.argv.slice(2);
const command = args[0];
const subArgs = args.slice(1).join(' ');

const helpMessage = `
🚀 Database Migration Manager

Usage: pnpm migration <command> [options]

Commands:
  generate <name>   Generate a new migration with the specified name
  run               Execute all pending migrations
  revert            Rollback the last executed migration
  show              Display the status of all migrations

Examples:
  pnpm migration generate AddUserTable
  pnpm migration run
  pnpm migration show
`;

if (!command || command === 'help') {
  console.log(helpMessage);
  process.exit(0);
}

const dataSourcePath = 'src/database/data-source.ts';

try {
  switch (command) {
    case 'generate':
      execSync(`ts-node scripts/typeorm-generate.ts ${subArgs}`, { stdio: 'inherit' });
      break;
    case 'run':
      execSync(`pnpm typeorm migration:run -d ${dataSourcePath}`, { stdio: 'inherit' });
      break;
    case 'revert':
      execSync(`pnpm typeorm migration:revert -d ${dataSourcePath}`, { stdio: 'inherit' });
      break;
    case 'show':
      execSync(`pnpm typeorm migration:show -d ${dataSourcePath}`, { stdio: 'inherit' });
      break;
    default:
      console.log(`❌ Unknown command: "${command}"`);
      console.log(helpMessage);
      process.exit(1);
  }
} catch (error) {
  process.exit(1);
}
