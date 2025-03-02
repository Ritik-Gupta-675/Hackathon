const child_process = require('child_process');
const fs = require('fs-extra');
const path = require('path');

async function executeCode(filePath) {
  const ext = path.extname(filePath);
  const folderPath = path.dirname(filePath);
  let command = "";

  switch(ext) {
    case '.py':
      command = `python "${filePath}"`;
      break;
    case '.js':
      command = `node "${filePath}"`;
      break;
    case '.cpp':
      // Assumes g++ is installed; compiles then executes the C++ file.
      command = `g++ "${filePath}" -o "${path.join(folderPath, 'a.out')}" && "${path.join(folderPath, 'a.out')}"`;
      break;
    case '.java':
      // Assumes Java is installed; compiles and runs the Java file.
      command = `javac "${filePath}" && java -cp "${folderPath}" ${path.basename(filePath, '.java')}`;
      break;
    default:
      return "Unsupported language.";
  }

  return new Promise(resolve => {
    child_process.exec(command, { cwd: folderPath }, (error, stdout, stderr) => {
      if (error) {
        resolve(`Error: ${stderr || error.message}`);
      } else {
        resolve(stdout || "No output");
      }
    });
  });
}

module.exports = {
  executeCode
};
