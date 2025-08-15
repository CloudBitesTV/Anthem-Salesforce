import { LightningElement, api } from 'lwc';
import generate from '@salesforce/apex/AnthemPlayerController.generate';

export default class AnthemPlayer extends LightningElement {
    @api recordId;

    async handlePlay() {
        try {
            // Check if we have an opportunity ID
            if (!this.recordId) {
                console.error('No opportunity ID available');
                return;
            }
            // Call the Apex controller to generate anthem data
            const result = await generate({ opportunityId: this.recordId });            
            if (result.success && result.anthemData && result.anthemData.length > 0) {
                // Use the generated anthem data from the service
                this.playAnthem(result.anthemData);
            } else {
                console.error('No anthem data received from service');
            }
            
        } catch (error) {
            console.error('Error generating anthem:', error);
        }
    }

    playAnthem(anthemData) {
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
    }

    playAudioBuffer(audioCtx, myArrayBuffer) {
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
    }
}