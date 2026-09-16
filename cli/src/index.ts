#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { executeCommand } from './engine/execute.js';
import { executeCleanCommand } from './engine/executeClean.js';

const program = new Command();

program
  .name('coldproof')
  .description('ColdProof: Execution-based environment causality debugger')
  .version('0.1.0');

program
  .command('run')
  .description('Run a command and capture execution telemetry')
  .argument('<command>', 'The command to run')
  .option('-c, --clean', 'Execute command in a clean Docker environment')
  .action(async (command: string, options: { clean?: boolean }) => {
    const mode = options.clean ? chalk.blue('clean') : chalk.cyan('warm');
    const spinner = ora(`Executing (${mode}): ${chalk.cyan(command)}`).start();
    
    try {
      const result = options.clean
        ? await executeCleanCommand(command, process.cwd())
        : await executeCommand(command);

      
      if (result.exitCode === 0) {
        spinner.succeed(`Execution successful (${result.durationMs.toFixed(2)}ms)`);
      } else {
        spinner.fail(`Execution failed with exit code ${result.exitCode} (${result.durationMs.toFixed(2)}ms)`);
      }

      console.log();
      console.log(chalk.bold.blue('--- STDOUT ---'));
      console.log(result.stdout || chalk.gray('(empty)'));
      console.log();
      
      if (result.stderr) {
        console.log(chalk.bold.red('--- STDERR ---'));
        console.log(result.stderr);
        console.log();
      }

      // We exit with the same code the command exited with.
      process.exit(result.exitCode ?? 1);
    } catch (err: any) {
      spinner.fail(`Failed to execute command: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
