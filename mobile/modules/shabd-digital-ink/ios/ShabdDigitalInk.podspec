require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name = 'ShabdDigitalInk'
  s.version = package['version']
  s.summary = package['description']
  s.description = package['description']
  s.license = package['license']
  s.author = 'Sanskritam'
  s.homepage = 'https://github.com/anshulkr07/sanskritam'
  s.source = { :git => 'https://github.com/anshulkr07/sanskritam.git' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }

  s.dependency 'ExpoModulesCore'
  # Match the GoogleMLKit version used by our photo OCR and face detection
  # packages so their shared MLKitCommon dependency resolves together.
  s.dependency 'GoogleMLKit/DigitalInkRecognition', '8.0.0'
end
