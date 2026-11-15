import { Command } from 'commander';
import { runDetect } from './commands/detect.js';
import { runInit } from './commands/init.js';
import { resolveTargetRoot } from '@/core/project.js';

export function registerStandardsCommands(program: Command): void {
  const standards = program
    .command('standards')
    .description('Manage engineering standards in the repository');

  standards
    .command('detect')
    .description('Detect technologies and report applicable standards')
    .action(async () => {
      const globalOpts = program.opts();
      const targetRoot = await resolveTargetRoot(globalOpts.cwd);
      await runDetect(targetRoot);
    });

  standards
    .command('init')
    .description('Initialize standards in the repository')
    .option('--dry-run', 'Preview changes without writing')
    .option('--non-interactive', 'Do not prompt for input')
    .action(async (options) => {
      const globalOpts = program.opts();
      const targetRoot = await resolveTargetRoot(globalOpts.cwd);
      const code = await runInit({
        dryRun: options.dryRun,
        nonInteractive: options.nonInteractive,
        targetRoot,
      });
      if (code !== 0) {
        process.exit(code);
      }
    });
}
