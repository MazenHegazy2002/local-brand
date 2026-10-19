// iOS 27 traps at launch (_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption)
// unless the app adopts the UIScene life cycle. Expo ships ExpoAppSceneDelegate for this,
// but the SDK 57 template AppDelegate still starts React Native itself. On every prebuild:
// register the scene delegate in Info.plist and let it, not the AppDelegate, start RN.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const START_RN =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

module.exports = config => {
  config = withInfoPlist(config, cfg => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });

  return withAppDelegate(config, cfg => {
    if (cfg.modResults.language !== 'swift') return cfg;
    let src = cfg.modResults.contents;
    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      src = src.replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {'
      );
    }
    // ExpoAppSceneDelegate creates the window and starts React Native in it.
    src = src.replace(START_RN, '\n');
    cfg.modResults.contents = src;
    return cfg;
  });
};
