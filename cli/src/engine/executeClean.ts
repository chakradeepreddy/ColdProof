import { spawn } from 'node:child_process';
import type { ExecutionResult } from '../types.js';

export async function executeCleanCommand(
  command: string,
  projectPath: string,
  options?: {
    restoreProjectLocalExecutable?: {
      name: string;
      packageName: string;
      symlinkTarget: string; // e.g. "../package/bin/executable"
    };
  }
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    let stdout = '';
    let stderr = '';

    // We mount the host project as read-only at /src, and use tar to copy it
    // into the ephemeral /workspace directory (excluding node_modules).
    // This gives the clean container a perfectly isolated, writable snapshot
    // of the source code without risking modifications to the host.
    const dockerArgs = [
      'run',
      '--rm',
      '-v',
      `${projectPath}:/src:ro`,
    ];

    let setupCommand = 'tar cf - -C /src --exclude=node_modules . | tar xf - -C /workspace';

    if (options?.restoreProjectLocalExecutable) {
      const { name, packageName, symlinkTarget } = options.restoreProjectLocalExecutable;
      dockerArgs.push('-v', `${projectPath}/node_modules/${packageName}:/workspace/node_modules/${packageName}:ro`);
      setupCommand += ` && mkdir -p node_modules/.bin && ln -s "${symlinkTarget}" "node_modules/.bin/${name}"`;
    }

    dockerArgs.push(
      '-w',
      '/workspace',
      'node:22-slim',
      'sh',
      '-c',
      `${setupCommand} && eval "$0"`,
      command
    );

    const child = spawn('docker', dockerArgs, { shell: false });

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
