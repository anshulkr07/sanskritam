package expo.modules.shabddigitalink

import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.vision.digitalink.DigitalInkRecognition
import com.google.mlkit.vision.digitalink.DigitalInkRecognitionModel
import com.google.mlkit.vision.digitalink.DigitalInkRecognitionModelIdentifier
import com.google.mlkit.vision.digitalink.DigitalInkRecognizer
import com.google.mlkit.vision.digitalink.DigitalInkRecognizerOptions
import com.google.mlkit.vision.digitalink.Ink
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class InkPoint : Record {
  @Field
  val x: Float = 0f

  @Field
  val y: Float = 0f
}

/**
 * On-device Digital Ink recognition for the writing practice screen.
 *
 * Strokes in, candidates out — nothing ever leaves the device (§2.16).
 * Language models (e.g. "hi" for Devanagari) download on first use via
 * Play Services, then work fully offline. One cached recognizer per
 * language tag; callers pass the tag on every call so the module can
 * swap models without extra JS state.
 */
class ShabdDigitalInkModule : Module() {
  private var recognizer: DigitalInkRecognizer? = null
  private var recognizerTag: String? = null

  override fun definition() = ModuleDefinition {
    Name("ShabdDigitalInk")

    AsyncFunction("downloadModel") { languageTag: String, promise: Promise ->
      val model = modelFor(languageTag)
      if (model == null) {
        promise.reject("E_MODEL", "No Digital Ink model for language tag \"$languageTag\"", null)
        return@AsyncFunction
      }
      RemoteModelManager.getInstance()
        .download(model, DownloadConditions.Builder().build())
        .addOnSuccessListener { promise.resolve(true) }
        .addOnFailureListener { e -> promise.reject("E_DOWNLOAD", e.message, e) }
    }

    AsyncFunction("getDownloadedModels") { promise: Promise ->
      RemoteModelManager.getInstance()
        .getDownloadedModels(DigitalInkRecognitionModel::class.java)
        .addOnSuccessListener { models ->
          promise.resolve(models.mapNotNull { it.modelIdentifier?.languageTag })
        }
        .addOnFailureListener { e -> promise.reject("E_MODELS", e.message, e) }
    }

    AsyncFunction("deleteModel") { languageTag: String, promise: Promise ->
      val model = modelFor(languageTag)
      if (model == null) {
        promise.reject("E_MODEL", "No Digital Ink model for language tag \"$languageTag\"", null)
        return@AsyncFunction
      }
      if (recognizerTag == languageTag) {
        recognizer?.close()
        recognizer = null
        recognizerTag = null
      }
      RemoteModelManager.getInstance()
        .deleteDownloadedModel(model)
        .addOnSuccessListener { promise.resolve(true) }
        .addOnFailureListener { e -> promise.reject("E_DELETE", e.message, e) }
    }

    AsyncFunction("recognize") { languageTag: String, strokes: List<List<InkPoint>>, promise: Promise ->
      val model = modelFor(languageTag)
      if (model == null) {
        promise.reject("E_MODEL", "No Digital Ink model for language tag \"$languageTag\"", null)
        return@AsyncFunction
      }
      if (strokes.isEmpty() || strokes.all { it.size < 2 }) {
        promise.reject("E_INK", "No usable strokes to recognize", null)
        return@AsyncFunction
      }
      try {
        val active = recognizerFor(languageTag, model)
        val ink = strokesToInk(strokes)
        active.recognize(ink)
          .addOnSuccessListener { result ->
            val out = result.candidates.map {
              mapOf("text" to it.text, "score" to (it.score?.toDouble() ?: 0.0))
            }
            promise.resolve(out)
          }
          .addOnFailureListener { e -> promise.reject("E_RECOGNIZE", e.message, e) }
      } catch (e: Exception) {
        promise.reject("E_RECOGNIZE", e.message, e)
      }
    }

    OnDestroy {
      recognizer?.close()
      recognizer = null
      recognizerTag = null
    }
  }

  private fun modelFor(languageTag: String): DigitalInkRecognitionModel? {
    return try {
      val identifier = DigitalInkRecognitionModelIdentifier.fromLanguageTag(languageTag)
        ?: return null
      DigitalInkRecognitionModel.builder(identifier).build()
    } catch (_: Exception) {
      null
    }
  }

  @Synchronized
  private fun recognizerFor(
    languageTag: String,
    model: DigitalInkRecognitionModel,
  ): DigitalInkRecognizer {
    val cached = recognizer
    if (cached != null && recognizerTag == languageTag) return cached
    recognizer?.close()
    val fresh = DigitalInkRecognition.getClient(
      DigitalInkRecognizerOptions.builder(model).build(),
    )
    recognizer = fresh
    recognizerTag = languageTag
    return fresh
  }

  private fun strokesToInk(strokes: List<List<InkPoint>>): Ink {
    val inkBuilder = Ink.builder()
    var t = 0L
    for (points in strokes) {
      if (points.size < 2) continue
      val strokeBuilder = Ink.Stroke.builder()
      for (p in points) {
        strokeBuilder.addPoint(Ink.Point.create(p.x, p.y, t))
        t += 1
      }
      inkBuilder.addStroke(strokeBuilder.build())
    }
    return inkBuilder.build()
  }
}
