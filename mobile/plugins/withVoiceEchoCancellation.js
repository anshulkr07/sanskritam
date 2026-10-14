// SDK 57 AudioStream has no voice-communication/AEC option. Extend it during
// prebuild; default capture for Recite and other callers remains unchanged.
const fs = require("node:fs");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");
const marker = "// Shabd voice echo cancellation";
function replace(source, from, to) {
  if (!source.includes(from)) throw new Error("Voice AEC patch does not match installed expo-audio. Review the native adapter before building.");
  return source.replace(from, to);
}
function patchStream(source) {
  if (source.includes(marker)) return source;
  source = replace(source, "import android.media.AudioRecord", "import android.media.AudioRecord\nimport android.media.audiofx.AcousticEchoCanceler\nimport android.media.audiofx.NoiseSuppressor");
  source = replace(source, "  private var audioRecord: AudioRecord? = null", `  ${marker}
  private var echoCanceler: AcousticEchoCanceler? = null
  private var noiseSuppressor: NoiseSuppressor? = null
  private var echoCancellationEnabled = false

  private fun releaseProcessing() {
    echoCancellationEnabled = false
    runCatching { echoCanceler?.release() }; echoCanceler = null
    runCatching { noiseSuppressor?.release() }; noiseSuppressor = null
  }

  private fun configureProcessing(sessionId: Int) {
    releaseProcessing()
    if (!options.echoCancellation) return
    try {
      if (AcousticEchoCanceler.isAvailable()) {
        echoCanceler = AcousticEchoCanceler.create(sessionId)
        echoCanceler?.setEnabled(true)
        echoCancellationEnabled = echoCanceler?.enabled == true
      }
      if (NoiseSuppressor.isAvailable()) {
        noiseSuppressor = NoiseSuppressor.create(sessionId)
        noiseSuppressor?.setEnabled(true)
      }
    } catch (_: Exception) {
      releaseProcessing()
    }
  }

  private var audioRecord: AudioRecord? = null`);
  source = replace(source, "    val recorder = createAudioRecord(config)", "    val recorder = createAudioRecord(config)\n    configureProcessing(recorder.audioSessionId)");
  source = replace(source, "    } catch (e: IllegalStateException) {\n      recorder.release()", "    } catch (e: IllegalStateException) {\n      releaseProcessing()\n      recorder.release()");
  source = replace(source, "    audioRecord?.stop()\n    audioRecord?.release()\n    audioRecord = null", "    try { audioRecord?.stop() } finally {\n      releaseProcessing()\n      audioRecord?.release()\n      audioRecord = null\n    }");
  source = replace(source, "      MediaRecorder.AudioSource.MIC,", "      if (options.echoCancellation) MediaRecorder.AudioSource.VOICE_COMMUNICATION else MediaRecorder.AudioSource.MIC,");
  source = replace(source, '          "timestamp" to timestamp', '          "timestamp" to timestamp,\n          "echoCancelled" to echoCancellationEnabled');
  return source;
}
function patchRecords(source) {
  if (source.includes(marker)) return source;
  return replace(source, "class AudioStreamOptions : Record {", `class AudioStreamOptions : Record {\n  ${marker}\n  @Field var echoCancellation: Boolean = false\n`);
}
module.exports = config => withDangerousMod(config, ["android", async mod => {
  const root = path.dirname(require.resolve("expo-audio/package.json", { paths: [mod.modRequest.projectRoot] }));
  const native = path.join(root, "android/src/main/java/expo/modules/audio");
  const changes = [["AudioStream.kt", patchStream], ["AudioRecords.kt", patchRecords]].map(([file, patch]) => {
    const target = path.join(native, file);
    return [target, patch(fs.readFileSync(target, "utf8").replace(/\r\n/g, "\n"))];
  });
  for (const [target, source] of changes) fs.writeFileSync(target, source);
  return mod;
}]);
module.exports.patchStream = patchStream;
module.exports.patchRecords = patchRecords;
