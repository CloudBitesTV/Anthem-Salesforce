#!/usr/bin/env node

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.error('Usage: node anthemPlayer.js <orgAlias> <opportunityId>');
        console.error('Example: node anthemPlayer.js AnthemSalesforce 006XXXXXXXXXXXXXXX');
        process.exit(1);
    }
    
    const orgAlias = args[0];
    const opportunityId = args[1];
    
    console.log('🚀 Starting anthem generation...');
    console.log(`   Org Alias: ${orgAlias}`);
    console.log(`   Opportunity ID: ${opportunityId}`);
    
    try {
        // Call the service using invoke.sh with spawn to handle large outputs
        console.log('📞 Calling anthem service...');
        
        const result = await callService(orgAlias, opportunityId);
        processResult(result);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

function callService(orgAlias, opportunityId) {
    return new Promise((resolve, reject) => {
        const child = spawn('./bin/invoke.sh', [orgAlias, `{"opportunityId": "${opportunityId}"}`], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Service call completed');
                resolve(stdout);
            } else {
                console.error('❌ Service call failed with code:', code);
                console.error('STDERR:', stderr);
                reject(new Error(`Service call failed with code ${code}`));
            }
        });
        
        child.on('error', (error) => {
            console.error('❌ Failed to start service call:', error);
            reject(error);
        });
    });
}

async function processResult(result) {
    try {
        // Look for the JSON response in the output
        const responseMatch = result.match(/Response from server:\s*(\{[^]*\})/);
        if (!responseMatch) {
            console.error('❌ Could not find JSON response in server output');
            console.error('Raw output preview:', result.substring(0, 500));
            throw new Error('Could not find response from server');
        }
        
        const jsonString = responseMatch[1];
        console.log(`📏 JSON response length: ${jsonString.length} characters`);
        
        // Parse the JSON to validate it
        let anthemData;
        try {
            anthemData = JSON.parse(jsonString);
            console.log('✅ JSON parsed successfully');
        } catch (parseError) {
            console.error('❌ Failed to parse JSON:', parseError.message);
            console.error('JSON preview:', jsonString.substring(0, 200));
            throw new Error('Failed to parse JSON response');
        }
        
        // Save the anthem data to a JavaScript file
        const jsFilePath = join(__dirname, 'anthemData.js');
        const jsContent = `var anthemData = ${JSON.stringify(anthemData, null, 2)};`;
        writeFileSync(jsFilePath, jsContent);
        console.log(`💾 Anthem data saved to: ${jsFilePath}`);

        console.log('📊 Anthem Data Analysis:');
        console.log(`   Opportunity ID: ${anthemData.opportunityId}`);
        console.log(`   Number of channels: ${anthemData.anthemData.length}`);

        anthemData.anthemData.forEach((channel, index) => {
            console.log(`   Channel ${index + 1}: ${channel.length} values`);
            const sampleSize = Math.min(1000, channel.length);
            const sample = channel.slice(0, sampleSize);
            const sampleMin = Math.min(...sample);
            const sampleMax = Math.max(...sample);
            const sampleAvg = sample.reduce((a, b) => a + b, 0) / sample.length;
            console.log(`     Sample range (first ${sampleSize}): ${sampleMin.toFixed(4)} to ${sampleMax.toFixed(4)}`);
            console.log(`     Sample average: ${sampleAvg.toFixed(4)}`);
            console.log(`     First 5 values: [${channel.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
            console.log(`     Last 5 values: [${channel.slice(-5).map(v => v.toFixed(4)).join(', ')}]`);
        });

        console.log('\n🎉 Anthem data updated successfully!');
        console.log('📁 Files:');
        console.log(`   - ${jsFilePath} (updated with anthem data)`);
        console.log(`   - ${join(__dirname, 'anthemPlayer.html')} (static)`);
        console.log('\n🚀 Next steps:');
        console.log('   1. Opening anthemPlayer.html in your browser...');
        console.log('   2. No HTTP server needed!');
        console.log('   3. Click "Play Anthem" to hear the audio');

        // Open the HTML file in the default browser
        try {
            const { exec } = await import('child_process');
            const htmlPath = join(__dirname, 'anthemPlayer.html');
            
            if (process.platform === 'darwin') {
                // macOS
                exec(`open "${htmlPath}"`);
            } else if (process.platform === 'win32') {
                // Windows
                exec(`start "${htmlPath}"`);
            } else {
                // Linux
                exec(`xdg-open "${htmlPath}"`);
            }
            console.log('🌐 Browser opened successfully!');
        } catch (error) {
            console.log('⚠️  Could not open browser automatically. Please open manually:');
            console.log(`   ${join(__dirname, 'anthemPlayer.html')}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();