import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import generate from '@salesforce/apex/AnthemPlayerController.generate';

export default class AnthemPlayer extends LightningElement {
    @api recordId;
    
    contentVersionId;
    anthemData;
    isLoading = false;
    error;
    contentVersionSize;
    audioChannels = 0;
    audioSamples = 0;
    audioDuration = 0;
    dataSizeMB = 0;
    
    async handlePlay() {
        try {
            this.isLoading = true;
            this.error = undefined;
            this.anthemData = undefined;
            this.audioChannels = 0;
            this.audioSamples = 0;
            this.audioDuration = 0;
            this.dataSizeMB = 0;
            // Show toast for generation start
            this.showToast('Info', 'Generating anthem...', 'info');            
            // Call the Apex controller to generate anthem data
            const result = await generate({ opportunityId: this.recordId });                        
            if (result.success && result.contentVersionId) {
                this.showToast('Success', 'Anthem generated successfully! Retrieving data...', 'success');                
                // Set the contentVersionId to trigger the wire service
                this.contentVersionId = result.contentVersionId;                
            } else {
                console.error('No ContentVersion ID received from service');
                this.showToast('Error', 'Failed to generate anthem', 'error');
                this.isLoading = false;
            }            
        } catch (error) {
            console.error('Error generating anthem:', error);
            this.showToast('Error', 'Error: ' + error.message, 'error');
            this.isLoading = false;
        }
    }
    
    // Wire service to get ContentVersion data when contentVersionId is available
    @wire(getRecord, { 
        recordId: '$contentVersionId', 
        fields: ['ContentVersion.Title', 'ContentVersion.VersionData', 'ContentVersion.ContentSize'] 
    })
    wiredContentVersion({ error, data }) {
        if (data) {
            this.error = undefined;
            this.isLoading = false;            
            try {
                // Extract the VersionData field which contains our JSON anthem data
                const versionData = getFieldValue(data, 'ContentVersion.VersionData');
                const contentSize = getFieldValue(data, 'ContentVersion.ContentSize');                
                if (versionData) {
                    this.contentVersionSize = contentSize;                    
                    const decodedData = atob(versionData);
                    const parsedData = JSON.parse(decodedData);
                    this.anthemData = parsedData.anthemData;
                    this.audioChannels = this.anthemData.length;
                    this.audioSamples = this.anthemData[0] ? this.anthemData[0].length : 0;
                    this.audioDuration = this.anthemData[0] ? (this.anthemData[0].length / 44100).toFixed(2) : 0;
                    this.dataSizeMB = this.contentVersionSize ? (this.contentVersionSize / (1024 * 1024)).toFixed(2) : 0;                    
                    this.playAnthem(this.anthemData);                    
                } else {
                    this.error = 'No anthem data found in ContentVersion';
                    this.showToast('Error', 'No anthem data found in ContentVersion', 'error');
                }
            } catch (parseError) {
                this.error = 'Failed to parse anthem data: ' + parseError.message;
                this.showToast('Error', 'Failed to parse anthem data: ' + parseError.message, 'error');
                console.error('Error parsing anthem data:', parseError);
            }
        } else if (error) {
            this.error = error.body?.message || 'Failed to retrieve ContentVersion';
            this.showToast('Error', 'Failed to retrieve ContentVersion: ' + this.error, 'error');
            this.isLoading = false;
            console.error('Error retrieving ContentVersion:', error);
        }
    }

    playAnthem(anthemData) {
        try {
            const audioCtx = new AudioContext();            
            // Create buffer with the same dimensions as the service data
            const numberOfChannels = anthemData.length;
            const samplesPerChannel = anthemData[0].length;        
            const myArrayBuffer = audioCtx.createBuffer(
                numberOfChannels,
                samplesPerChannel,
                audioCtx.sampleRate
            );
            // Fill the buffer with the anthem data from the service
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const nowBuffering = myArrayBuffer.getChannelData(channel);
                const channelData = anthemData[channel];            
                for (let i = 0; i < samplesPerChannel; i++) {
                    nowBuffering[i] = channelData[i];
                }
            }
            this.playAudioBuffer(audioCtx, myArrayBuffer);            
            // Show toast for audio playback start
            this.showToast('Success', '🎵 Anthem is now playing!', 'success');            
        } catch (error) {
            console.error('Error playing anthem:', error);
            this.showToast('Error', 'Error playing anthem: ' + error.message, 'error');
        }
    }

    playAudioBuffer(audioCtx, myArrayBuffer) {
        try {
            // Get an AudioBufferSourceNode.
            // This is the AudioNode to use when we want to play an AudioBuffer
            const source = audioCtx.createBufferSource();
            // set the buffer in the AudioBufferSourceNode
            source.buffer = myArrayBuffer;
            // connect the AudioBufferSourceNode to the
            // destination so we can hear the sound
            source.connect(audioCtx.destination);
            // start the source playing
            source.start();            
        } catch (error) {
            this.showToast('Error', 'Error starting audio playback: ' + error.message, 'error');
        }
    }
    
    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(evt);
    }
}