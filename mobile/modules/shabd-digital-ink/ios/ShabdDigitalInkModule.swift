import ExpoModulesCore
import Foundation
import MLKitCommon
import MLKitDigitalInkRecognition

struct ShabdInkPoint: Record {
  @Field var x: Float = 0
  @Field var y: Float = 0
}

// Same stroke/candidate contract as Android. Recognition stays on the device;
// only the language model is downloaded. JS retains its template fallback.
public class ShabdDigitalInkModule: Module {
  private var recognizer: DigitalInkRecognizer?
  private var recognizerTag: String?
  private var downloads: [String: [Promise]] = [:]
  private var observers: [NSObjectProtocol] = []
  private var timeouts: [String: DispatchWorkItem] = [:]

  public func definition() -> ModuleDefinition {
    Name("ShabdDigitalInk")

    AsyncFunction("downloadModel") { (tag: String, promise: Promise) in
      guard let model = self.model(for: tag) else {
        promise.reject("E_MODEL", "No Digital Ink model for language tag \"\(tag)\"")
        return
      }
      let manager = ModelManager.modelManager()
      if manager.isModelDownloaded(model) {
        promise.resolve(true)
        return
      }
      let key = model.modelIdentifier.languageTag
      if self.downloads[key] != nil {
        self.downloads[key]?.append(promise)
        return
      }
      self.observeDownloads()
      self.downloads[key] = [promise]
      // A stalled download must let the canvas fall back instead of leaving
      // its Check button in "Preparing handwriting…" indefinitely.
      let timeout = DispatchWorkItem { [weak self] in
        self?.finishDownload(key, error: "The handwriting model download timed out. Try again when online.")
      }
      self.timeouts[key] = timeout
      DispatchQueue.main.asyncAfter(deadline: .now() + 120, execute: timeout)
      manager.download(model, conditions: ModelDownloadConditions(
        allowsCellularAccess: true,
        allowsBackgroundDownloading: false
      ))
    }.runOnQueue(.main)

    AsyncFunction("getDownloadedModels") { () -> [String] in
      let manager = ModelManager.modelManager()
      return DigitalInkRecognitionModelIdentifier.allModelIdentifiers()
        .filter { manager.isModelDownloaded(DigitalInkRecognitionModel(modelIdentifier: $0)) }
        .map { $0.languageTag }
        .sorted()
    }.runOnQueue(.main)

    AsyncFunction("deleteModel") { (tag: String, promise: Promise) in
      guard let model = self.model(for: tag) else {
        promise.reject("E_MODEL", "No Digital Ink model for language tag \"\(tag)\"")
        return
      }
      let key = model.modelIdentifier.languageTag
      guard self.downloads[key] == nil else {
        promise.reject("E_DELETE", "The handwriting model is still downloading")
        return
      }
      if self.recognizerTag == key {
        self.recognizer = nil
        self.recognizerTag = nil
      }
      let manager = ModelManager.modelManager()
      guard manager.isModelDownloaded(model) else {
        promise.resolve(true)
        return
      }
      manager.deleteDownloadedModel(model) { error in
        if let error {
          promise.reject("E_DELETE", error.localizedDescription)
        } else {
          promise.resolve(true)
        }
      }
    }.runOnQueue(.main)

    AsyncFunction("recognize") { (tag: String, strokes: [[ShabdInkPoint]], promise: Promise) in
      guard let model = self.model(for: tag) else {
        promise.reject("E_MODEL", "No Digital Ink model for language tag \"\(tag)\"")
        return
      }
      let usable = strokes.filter { $0.count >= 2 }
      guard !usable.isEmpty, usable.allSatisfy({ $0.allSatisfy { $0.x.isFinite && $0.y.isFinite } }) else {
        promise.reject("E_INK", "No usable strokes to recognize")
        return
      }
      guard ModelManager.modelManager().isModelDownloaded(model) else {
        promise.reject("E_MODEL", "Download the handwriting model before recognizing")
        return
      }
      let key = model.modelIdentifier.languageTag
      if self.recognizerTag != key || self.recognizer == nil {
        self.recognizer = DigitalInkRecognizer.digitalInkRecognizer(
          options: DigitalInkRecognizerOptions(model: model)
        )
        self.recognizerTag = key
      }
      // The existing JS contract has coordinates only. Preserve point and
      // stroke order with monotonically increasing timestamps, as on Android.
      var timestamp = 0
      let ink = Ink(strokes: usable.map { stroke in
        Stroke(points: stroke.map { point in
          defer { timestamp += 1 }
          return StrokePoint(x: point.x, y: point.y, t: timestamp)
        })
      })
      self.recognizer?.recognize(ink: ink) { result, error in
        if let error {
          promise.reject("E_RECOGNIZE", error.localizedDescription)
          return
        }
        // Text models have no confidence scores. Shared JS derives feedback
        // from candidate rank; do not invent native confidence values.
        let candidates: [[String: Any]] = (result?.candidates ?? []).map {
          ["text": $0.text, "score": $0.score?.doubleValue ?? 0.0]
        }
        promise.resolve(candidates)
      }
    }.runOnQueue(.main)

    OnDestroy {
      // Download notifications and all module state are serialized on main.
      DispatchQueue.main.async { self.tearDown() }
    }
  }

  private func model(for tag: String) -> DigitalInkRecognitionModel? {
    guard let identifier = try? DigitalInkRecognitionModelIdentifier.from(languageTag: tag) else {
      return nil
    }
    return DigitalInkRecognitionModel(modelIdentifier: identifier)
  }

  private func observeDownloads() {
    guard observers.isEmpty else { return }
    let center = NotificationCenter.default
    for name in [Notification.Name.mlkitModelDownloadDidSucceed, .mlkitModelDownloadDidFail] {
      observers.append(center.addObserver(forName: name, object: nil, queue: .main) { [weak self] notification in
        guard let model = notification.userInfo?[ModelDownloadUserInfoKey.remoteModel.rawValue]
          as? DigitalInkRecognitionModel else { return }
        let error = notification.userInfo?[ModelDownloadUserInfoKey.error.rawValue] as? Error
        let message = notification.name == .mlkitModelDownloadDidFail
          ? (error?.localizedDescription ?? "The handwriting model could not be downloaded")
          : nil
        self?.finishDownload(model.modelIdentifier.languageTag, error: message)
      })
    }
  }

  private func finishDownload(_ key: String, error: String?) {
    timeouts.removeValue(forKey: key)?.cancel()
    let pending = downloads.removeValue(forKey: key) ?? []
    for promise in pending {
      if let error {
        promise.reject("E_DOWNLOAD", error)
      } else {
        promise.resolve(true)
      }
    }
  }

  private func tearDown() {
    observers.forEach { NotificationCenter.default.removeObserver($0) }
    observers.removeAll()
    for key in Array(downloads.keys) {
      finishDownload(key, error: "The handwriting module was closed")
    }
    recognizer = nil
    recognizerTag = nil
  }
}
