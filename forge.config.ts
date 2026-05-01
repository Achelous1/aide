import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import * as path from 'node:path';
import * as fs from 'node:fs';

const isLocalBuild = !!process.env.SMALTI_LOCAL_BUILD;
const productName = isLocalBuild ? 'Smalti-Local-Build' : 'Smalti';
const appBundleId = isLocalBuild ? 'com.smaltihq.smalti.local' : 'com.smaltihq.smalti';

const nativeNodeFiles = ['src/main/native'];

function copyNativeModules(buildPath: string) {
  // Copy Rust napi .node files so they are available under native/ at runtime
  for (const nativeDir of nativeNodeFiles) {
    const src = path.resolve(__dirname, nativeDir);
    const dest = path.join(buildPath, 'native');
    if (fs.existsSync(src)) {
      fs.cpSync(src, dest, { recursive: true });
    }
  }
}

function patchInfoPlist(buildPath: string) {
  // NSApplicationSupportsSecureRestorableState prevents macOS from triggering
  // NSPersistentUI window restoration with null class names, which silently kills
  // unsigned apps launched via Finder/open. buildPath = Contents/Resources/app;
  // Info.plist is 2 levels up at Contents/Info.plist.
  const plistPath = path.join(buildPath, '..', '..', 'Info.plist');
  if (!fs.existsSync(plistPath)) return;
  let content = fs.readFileSync(plistPath, 'utf-8');
  if (!content.includes('NSApplicationSupportsSecureRestorableState')) {
    content = content.replace(
      '</dict>\n</plist>',
      '\t<key>NSApplicationSupportsSecureRestorableState</key>\n\t<true/>\n</dict>\n</plist>'
    );
    fs.writeFileSync(plistPath, content);
  }
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/native/*.node',
    },
    name: productName,
    icon: path.resolve(__dirname, 'resources', 'icon'),
    // Bundle ID is stable for release builds. Local builds use a separate
    // bundle ID so they are recognised as a distinct app by macOS, keeping
    // Application Support directories and TCC permissions isolated.
    appBundleId,
    win32metadata: {
      CompanyName: 'smalti',
      ProductName: productName,
    },
    extendInfo: {
      NSDocumentsFolderUsageDescription: 'Smalti reads workspace files from your Documents folder.',
      NSDesktopFolderUsageDescription: 'Smalti reads workspace files from your Desktop folder.',
      NSDownloadsFolderUsageDescription: 'Smalti reads workspace files from your Downloads folder.',
      NSRemovableVolumesUsageDescription: 'Smalti reads workspace files from external volumes.',
      NSNetworkVolumesUsageDescription: 'Smalti reads workspace files from network volumes.',
    },
    afterCopy: [
      (buildPath, _electronVersion, _platform, _arch, callback) => {
        copyNativeModules(buildPath);
        patchInfoPlist(buildPath);
        callback();
      },
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({ name: productName }),
    new MakerZIP({}, ['darwin']),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/index.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: false,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      // Disabled until app is code-signed: these abort silently when
      // the asar hash doesn't match or modules load outside the asar.
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};

export default config;
