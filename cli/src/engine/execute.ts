import { spawn } from 'node:child_process';
import type { ExecutionResult } from '../types.js';

export async function executeCommand(command: string, customEnv?: NodeJS.ProcessEnv): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    let stdout = '';
    let stderr = '';

    // Spawn the command in a shell
    const child = spawn(command, { shell: true, env: customEnv || process.env });

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const endTime = performance.now();
      resolve({
        command,
        stdout,
        stderr,
        exitCode: code,
        durationMs: endTime - startTime,
      });
    });

    child.on('error', (err) => {
      const endTime = performance.now();
      resolve({
        command,
        stdout,
        stderr: stderr + `\nExecution Error: ${err.message}`,
        exitCode: child.exitCode ?? 1,
        durationMs: endTime - startTime,
      });
    });
  });
}
