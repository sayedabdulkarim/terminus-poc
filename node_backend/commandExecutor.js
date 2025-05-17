/**
 * Command executor utility
 * This module provides functionality to execute shell commands
 */

const { spawn } = require('child_process');

/**
 * Executes a shell command using spawn and returns the results via a Promise
 * @param {string} command - The command to execute
 * @returns {Promise<object>} Promise that resolves with execution results
 */
function executeCommand(command) {
  return new Promise((resolve) => {
    console.log(`\n----- Executing command: ${command} -----`);
    
    // Use spawn with 'sh' to support shell built-ins like 'cd' and shell expansion
    const process = spawn('sh', ['-c', command], {
      shell: false, // Not needed since we're explicitly using sh -c
    });
    
    let stdoutData = '';
    let stderrData = '';
    
    // Capture stdout data
    process.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
      console.log(`\x1b[32mSTDOUT:\x1b[0m ${output.trim()}`);
    });
    
    // Capture stderr data
    process.stderr.on('data', (data) => {
      const output = data.toString();
      stderrData += output;
      console.log(`\x1b[31mSTDERR:\x1b[0m ${output.trim()}`);
    });
    
    // Handle process completion
    process.on('close', (exitCode) => {
      console.log(`\x1b[36mExit code:\x1b[0m ${exitCode}`);
      
      const success = exitCode === 0;
      if (success) {
        console.log('\x1b[32mCommand executed successfully ✓\x1b[0m');
      } else {
        console.log('\x1b[31mCommand execution failed ✗\x1b[0m');
      }
      
      console.log('----- Command execution completed -----\n');
      
      // Resolve with all the collected information
      resolve({
        command,
        stdout: stdoutData,
        stderr: stderrData,
        exitCode,
        success
      });
    });
    
    // Handle errors in spawning the process
    process.on('error', (err) => {
      console.error(`\x1b[31mFailed to start command: ${err.message}\x1b[0m`);
      console.log('----- Command execution failed -----\n');
      
      resolve({
        command,
        stdout: '',
        stderr: err.message,
        exitCode: 1,
        success: false
      });
    });
  });
}

module.exports = {
  executeCommand
};
