const vscode = require('vscode');
const { generatePDF } = require('./pdfGenerator');

function activate(context) {
  // Register the command "extension.exportToPDF".
  let disposable = vscode.commands.registerCommand('extension.exportToPDF', async function () {
    const workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath;
    if (!workspaceFolder) {
      vscode.window.showErrorMessage("No workspace folder found!");
      return;
    }
    
    vscode.window.showInformationMessage("Generating PDF...");
    
    try {
      await generatePDF(workspaceFolder);
      vscode.window.showInformationMessage("PDF successfully generated as submission.pdf!");
    } catch (error) {
      vscode.window.showErrorMessage(`Error generating PDF: ${error}`);
    }
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
