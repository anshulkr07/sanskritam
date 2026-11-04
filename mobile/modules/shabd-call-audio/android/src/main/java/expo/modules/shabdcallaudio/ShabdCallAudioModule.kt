package expo.modules.shabdcallaudio

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Voice calls can route audio without installing the unrelated Group SDK. */
class ShabdCallAudioModule : Module() {
  private var manager: AudioManager? = null
  private var previousMode = AudioManager.MODE_NORMAL
  private var previousSpeaker = false
  private var previousDevice: AudioDeviceInfo? = null

  @Suppress("DEPRECATION")
  private fun stop() {
    val audio = manager ?: return
    manager = null
    try {
      if (Build.VERSION.SDK_INT >= 31) {
        val device = previousDevice
        if (device != null) audio.setCommunicationDevice(device) else audio.clearCommunicationDevice()
      } else audio.isSpeakerphoneOn = previousSpeaker
    } finally {
      audio.mode = previousMode
      previousDevice = null
    }
  }

  override fun definition() = ModuleDefinition {
    Name("ShabdCallAudio")
    Function("start") {
      if (manager == null) {
        val context = appContext.reactContext ?: throw IllegalStateException("Audio context unavailable")
        val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        previousMode = audio.mode
        @Suppress("DEPRECATION")
        previousSpeaker = audio.isSpeakerphoneOn
        if (Build.VERSION.SDK_INT >= 31) previousDevice = audio.communicationDevice
        manager = audio
        try {
          audio.mode = AudioManager.MODE_IN_COMMUNICATION
          if (Build.VERSION.SDK_INT >= 31) {
            val speaker = audio.availableCommunicationDevices.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
            if (speaker != null && !audio.setCommunicationDevice(speaker)) throw IllegalStateException("Speaker routing unavailable")
          } else {
            @Suppress("DEPRECATION")
            audio.isSpeakerphoneOn = true
          }
        } catch (error: Exception) {
          stop()
          throw error
        }
      }
    }
    Function("stop") { stop() }
    Function("isActive") { manager?.mode == AudioManager.MODE_IN_COMMUNICATION }
    OnDestroy { stop() }
  }
}
