// The template's "Bundle React Native code and images" phase runs the bundler
// script via unquoted backticks, so a project path with a space ("Apps Store")
// is split and the iOS build fails. Quote it on every prebuild.
const { withXcodeProject } = require('expo/config-plugins');

const UNQUOTED =
  "`\\\"$NODE_BINARY\\\" --print \\\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\\"`";
const QUOTED =
  '\\"$(\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\")\\"';

module.exports = config =>
  withXcodeProject(config, cfg => {
    const phases = cfg.modResults.hash.project.objects.PBXShellScriptBuildPhase || {};
    for (const phase of Object.values(phases)) {
      if (typeof phase === 'object' && typeof phase.shellScript === 'string') {
        phase.shellScript = phase.shellScript.split(UNQUOTED).join(QUOTED);
      }
    }
    return cfg;
  });
