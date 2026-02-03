#!/usr/bin/env node

/**
 * Script to extract component props from Flux UI source files.
 *
 * Usage:
 *   node get-components.js /path/to/flux/resources/views/flux
 *
 * This script will:
 * 1. Scan all .blade.php files in the Flux views directory
 * 2. Extract @props([...]) declarations
 * 3. Infer types from default values
 * 4. Generate an updated components.json
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse a Blade file and extract props from @props directive
 */
function extractPropsFromFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Match @props([...]) directive - handles multi-line
    const propsMatch = content.match(/@props\(\[\s*([\s\S]*?)\s*\]\)/);
    if (!propsMatch) {
        return [];
    }

    const propsContent = propsMatch[1];
    const props = [];

    // Match individual props: 'propName' => defaultValue or 'propName'
    const propPattern = /['"]([^'"]+)['"]\s*(?:=>\s*([^,\]]+))?/g;
    let match;

    while ((match = propPattern.exec(propsContent)) !== null) {
        const propName = match[1];
        const defaultValue = match[2] ? match[2].trim() : null;

        const prop = {
            name: propName,
            type: inferType(defaultValue),
            default: defaultValue || 'null'
        };

        props.push(prop);
    }

    return props;
}

/**
 * Infer the type of a prop from its default value
 */
function inferType(defaultValue) {
    if (!defaultValue || defaultValue === 'null') {
        return 'string';
    }

    const value = defaultValue.trim();

    // Boolean
    if (value === 'true' || value === 'false') {
        return 'boolean';
    }

    // Number
    if (/^\d+(\.\d+)?$/.test(value)) {
        return 'number';
    }

    // Array
    if (value.startsWith('[')) {
        return 'array';
    }

    // Object/Array
    if (value.startsWith('{')) {
        return 'object';
    }

    // String (quoted)
    if (/^['"].*['"]$/.test(value)) {
        return 'string';
    }

    return 'any';
}

/**
 * Determine if a component is self-closing based on content analysis
 */
function isSelfClosing(content) {
    // If the component has a slot, it's not self-closing
    if (content.includes('{{ $slot }}') || content.includes('{!! $slot !!}')) {
        return false;
    }
    return true;
}

/**
 * Get component name from file path
 */
function getComponentName(filePath, baseDir) {
    const relativePath = path.relative(baseDir, filePath);
    const name = relativePath
        .replace(/\.blade\.php$/, '')
        .replace(/[\/\\]/g, '.')
        .replace(/\.index$/, '');
    return name;
}

/**
 * Scan directory for Blade files
 */
function scanDirectory(dir, baseDir = dir) {
    const components = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            components.push(...scanDirectory(fullPath, baseDir));
        } else if (entry.name.endsWith('.blade.php')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const name = getComponentName(fullPath, baseDir);
            const props = extractPropsFromFile(fullPath);
            const selfClosing = isSelfClosing(content);

            components.push({
                name,
                selfClosing,
                description: `Flux ${name} component`,
                isPro: false, // Manual review needed for Pro components
                props
            });
        }
    }

    return components;
}

/**
 * Merge extracted components with existing components.json
 */
function mergeWithExisting(extracted, existingPath) {
    if (!fs.existsSync(existingPath)) {
        return extracted;
    }

    const existing = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
    const existingMap = new Map(existing.map(c => [c.name, c]));

    for (const component of extracted) {
        const existingComponent = existingMap.get(component.name);

        if (existingComponent) {
            // Preserve manual additions like description, isPro, prop descriptions
            component.description = existingComponent.description || component.description;
            component.isPro = existingComponent.isPro || false;

            // Merge props, preserving manual additions
            const existingPropsMap = new Map(
                (existingComponent.props || []).map(p => [p.name, p])
            );

            for (const prop of component.props) {
                const existingProp = existingPropsMap.get(prop.name);
                if (existingProp) {
                    prop.description = existingProp.description || prop.description;
                    prop.values = existingProp.values || prop.values;
                    prop.required = existingProp.required || prop.required;
                }
            }
        }
    }

    return extracted;
}

/**
 * Main entry point
 */
function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: node get-components.js <flux-views-directory>');
        console.log('');
        console.log('Example:');
        console.log('  node get-components.js /path/to/vendor/livewire/flux/resources/views/flux');
        console.log('');
        console.log('This will scan the Flux source files and update components.json');
        process.exit(1);
    }

    const sourceDir = args[0];

    if (!fs.existsSync(sourceDir)) {
        console.error(`Error: Directory not found: ${sourceDir}`);
        process.exit(1);
    }

    console.log(`Scanning ${sourceDir}...`);

    const extracted = scanDirectory(sourceDir);
    console.log(`Found ${extracted.length} components`);

    const componentsPath = path.join(__dirname, 'components.json');
    const merged = mergeWithExisting(extracted, componentsPath);

    // Sort by name
    merged.sort((a, b) => a.name.localeCompare(b.name));

    // Write output
    fs.writeFileSync(componentsPath, JSON.stringify(merged, null, 2));
    console.log(`Updated ${componentsPath}`);

    // Summary
    console.log('\nComponent Summary:');
    console.log(`  Total: ${merged.length}`);
    console.log(`  Pro: ${merged.filter(c => c.isPro).length}`);
    console.log(`  Self-closing: ${merged.filter(c => c.selfClosing).length}`);
}

main();
