#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { executeCommand } from './engine/execute.js';
import { executeCleanCommand } from './engine/executeClean.js';
import { compareExecutions } from './engine/compare.js';
import { detectCandidates } from './engine/candidates.js';
import { perturbCandidate } from './engine/perturb.js';


const program = new Command();

program
  .name('coldproof')
  .description('ColdProof: Execution-based environment causality debugger')
  .version('0.1.1');

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

program
  .command('investigate')
  .description('Compare environments and identify environmental candidates causing divergence')
  .argument('<command>', 'The command to run')
  .addHelpText('after', `
Examples:
  $ coldproof investigate '<your command>'
  $ coldproof investigate './script.sh'

Guidance:
  - Enclose the command in quotes if it contains spaces.
  - The command must fail in a clean environment to establish causality.
  - Make sure you are running this from the root of your project workspace.
`)
  .action(async (command: string) => {
    console.log(chalk.bold('ColdProof Investigation\n'));

    console.log(chalk.gray('1. Warm execution'));
    let warmResult;
    try {
      warmResult = await executeCommand(command);
      const icon = warmResult.exitCode === 0 ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
      console.log(`   ${icon}`);
    } catch (err: any) {
      console.log(`   ${chalk.red('✗ CRASHED')} (${err.message})`);
      process.exit(1);
    }

    console.log(chalk.gray('\n2. Clean execution'));
    let cleanResult;
    try {
      cleanResult = await executeCleanCommand(command, process.cwd());
      const icon = cleanResult.exitCode === 0 ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
      console.log(`   ${icon}`);
    } catch (err: any) {
      console.log(`   ${chalk.red('✗ CRASHED')} (${err.message})`);
      process.exit(1);
    }

    const comparison = compareExecutions(warmResult, cleanResult);
    console.log(chalk.gray('\n3. Behavioral comparison'));

    if (comparison.behaviorChanged) {
      console.log(`   ${chalk.yellow('⚠ ' + comparison.classification)}`);
    } else {
      console.log(`   ${chalk.green('✓ ' + comparison.classification)}`);
    }

    let detectedCandidates: any[] = [];
    let finalPerturbationResult: any = null;

    if (comparison.classification === 'WARM_PASS_CLEAN_FAIL') {
      console.log(chalk.gray('\n4. Environment candidates\n'));
      const spinner = ora('Detecting candidates...').start();
      detectedCandidates = await detectCandidates(command, process.cwd(), cleanResult);
      spinner.stop();

      if (detectedCandidates.length === 0) {
        console.log('   No candidates found.');
      } else {
        const byType = detectedCandidates.reduce((acc, c) => {
          if (!acc[c.type]) acc[c.type] = [];
          acc[c.type].push(c);
          return acc;
        }, {} as Record<string, typeof detectedCandidates>);

        for (const [type, group] of Object.entries(byType) as [string, any[]][]) {
          console.log(`   ${chalk.bold(type)}`);
          for (const c of group) {
            console.log(`   ${chalk.cyan(c.name)}`);
            if (c.type === 'EXECUTABLE') {
              console.log(`   Warm: ${c.warmValue ? 'available' : 'unavailable'} ${c.observed ? '+ invoked' : ''}`);
              console.log(`   Clean: ${c.cleanValue ? 'available' : 'unavailable'}`);
            } else {
              console.log(`   Warm: ${c.warmValue}`);
              console.log(`   Clean: ${c.cleanValue}`);
            }
            console.log();
          }
        }
      }

      console.log(chalk.gray('5. Perturbation\n'));

      const testableCandidates = detectedCandidates
        .filter(c => c.observed)
        .sort((a, b) => {
          if (a.type === 'PROJECT_LOCAL_EXECUTABLE' && b.type !== 'PROJECT_LOCAL_EXECUTABLE') return -1;
          if (b.type === 'PROJECT_LOCAL_EXECUTABLE' && a.type !== 'PROJECT_LOCAL_EXECUTABLE') return 1;
          return 0;
        });

      if (testableCandidates.length > 0) {
        for (let i = 0; i < testableCandidates.length; i++) {
          const targetCandidate = testableCandidates[i];
          console.log(`   Candidate (${i + 1}/${testableCandidates.length}):\n   ${chalk.cyan(targetCandidate.name)}`);

          const perturbationResult = await perturbCandidate(
            targetCandidate,
            command,
            warmResult,
            cleanResult,
            comparison,
            process.cwd()
          );
          const safePerturbationResult = {
            ...perturbationResult,
            candidate: {
              name: targetCandidate.name,
              type: targetCandidate.type,
              observed: targetCandidate.observed
            }
          };

          finalPerturbationResult = safePerturbationResult;

          // @ts-ignore - attaching to generic candidate object for JSON payload
          targetCandidate.perturbationResult = safePerturbationResult;

          if (perturbationResult.evidence.candidatePerturbed) {
            const pIcon = perturbationResult.evidence.perturbedFailed ? chalk.red('✗ FAIL') : chalk.green('✓ PASS');
            console.log(`\n   Perturbed execution:\n   ${pIcon}`);

            console.log(chalk.gray('\n6. Evidence\n'));

            let eIcon = '';
            switch (perturbationResult.evidence.classification) {
              case 'CONFIRMED': eIcon = chalk.green.bold('CONFIRMED'); break;
              case 'STRONG_EVIDENCE': eIcon = chalk.green.bold('STRONG_EVIDENCE'); break;
              case 'PARTIAL_EVIDENCE': eIcon = chalk.yellow.bold('PARTIAL_EVIDENCE'); break;
              case 'NOT_IMPLICATED': eIcon = chalk.yellow.bold('NOT_IMPLICATED'); break;
              default: eIcon = chalk.gray.bold('UNABLE_TO_TEST'); break;
            }

            console.log(`   ${eIcon}\n`);
            console.log(`   ${perturbationResult.evidence.candidateObserved ? '✓' : '✗'} ${targetCandidate.name} was observed during warm execution`);

            if (targetCandidate.type === 'PROJECT_LOCAL_EXECUTABLE') {
              console.log(`   ${perturbationResult.evidence.candidatePerturbed ? '✓' : '✗'} ${targetCandidate.name} was restored in clean execution`);
              if (perturbationResult.evidence.classification === 'PARTIAL_EVIDENCE') {
                console.log(`   ✓ original missing-executable failure disappeared`);
                console.log(`   ✓ execution progressed further`);
                console.log(`   ✓ execution still failed for another reason`);
              } else {
                console.log(`   ${!perturbationResult.evidence.perturbedFailed ? '✓' : '✗'} perturbed execution succeeded`);
              }
            } else {
              console.log(`   ${perturbationResult.evidence.candidatePerturbed ? '✓' : '✗'} ${targetCandidate.name} was blocked in warm execution`);
              console.log(`   ${perturbationResult.evidence.perturbedFailed ? '✓' : '✗'} perturbed execution failed`);
              console.log(`   ${perturbationResult.evidence.sameExitCode ? '✓' : '✗'} same exit code boundary as clean failure`);
              console.log(`   ${perturbationResult.evidence.failureOutputComparable ? '✓' : '✗'} textual failure signature matched\n`);
            }

            if (targetCandidate.type === 'PROJECT_LOCAL_EXECUTABLE') {
              if (perturbationResult.evidence.perturbedFailed) {
                console.log(chalk.gray('\n--- CLEAN STDERR ---'));
                console.log(cleanResult.stderr);
                console.log(chalk.gray('--- PERTURBED STDERR ---'));
                console.log(perturbationResult.perturbedWarm?.stderr || '(empty)');
              }
            } else {
              if (!perturbationResult.evidence.failureOutputComparable) {
                console.log(chalk.gray('\n--- CLEAN STDERR ---'));
                console.log(cleanResult.stderr);
                console.log(chalk.gray('--- PERTURBED STDERR ---'));
                console.log(perturbationResult.perturbedWarm?.stderr);
              }
            }

            console.log(chalk.gray('\n7. Conclusion\n'));
            const cls = perturbationResult.evidence.classification;

            if (cls === 'CONFIRMED' || cls === 'STRONG_EVIDENCE') {
               if (cls === 'CONFIRMED') {
                 console.log(`   ${chalk.cyan(targetCandidate.name)}: Environmental cause confirmed.`);
               } else {
                 console.log(`   ${chalk.cyan(targetCandidate.name)}: Strong evidence supports this environmental cause.`);
                 console.log(`\n   ${chalk.yellow('Note:')} The exit codes match but the failure text differs.`);
                 console.log(`   ColdProof classifies this as STRONG_EVIDENCE rather than CONFIRMED.`);
               }
               console.log(chalk.green(`\n   Stopping investigation: Strong existing evidence established.`));
               break;
            } else if (cls === 'PARTIAL_EVIDENCE') {
               console.log(`   ${chalk.cyan(targetCandidate.name)}: This candidate contributed to the observed failure, but the sole/root cause was not isolated.`);
               console.log(`\n   ${chalk.yellow('Note:')} The original failure disappeared and execution progressed further,`);
               console.log('   but a new failure occurred.');
               if (i < testableCandidates.length - 1) {
                 console.log(chalk.yellow(`\n   Continuing investigation.`));
               } else {
                 console.log(chalk.yellow(`\n   Investigation complete. This candidate contributed to the observed failure, but the sole/root cause was not isolated. No additional candidates remain.`));
               }
            } else {
               console.log(`   ${chalk.cyan(targetCandidate.name)}: This candidate is not supported as the environmental cause.`);
               if (i < testableCandidates.length - 1) {
                 console.log(chalk.gray(`\n   Continuing investigation.`));
               } else {
                 console.log(chalk.gray(`\n   Investigation complete. No additional candidates remain.`));
               }
            }
          } else {
            console.log('   Perturbation failed or was not applied.');
            if (i < testableCandidates.length - 1) {
              console.log(chalk.gray(`\n   Continuing investigation.`));
            } else {
              console.log(chalk.gray(`\n   Investigation complete. No additional candidates remain.`));
            }
          }
          console.log('\n----------------------------------------\n');
        }
      } else {
        console.log('   No testable environment candidates found for perturbation.');
        console.log('   Causality not established.');
      }
    } else {
      console.log(chalk.gray('\n4. Environment candidates\n'));
      console.log('   No behavioral failure to investigate.');
    }

    // Attempt to upload to the backend if configured
    const token = process.env.COLDPROOF_TOKEN;
    const projectId = process.env.COLDPROOF_PROJECT_ID;

    if (token && projectId && comparison.behaviorChanged) {
      console.log(chalk.gray('\n8. Telemetry\n'));
      const spinner = ora('Uploading investigation results to ColdProof Cloud...').start();
      try {
        const payload = {
          projectId,
          command,
          comparison,
          candidates: comparison.classification === 'WARM_PASS_CLEAN_FAIL' ? detectedCandidates : [],
          perturbationResult: finalPerturbationResult
        };

        const apiUrl = process.env.COLDPROOF_API_URL || 'http://127.0.0.1:3001';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`${apiUrl}/api/investigations`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json() as any;
          spinner.succeed(`Investigation uploaded successfully: ${data.id}`);
        } else {
          const err = await res.text();
          spinner.fail(`Evidence upload failed. Your local investigation completed successfully, but the result could not be saved. (Error: ${res.status} ${res.statusText})`);
        }
      } catch (e: any) {
        spinner.fail(`Evidence upload failed. Your local investigation completed successfully, but the result could not be saved. (${e.message})`);
      }
    }
  });

program.parse();
