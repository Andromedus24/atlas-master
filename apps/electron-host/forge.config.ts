import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDEB } from '@electron-forge/maker-deb';
import { MakerRPM } from '@electron-forge/maker-rpm';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './assets/icon',
    name: 'Atlas',
    executableName: 'atlas',
    appBundleId: 'com.free-cluely.atlas',
    appCategoryType: 'public.app-category.productivity',
    win32metadata: {
      CompanyName: 'Atlas Team',
      FileDescription: 'AI-powered desktop assistant',
      ProductName: 'Atlas',
      InternalName: 'Atlas'
    }
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'AtlasSetup'
    }),
    new MakerZIP({}, ['darwin', 'linux']),
    new MakerDMG({
      icon: './assets/icon.icns',
      background: './assets/dmg-background.png',
      format: 'ULFO'
    }),
    new MakerDEB({
      options: {
        icon: './assets/icon.png',
        name: 'atlas',
        productName: 'Atlas',
        genericName: 'AI Desktop Assistant',
        description: 'Your intelligent desktop companion powered by AI',
        maintainer: 'Atlas Team',
        category: 'utils'
      }
    }),
    new MakerRPM({
      options: {
        icon: './assets/icon.png',
        name: 'atlas',
        productName: 'Atlas',
        genericName: 'AI Desktop Assistant',
        description: 'Your intelligent desktop companion powered by AI',
        maintainer: 'Atlas Team',
        category: 'Utility'
      }
    })
  ],
  plugins: [
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/renderer.ts',
            name: 'main_window',
            preload: {
              js: './src/preload.ts'
            }
          }
        ]
      }
    })
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'free-cluely',
          name: 'atlas'
        },
        prerelease: true
      }
    }
  ]
};

export default config;