const child_process = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

async function executeCode(filePath) {
  const ext = path.extname(filePath);
  const folderPath = path.dirname(filePath);
  let command = "";
  let tempDir = null;
  let outputFile = null;

  try {
    switch(ext) {
      case '.py':
        command = `python "${filePath}"`;
        break;
      case '.js':
        command = `node "${filePath}"`;
        break;
      case '.cpp':
        // Create a temporary directory for compilation
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cpp-'));
        // Use a unique name for the output file
        outputFile = path.join(tempDir, 'output.exe');
        // Compile and execute with proper path handling
        command = `g++ "${filePath}" -o "${outputFile}" && "${outputFile}"`;
        break;
      case '.java':
        // Assumes Java is installed; compiles and runs the Java file.
        command = `javac "${filePath}" && java -cp "${folderPath}" ${path.basename(filePath, '.java')}`;
        break;
      default:
        return "Unsupported language.";
    }

    return new Promise((resolve) => {
      child_process.exec(command, { cwd: folderPath }, (error, stdout, stderr) => {
        if (error) {
          resolve(`Error: ${stderr || error.message}`);
        } else {
          resolve(stdout || "No output");
        }
      });
    }).finally(async () => {
      // Clean up temporary directory if it was created
      if (tempDir && await fs.pathExists(tempDir)) {
        try {
          await fs.remove(tempDir);
        } catch (cleanupError) {
          console.error('Failed to clean up temporary directory:', cleanupError);
        }
      }
    });
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

module.exports = {
  executeCode
};
