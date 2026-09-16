#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { executeCommand } from './engine/execute.js';
import { executeCleanCommand } from './engine/executeClean.js';
import { compareExecutions } from './engine/compare.js';

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

program
  .command('compare')
  .description('Compare execution of a command between warm and clean environments')
  .argument('<command>', 'The command to run')
  .action(async (command: string) => {
    const warmSpinner = ora(`Executing (warm): ${chalk.cyan(command)}`).start();
    let warmResult;
    try {
      warmResult = await executeCommand(command);
      warmSpinner.succeed(`Warm execution complete (${warmResult.durationMs.toFixed(2)}ms)`);
    } catch (err: any) {
      warmSpinner.fail(`Warm execution crashed: ${err.message}`);
      process.exit(1);
    }

    const cleanSpinner = ora(`Executing (clean): ${chalk.cyan(command)}`).start();
    let cleanResult;
    try {
      cleanResult = await executeCleanCommand(command, process.cwd());
      cleanSpinner.succeed(`Clean execution complete (${cleanResult.durationMs.toFixed(2)}ms)`);
    } catch (err: any) {
      cleanSpinner.fail(`Clean execution crashed: ${err.message}`);
      process.exit(1);
    }

    const comparison = compareExecutions(warmResult, cleanResult);

    console.log();
    console.log(chalk.bold('--- COMPARISON RESULT ---'));
    console.log(`Classification:   ${chalk.yellow(comparison.classification)}`);
    console.log(`Behavior Changed: ${comparison.behaviorChanged ? chalk.red('YES') : chalk.green('NO')}`);

    if (comparison.failureSignature) {
      console.log();
      console.log(chalk.bgRed.white.bold(' ENVIRONMENTAL FAILURE SIGNATURE '));
      console.log(chalk.gray(`Timestamp: ${comparison.failureSignature.timestamp}`));
      console.log(`Warm Exit Code:  ${comparison.failureSignature.warmExitCode}`);
      console.log(`Clean Exit Code: ${comparison.failureSignature.cleanExitCode}`);
      console.log(chalk.gray('--- WARM STDOUT ---'));
      console.log(comparison.failureSignature.warmStdout || '(empty)');
      console.log(chalk.gray('--- CLEAN STDOUT ---'));
      console.log(comparison.failureSignature.cleanStdout || '(empty)');
      console.log(chalk.gray('--- WARM STDERR ---'));
      console.log(comparison.failureSignature.warmStderr || '(empty)');
      console.log(chalk.gray('--- CLEAN STDERR ---'));
      console.log(comparison.failureSignature.cleanStderr || '(empty)');
    }
  });

program.parse();
