#!/usr/bin/env node

/**
 * Update manifest.json to sort exercises by modification date (newest first)
 * This script reads all .json files in data/exercises/, sorts them by mtime,
 * and updates data/manifest.json
 */

const fs = require('fs');
const path = require('path');

// Paths
const EXERCISES_DIR = path.join(__dirname, '../data/exercises');
const MANIFEST_PATH = path.join(__dirname, '../data/manifest.json');

/**
 * Get all .json files in the exercises directory with their modification times
 * @returns {Array<{filename: string, mtime: Date}>}
 */
function getExerciseFiles() {
    try {
        const files = fs.readdirSync(EXERCISES_DIR);

        const exerciseFiles = files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(EXERCISES_DIR, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    mtime: stats.mtime
                };
            });

        return exerciseFiles;
    } catch (error) {
        console.error(`Error reading exercises directory: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Sort exercises by modification time (newest first)
 * @param {Array} exercises - Array of exercise file objects
 * @returns {Array<string>} - Sorted array of filenames
 */
function sortByModificationDate(exercises) {
    return exercises
        .sort((a, b) => b.mtime - a.mtime) // Newest first
        .map(ex => ex.filename);
}

/**
 * Write the sorted manifest to file
 * @param {Array<string>} sortedFiles - Sorted array of filenames
 */
function writeManifest(sortedFiles) {
    try {
        const manifestContent = JSON.stringify(sortedFiles, null, 4);
        fs.writeFileSync(MANIFEST_PATH, manifestContent + '\n', 'utf8');
        console.log(`✓ Updated manifest.json with ${sortedFiles.length} exercises`);
        console.log('  (sorted by modification date, newest first)');
    } catch (error) {
        console.error(`Error writing manifest: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Display the sorting results
 * @param {Array} exercises - Array of exercise file objects with mtime
 */
function displayResults(exercises) {
    console.log('\nExercises sorted by modification date (newest first):');
    console.log('─'.repeat(70));

    const sorted = exercises.sort((a, b) => b.mtime - a.mtime);

    // Group by date for better readability
    const grouped = {};
    sorted.forEach(ex => {
        const dateKey = ex.mtime.toISOString().split('T')[0];
        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push(ex.filename);
    });

    Object.keys(grouped).sort().reverse().forEach(date => {
        console.log(`\n${date}:`);
        grouped[date].forEach(filename => {
            console.log(`  - ${filename}`);
        });
    });

    console.log('\n' + '─'.repeat(70));
}

// Main execution
function main() {
    console.log('Updating manifest.json with exercises sorted by modification date...\n');

    // Get all exercise files with their modification times
    const exercises = getExerciseFiles();

    if (exercises.length === 0) {
        console.warn('Warning: No exercise files found!');
        process.exit(1);
    }

    // Sort by modification date (newest first)
    const sortedFilenames = sortByModificationDate(exercises);

    // Write to manifest.json
    writeManifest(sortedFilenames);

    // Display results
    displayResults(exercises);

    console.log('\n✓ Done! The exercise window will now display newest exercises first.');
}

main();
