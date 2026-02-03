const vscode = require('vscode');
const components = require('./components.json');

class FluxCompletionProvider {
    constructor() {
        this.components = components;
        this.componentMap = this.buildComponentMap();
    }

    /**
     * Build a map for quick component lookup by name
     */
    buildComponentMap() {
        const map = new Map();
        for (const component of this.components) {
            map.set(component.name, component);
        }
        return map;
    }

    /**
     * @param {vscode.TextDocument} document
     * @param {vscode.Position} position
     * @param {vscode.CancellationToken} token
     * @param {vscode.CompletionContext} context
     * @returns {vscode.CompletionItem[] | vscode.CompletionList}
     */
    provideCompletionItems(document, position, token, context) {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);

        // Check if we're typing a component tag
        const componentTagMatch = this.isTypingComponentTag(linePrefix);
        if (componentTagMatch) {
            return this.getComponentCompletions(componentTagMatch);
        }

        // Check if we're inside a component tag and need prop completions
        const propMatch = this.isInsideComponentTag(document, position);
        if (propMatch) {
            return this.getPropCompletions(propMatch.componentName, propMatch.existingProps);
        }

        return [];
    }

    /**
     * Check if user is typing a component tag like <flux: or <f or <fl etc.
     */
    isTypingComponentTag(linePrefix) {
        // Match <flux:partial-name or <f or <fl or <flu or <flux
        const match = linePrefix.match(/<(f(?:l(?:u(?:x(?::([a-z0-9\.\-]*))?)?)?)?)?$/i);
        if (match) {
            return {
                prefix: match[2] || '', // The partial component name after flux:
                isFluxPrefix: match[1] && match[1].toLowerCase().startsWith('f')
            };
        }
        return null;
    }

    /**
     * Check if cursor is inside a component tag for prop completion
     */
    isInsideComponentTag(document, position) {
        const text = document.getText();
        const offset = document.offsetAt(position);

        // Find the start of the current tag
        let tagStart = -1;
        for (let i = offset - 1; i >= 0; i--) {
            if (text[i] === '<') {
                tagStart = i;
                break;
            }
            if (text[i] === '>') {
                return null; // We're not inside a tag
            }
        }

        if (tagStart === -1) return null;

        const tagContent = text.substring(tagStart, offset);

        // Check if this is a flux component tag
        const fluxTagMatch = tagContent.match(/^<flux:([a-z0-9\.\-]+)\s+/i);
        if (!fluxTagMatch) return null;

        const componentName = fluxTagMatch[1];

        // Extract existing props in this tag
        const existingProps = this.extractExistingProps(tagContent);

        return { componentName, existingProps };
    }

    /**
     * Extract props already present in the tag
     */
    extractExistingProps(tagContent) {
        const props = new Set();

        // Match various prop patterns:
        // prop="value"
        // prop='value'
        // :prop="value"
        // prop (boolean)
        // wire:model="value"
        const propPattern = /(?::|@)?([a-z][a-z0-9\-:\.]*?)(?:=["']|(?=\s|\/|>|$))/gi;
        let match;

        while ((match = propPattern.exec(tagContent)) !== null) {
            props.add(match[1].toLowerCase());
        }

        return props;
    }

    /**
     * Get component tag completions
     */
    getComponentCompletions(match) {
        const config = vscode.workspace.getConfiguration('flux-ui');
        const includeProComponents = config.get('includeProComponents', true);

        const completions = [];
        const prefix = match.prefix.toLowerCase();

        for (const component of this.components) {
            // Filter by prefix if user has started typing
            if (prefix && !component.name.toLowerCase().startsWith(prefix)) {
                continue;
            }

            // Filter out Pro components if disabled
            if (component.isPro && !includeProComponents) {
                continue;
            }

            const item = new vscode.CompletionItem(
                `flux:${component.name}`,
                vscode.CompletionItemKind.Class
            );

            item.detail = component.isPro ? 'Flux Pro Component' : 'Flux Component';
            item.documentation = new vscode.MarkdownString(this.getComponentDocumentation(component));

            // Create snippet
            if (component.selfClosing) {
                item.insertText = new vscode.SnippetString(`flux:${component.name} $0/>`);
            } else {
                item.insertText = new vscode.SnippetString(`flux:${component.name}$0><\/flux:${component.name}>`);
            }

            // Set sort order - non-Pro components first
            item.sortText = (component.isPro ? '1' : '0') + component.name;

            // Filter text for better matching
            item.filterText = `flux:${component.name} ${component.name}`;

            completions.push(item);
        }

        return completions;
    }

    /**
     * Get prop completions for a component
     */
    getPropCompletions(componentName, existingProps) {
        const component = this.componentMap.get(componentName.toLowerCase());
        if (!component) return [];

        const completions = [];

        for (const prop of component.props || []) {
            // Skip props that already exist
            if (existingProps.has(prop.name.toLowerCase())) {
                continue;
            }

            const item = new vscode.CompletionItem(
                prop.name,
                vscode.CompletionItemKind.Property
            );

            item.detail = this.getPropDetail(prop);
            item.documentation = new vscode.MarkdownString(this.getPropDocumentation(prop));

            // Create appropriate snippet based on prop type
            item.insertText = this.getPropSnippet(prop);

            // Sort required props first, then alphabetically
            item.sortText = (prop.required ? '0' : '1') + prop.name;

            completions.push(item);
        }

        // Add common Livewire attributes
        const livewireProps = this.getLivewireProps(existingProps);
        completions.push(...livewireProps);

        return completions;
    }

    /**
     * Get snippet for a prop based on its type
     */
    getPropSnippet(prop) {
        if (prop.type === 'boolean') {
            // Boolean props don't need a value
            return new vscode.SnippetString(prop.name);
        }

        if (prop.values && prop.values.length > 0) {
            // Create a choice snippet for enum-like props
            const choices = prop.values.join(',');
            return new vscode.SnippetString(`${prop.name}="\${1|${choices}|}"`);
        }

        // Default: prop with placeholder
        const defaultValue = prop.default && prop.default !== 'null' ? prop.default.replace(/['"]/g, '') : '';
        return new vscode.SnippetString(`${prop.name}="\${1:${defaultValue}}"`);
    }

    /**
     * Get detail string for a prop
     */
    getPropDetail(prop) {
        let detail = prop.type || 'any';
        if (prop.required) {
            detail += ' (required)';
        }
        if (prop.default && prop.default !== 'null') {
            detail += ` = ${prop.default}`;
        }
        return detail;
    }

    /**
     * Get documentation markdown for a component
     */
    getComponentDocumentation(component) {
        let doc = '';

        if (component.description) {
            doc += component.description + '\n\n';
        }

        if (component.props && component.props.length > 0) {
            doc += '**Props:**\n';
            for (const prop of component.props.slice(0, 5)) {
                doc += `- \`${prop.name}\``;
                if (prop.type) doc += `: ${prop.type}`;
                if (prop.required) doc += ' *(required)*';
                doc += '\n';
            }
            if (component.props.length > 5) {
                doc += `- *...and ${component.props.length - 5} more*\n`;
            }
        }

        if (component.isPro) {
            doc += '\n*Requires Flux Pro*';
        }

        return doc;
    }

    /**
     * Get documentation markdown for a prop
     */
    getPropDocumentation(prop) {
        let doc = '';

        if (prop.description) {
            doc += prop.description + '\n\n';
        }

        if (prop.values && prop.values.length > 0) {
            doc += '**Allowed values:** ' + prop.values.map(v => `\`${v}\``).join(', ') + '\n';
        }

        if (prop.default && prop.default !== 'null') {
            doc += `**Default:** \`${prop.default}\`\n`;
        }

        return doc;
    }

    /**
     * Get common Livewire attribute completions
     */
    getLivewireProps(existingProps) {
        const livewireAttrs = [
            { name: 'wire:model', description: 'Two-way bind to a Livewire property' },
            { name: 'wire:model.live', description: 'Two-way bind with live updates' },
            { name: 'wire:model.blur', description: 'Two-way bind on blur' },
            { name: 'wire:model.change', description: 'Two-way bind on change' },
            { name: 'wire:click', description: 'Handle click event in Livewire' },
            { name: 'wire:submit', description: 'Handle form submit in Livewire' },
            { name: 'wire:loading', description: 'Show element during loading state' },
            { name: 'wire:target', description: 'Specify loading target action' },
            { name: 'wire:confirm', description: 'Show confirmation dialog before action' },
            { name: 'x-data', description: 'Alpine.js data scope' },
            { name: 'x-show', description: 'Alpine.js conditional display' },
            { name: 'x-if', description: 'Alpine.js conditional rendering' },
            { name: 'x-on:click', description: 'Alpine.js click handler' },
            { name: '@click', description: 'Alpine.js click handler (shorthand)' },
        ];

        const completions = [];

        for (const attr of livewireAttrs) {
            if (existingProps.has(attr.name.toLowerCase())) {
                continue;
            }

            const item = new vscode.CompletionItem(
                attr.name,
                vscode.CompletionItemKind.Property
            );

            item.detail = 'Livewire/Alpine attribute';
            item.documentation = new vscode.MarkdownString(attr.description);
            item.insertText = new vscode.SnippetString(`${attr.name}="\${1}"`);
            item.sortText = '2' + attr.name; // Sort after component props

            completions.push(item);
        }

        return completions;
    }
}

module.exports = FluxCompletionProvider;
