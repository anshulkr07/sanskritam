import type { MicBuffer, Microphone } from "./microphone";

export async function microphonePermission(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone access needs HTTPS or localhost.");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  stream.getTracks().forEach(track => track.stop());
}
export async function startMicrophone(onBuffer: (buffer: MicBuffer) => void): Promise<Microphone> {
  const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(media);
  // ScriptProcessor is supported by the shipped browsers. Only 64 ms buffers
  // are converted here; this can move to an AudioWorklet without changing WS.
  const processor = ctx.createScriptProcessor(2048, 1, 1);
  const silent = ctx.createGain(); silent.gain.value = 0;
  processor.onaudioprocess = event => {
    const input = event.inputBuffer.getChannelData(0);
    const pcm = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) pcm[i] = Math.round(Math.max(-1, Math.min(1, input[i])) * 32767);
    onBuffer({ data: pcm.buffer, sampleRate: ctx.sampleRate, channels: 1, echoCancelled: media.getAudioTracks()[0]?.getSettings().echoCancellation === true });
  };
  source.connect(processor); processor.connect(silent); silent.connect(ctx.destination);
  const stop = () => { processor.onaudioprocess = null; processor.disconnect(); source.disconnect(); silent.disconnect(); media.getTracks().forEach(track => track.stop()); void ctx.close(); };
  try { await ctx.resume(); return { stop }; }
  catch (e) { stop(); throw e; }
}
