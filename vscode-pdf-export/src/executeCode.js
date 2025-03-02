const child_process = require('child_process');
const fs = require('fs-extra');
const path = require('path');

async function executeCode(folderPath) {
  const files = await fs.readdir(folderPath);
  // Simple heuristic: find the first file with an executable extension.
  const mainFile = files.find(file => file.match(/\.(py|js|cpp|java)$/));

  if (!mainFile) return "No executable code file found.";

  const ext = path.extname(mainFile);
  let command = "";

  switch(ext) {
    case '.py':
      command = `python "${path.join(folderPath, mainFile)}"`;
      break;
    case '.js':
      command = `node "${path.join(folderPath, mainFile)}"`;
      break;
    case '.cpp':
      // Assumes g++ is installed; compiles then executes the C++ file.
      command = `g++ "${path.join(folderPath, mainFile)}" -o "${path.join(folderPath, 'a.out')}" && "${path.join(folderPath, 'a.out')}"`;
      break;
    case '.java':
      // Assumes Java is installed; compiles and runs the Java file.
      command = `javac "${path.join(folderPath, mainFile)}" && java -cp "${folderPath}" ${path.basename(mainFile, '.java')}`;
      break;
    default:
      return "Unsupported language.";
  }

  return new Promise(resolve => {
    child_process.exec(command, { cwd: folderPath }, (error, stdout, stderr) => {
      if (error) {
        resolve(`Error: ${stderr || error.message}`);
      } else {
        resolve(stdout);
      }
    });
  });
}

module.exports = {
  executeCode
};
