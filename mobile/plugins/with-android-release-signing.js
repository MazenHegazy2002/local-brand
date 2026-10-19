// Local Play upload signing. When BRANDYY_UPLOAD_KEYSTORE_PROPS points to a
// properties file (storeFile, storePassword, keyAlias, keyPassword) at prebuild
// time, add a `release` signingConfig to android/app/build.gradle and use it for
// the release buildType. Gradle re-reads the env var at build time (falling back
// to the prebuild-time path) and uses debug signing if the file is missing.
// Without the env var nothing changes, so EAS / CI builds are unaffected.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// @brandyy-release-signing';

function resolvePropsPath(raw) {
  if (!raw) return null;
  const expanded = raw.startsWith('~') ? path.join(os.homedir(), raw.slice(1)) : raw;
  return path.resolve(expanded);
}

module.exports = config =>
  withAppBuildGradle(config, cfg => {
    const propsPath = resolvePropsPath(process.env.BRANDYY_UPLOAD_KEYSTORE_PROPS);
    if (!propsPath) return cfg;
    if (!fs.existsSync(propsPath)) {
      console.warn(`[with-android-release-signing] ${propsPath} not found; keeping debug signing.`);
      return cfg;
    }
    let gradle = cfg.modResults.contents;
    if (gradle.includes(MARKER)) return cfg;

    const fallback = JSON.stringify(propsPath);
    const loader = `${MARKER}
def brandyyUploadProps = new Properties()
def brandyyUploadPropsPath = System.getenv('BRANDYY_UPLOAD_KEYSTORE_PROPS') ?: ${fallback}
if (brandyyUploadPropsPath.startsWith('~')) {
    brandyyUploadPropsPath = System.getProperty('user.home') + brandyyUploadPropsPath.substring(1)
}
def brandyyUploadPropsFile = file(brandyyUploadPropsPath)
if (brandyyUploadPropsFile.exists()) {
    brandyyUploadPropsFile.withInputStream { brandyyUploadProps.load(it) }
}
def brandyyHasUploadKey = brandyyUploadProps.getProperty('storeFile') != null

android {`;

    const signingOld = /signingConfigs \{\n(\s*)debug \{/;
    const releaseSigning = `signingConfigs {
$1if (brandyyHasUploadKey) {
$1    release {
$1        storeFile file(brandyyUploadProps.getProperty('storeFile'))
$1        storePassword brandyyUploadProps.getProperty('storePassword')
$1        keyAlias brandyyUploadProps.getProperty('keyAlias')
$1        keyPassword brandyyUploadProps.getProperty('keyPassword')
$1    }
$1}
$1debug {`;

    const releaseUse = /(release \{\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/;

    if (!/^android \{/m.test(gradle) || !signingOld.test(gradle) || !releaseUse.test(gradle)) {
      throw new Error('[with-android-release-signing] unexpected android/app/build.gradle layout');
    }

    gradle = gradle.replace(/^android \{/m, loader);
    gradle = gradle.replace(signingOld, releaseSigning);
    gradle = gradle.replace(
      releaseUse,
      '$1signingConfig brandyyHasUploadKey ? signingConfigs.release : signingConfigs.debug'
    );
    cfg.modResults.contents = gradle;
    return cfg;
  });
