const vscode = require('vscode');
const FluxCompletionProvider = require('./flux-completion-provider');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Flux UI v2 extension is now active');

    const config = vscode.workspace.getConfiguration('flux-ui');

    if (!config.get('enable', true)) {
        return;
    }

    const provider = new FluxCompletionProvider();

    // Register completion provider for blade, php, and html files
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        [
            { language: 'blade', scheme: 'file' },
            { language: 'php', scheme: 'file' },
            { language: 'html', scheme: 'file' },
            { pattern: '**/*.blade.php' }
        ],
        provider,
        '<', ' ', 'f', 'l', 'u', 'x', ':'
    );

    context.subscriptions.push(completionProvider);

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('flux-ui.enable')) {
                const newConfig = vscode.workspace.getConfiguration('flux-ui');
                if (!newConfig.get('enable', true)) {
                    vscode.window.showInformationMessage('Flux UI suggestions disabled. Reload window to apply.');
                }
            }
        })
    );
}

function deactivate() {
    console.log('Flux UI v2 extension is now deactivated');
}

module.exports = {
    activate,
    deactivate
};
