#!/usr/bin/env node

/**
 * Development script for Building Forge
 * Starts the development environment with proper sequencing
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Building Forge development environment...\n');

// Start main process build (watch mode)
console.log('📦 Starting main process build...');
const mainProcess = spawn('npm', ['run', 'dev:main'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
});

// Start renderer dev server
console.log('🌐 Starting renderer dev server...');
const rendererProcess = spawn('npm', ['run', 'dev:renderer'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
});

// Wait for dev server to be ready, then start Electron
setTimeout(() => {
    console.log('⚡ Starting Electron application...');
    const electronProcess = spawn('electron', ['dist/main/main.js', '--dev'], {
        stdio: 'inherit',
        shell: true,
        cwd: process.cwd()
    });

    electronProcess.on('close', (code) => {
        console.log('\n🛑 Electron closed, shutting down development environment...');
        mainProcess.kill();
        rendererProcess.kill();
        process.exit(code);
    });
}, 3000); // Wait 3 seconds for dev server to start

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development environment...');
    mainProcess.kill();
    rendererProcess.kill();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down development environment...');
    mainProcess.kill();
    rendererProcess.kill();
    process.exit(0);
});