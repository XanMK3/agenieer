#!/usr/bin/env node
import { Command } from 'commander';
import { registerStandardsCommands } from './tools/standards/index.js';

const program = new Command();

program
  .name('agenieer')
  .description('Extensible command-line toolkit for agentic software engineering')
  .version('0.1.0')
  .option('--cwd <path>', 'Target directory other than current working directory');

registerStandardsCommands(program);

program.parse(process.argv);
