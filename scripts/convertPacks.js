#!/usr/bin/env node
/**
 * Pack Format Converter
 *
 * Converts old-format Lumiverse packs or SillyTavern World Books to the new v2 format.
 *
 * Usage:
 *   node scripts/convertPacks.js <input.json> [output.json]
 *
 * If no output file is specified, writes to <input>.converted.json
 *
 * Supported input formats:
 * - World Book format (has entries object)
 * - Legacy pack format (has items array with lumiaDefName/loomCategory)
 * - Raw entries array
 */

const fs = require('fs');
const path = require('path');

// Gender identity constants
const GENDER = {
    SHE_HER: 0,
    HE_HIM: 1,
    THEY_THEM: 2,
};

/**
 * Extract metadata from content (images, authors)
 */
function extractMetadata(content) {
    let cleanContent = content;
    let image = null;
    let author = null;

    // Match lumia_img tag
    const imgMatch = content.match(/\[lumia_img=([^\]]+)\]/);
    if (imgMatch) {
        image = imgMatch[1].trim();
        cleanContent = cleanContent.replace(imgMatch[0], '').trim();
    }

    // Match lumia_author tag
    const authMatch = content.match(/\[lumia_author=([^\]]+)\]/);
    if (authMatch) {
        author = authMatch[1].trim();
        cleanContent = cleanContent.replace(authMatch[0], '').trim();
    }

    return { image, author, content: cleanContent };
}

/**
 * Convert old Lumia item format to new format
 */
function convertLumiaItem(oldItem) {
    return {
        lumiaName: oldItem.lumiaDefName || oldItem.lumiaName,
        lumiaDefinition: oldItem.lumiaDef || oldItem.lumiaDefinition || null,
        lumiaPersonality: oldItem.lumia_personality || oldItem.lumiaPersonality || null,
        lumiaBehavior: oldItem.lumia_behavior || oldItem.lumiaBehavior || null,
        avatarUrl: oldItem.lumia_img || oldItem.avatarUrl || null,
        genderIdentity: oldItem.genderIdentity ?? GENDER.SHE_HER,
        authorName: oldItem.defAuthor || oldItem.authorName || null,
        version: 1,
    };
}

/**
 * Convert old Loom item format to new format
 */
function convertLoomItem(oldItem) {
    return {
        loomName: oldItem.loomName,
        loomContent: oldItem.loomContent,
        loomCategory: oldItem.loomCategory,
        authorName: oldItem.authorName || null,
        version: 1,
    };
}

/**
 * Process a World Book format into categorized items
 */
function processWorldBook(data) {
    let entries = [];
    if (Array.isArray(data)) {
        entries = data;
    } else if (data && data.entries) {
        entries = Object.values(data.entries);
    } else {
        return { lumiaItems: [], loomItems: [] };
    }

    const lumiaMap = new Map();
    const loomItems = [];

    for (const entry of entries) {
        if (!entry.content || typeof entry.content !== 'string') continue;

        const comment = (entry.comment || '').trim();

        // Check if this is a Loom entry first
        const categoryMatch = comment.match(/^(.+?)\s*\(/);
        if (categoryMatch) {
            const category = categoryMatch[1].trim();

            // Check for Loom categories
            if (
                category === 'Loom Utilities' ||
                category === 'Retrofits' ||
                category === 'Narrative Style'
            ) {
                const loomNameMatch = comment.match(
                    /^(?:Loom Utilities|Retrofits|Narrative Style)\s*\((.+)\)\s*$/
                );
                if (!loomNameMatch) continue;

                const loomName = loomNameMatch[1].trim();
                loomItems.push({
                    loomName: loomName,
                    loomContent: entry.content.trim(),
                    loomCategory: category,
                    authorName: null,
                    version: 1,
                });
                continue;
            }
        }

        // Extract name from parenthesis for Lumia items
        const nameMatch = comment.match(/\((.+?)\)/);
        if (!nameMatch) continue;

        const name = nameMatch[1].trim();

        // Lumia processing
        let lumia = lumiaMap.get(name);
        if (!lumia) {
            lumia = {
                lumiaName: name,
                avatarUrl: null,
                lumiaPersonality: null,
                lumiaBehavior: null,
                lumiaDefinition: null,
                authorName: null,
                genderIdentity: GENDER.SHE_HER,
                version: 1,
            };
            lumiaMap.set(name, lumia);
        }

        const commentLower = comment.toLowerCase();
        let type = null;

        // Determine entry type
        if (
            entry.outletName === 'Lumia_Description' ||
            commentLower.includes('definition')
        ) {
            type = 'definition';
        } else if (
            entry.outletName === 'Lumia_Behavior' ||
            commentLower.includes('behavior')
        ) {
            type = 'behavior';
        } else if (
            entry.outletName === 'Lumia_Personality' ||
            commentLower.includes('personality')
        ) {
            type = 'personality';
        } else if (
            categoryMatch &&
            categoryMatch[1].trim().toLowerCase() === 'lumia'
        ) {
            type = 'definition';
        } else if (entry.content.includes('[lumia_img=')) {
            type = 'definition';
        }

        if (type === 'definition') {
            const meta = extractMetadata(entry.content);
            lumia.lumiaDefinition = meta.content;
            if (meta.image) lumia.avatarUrl = meta.image;
            if (meta.author) lumia.authorName = meta.author;
        } else if (type === 'behavior') {
            lumia.lumiaBehavior = entry.content;
        } else if (type === 'personality') {
            // Check for legacy split within personality
            const behaviorMatch = entry.content.match(
                /{{setvar::lumia_behavior_\w+::([\s\S]*?)}}/
            );
            const personalityMatch = entry.content.match(
                /{{setglobalvar::lumia_personality_\w+::([\s\S]*?)}}/
            );

            if (behaviorMatch && !lumia.lumiaBehavior) {
                lumia.lumiaBehavior = behaviorMatch[1].trim();
            }

            if (personalityMatch) {
                lumia.lumiaPersonality = personalityMatch[1].trim();
            } else {
                lumia.lumiaPersonality = entry.content;
            }
        }
    }

    return {
        lumiaItems: Array.from(lumiaMap.values()),
        loomItems,
    };
}

/**
 * Convert a pack from old format to new format
 */
function convertPack(inputData, sourceName = 'Converted Pack') {
    // Check if already in new format
    if (inputData.lumiaItems || inputData.loomItems) {
        console.log('Input is already in new format, returning as-is');
        return inputData;
    }

    // Check if this is a World Book format
    if (inputData.entries || Array.isArray(inputData)) {
        console.log('Detected World Book format, processing...');
        const { lumiaItems, loomItems } = processWorldBook(inputData);

        return {
            packName: sourceName,
            packAuthor: null,
            coverUrl: null,
            version: 1,
            packExtras: [],
            lumiaItems,
            loomItems,
        };
    }

    // Old internal pack format with items array
    if (inputData.items && Array.isArray(inputData.items)) {
        console.log('Detected legacy pack format with items array...');

        const lumiaItems = [];
        const loomItems = [];

        for (const item of inputData.items) {
            if (item.lumiaDefName || item.lumiaName) {
                lumiaItems.push(convertLumiaItem(item));
            } else if (item.loomCategory) {
                loomItems.push(convertLoomItem(item));
            }
        }

        return {
            packName: inputData.name || inputData.packName || sourceName,
            packAuthor: inputData.author || inputData.packAuthor || null,
            coverUrl: inputData.coverUrl || null,
            version: 1,
            packExtras: inputData.packExtras || [],
            lumiaItems,
            loomItems,
        };
    }

    throw new Error('Unknown input format');
}

// Main execution
function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Pack Format Converter');
        console.log('');
        console.log('Usage:');
        console.log('  node scripts/convertPacks.js <input.json> [output.json]');
        console.log('');
        console.log('If no output file is specified, writes to <input>.converted.json');
        console.log('');
        console.log('Supported input formats:');
        console.log('  - SillyTavern World Book (has entries object)');
        console.log('  - Legacy pack format (has items array)');
        console.log('  - Raw entries array');
        process.exit(1);
    }

    const inputPath = path.resolve(args[0]);
    const outputPath = args[1]
        ? path.resolve(args[1])
        : inputPath.replace(/\.json$/i, '.converted.json');

    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
        console.error(`Error: Input file not found: ${inputPath}`);
        process.exit(1);
    }

    console.log(`Reading: ${inputPath}`);

    try {
        const inputData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
        const sourceName = path.basename(inputPath, path.extname(inputPath));

        console.log('Converting...');
        const convertedPack = convertPack(inputData, sourceName);

        const lumiaCount = convertedPack.lumiaItems?.length || 0;
        const loomCount = convertedPack.loomItems?.length || 0;
        console.log(`Found ${lumiaCount} Lumia items and ${loomCount} Loom items`);

        console.log(`Writing: ${outputPath}`);
        fs.writeFileSync(outputPath, JSON.stringify(convertedPack, null, 2));

        console.log('');
        console.log('Conversion complete!');
        console.log('');
        console.log('Summary:');
        console.log(`  Pack Name: ${convertedPack.packName}`);
        console.log(`  Lumia Items: ${lumiaCount}`);
        console.log(`  Loom Items: ${loomCount}`);
        if (loomCount > 0) {
            const categories = [...new Set(convertedPack.loomItems.map(i => i.loomCategory))];
            console.log(`  Loom Categories: ${categories.join(', ')}`);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

main();
