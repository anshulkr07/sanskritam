// Release signing for Google Play, applied at prebuild so it survives
// `expo prebuild --clean` (android/ is generated and gitignored).
//
// The upload key never enters the repo. Its path and passwords are Gradle
// properties in ~/.gradle/gradle.properties:
//   SANSKRITAM_UPLOAD_STORE_FILE=C:/Users/<you>/keys/sanskritam-upload.jks
//   SANSKRITAM_UPLOAD_STORE_PASSWORD=...
//   SANSKRITAM_UPLOAD_KEY_ALIAS=sanskritam-upload
//   SANSKRITAM_UPLOAD_KEY_PASSWORD=...
// A release build without them fails loudly instead of falling back to the
// debug key, which Play rejects.

const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "SANSKRITAM_UPLOAD_STORE_FILE";

const RELEASE_SIGNING_CONFIG = `
        release {
            if (project.hasProperty('SANSKRITAM_UPLOAD_STORE_FILE')) {
                storeFile file(SANSKRITAM_UPLOAD_STORE_FILE)
                storePassword SANSKRITAM_UPLOAD_STORE_PASSWORD
                keyAlias SANSKRITAM_UPLOAD_KEY_ALIAS
                keyPassword SANSKRITAM_UPLOAD_KEY_PASSWORD
            } else if (gradle.startParameter.taskNames.any { it.toLowerCase().contains('release') }) {
                throw new GradleException(
                    "Release builds are signed with the Play upload key. Set SANSKRITAM_UPLOAD_STORE_FILE, " +
                    "SANSKRITAM_UPLOAD_STORE_PASSWORD, SANSKRITAM_UPLOAD_KEY_ALIAS and " +
                    "SANSKRITAM_UPLOAD_KEY_PASSWORD in ~/.gradle/gradle.properties.")
            }
        }`;

function addReleaseSigning(contents) {
  if (contents.includes(MARKER)) return contents;

  // The debug config holds no nested braces, so [^}]* ends at its closing one.
  const debugConfig = /(signingConfigs \{\s*debug \{[^}]*\})/;
  if (!debugConfig.test(contents)) {
    throw new Error(
      "withReleaseSigning: signingConfigs.debug not found in app/build.gradle; the template changed, update the plugin.",
    );
  }
  contents = contents.replace(debugConfig, `$1${RELEASE_SIGNING_CONFIG}`);

  // Anchored on buildTypes so the debug build type keeps the debug key.
  const releaseBuildType = /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!releaseBuildType.test(contents)) {
    throw new Error(
      "withReleaseSigning: buildTypes.release signingConfig not found in app/build.gradle; update the plugin.",
    );
  }
  return contents.replace(releaseBuildType, "$1signingConfig signingConfigs.release");
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      throw new Error("withReleaseSigning: expected a Groovy app/build.gradle.");
    }
    cfg.modResults.contents = addReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};
