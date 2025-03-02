const vscode = require('vscode');
const { generatePDF } = require('./pdfGenerator');

function activate(context) {
  // Create status bar item
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = "$(file-pdf) Export PDF";
  statusBarItem.tooltip = "Export workspace code to PDF";
  statusBarItem.command = 'extension.exportToPDF';
  statusBarItem.show();
  
  // Register the command "extension.exportToPDF"
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

  // Add both the command and status bar item to subscriptions
  context.subscriptions.push(disposable);
  context.subscriptions.push(statusBarItem);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
