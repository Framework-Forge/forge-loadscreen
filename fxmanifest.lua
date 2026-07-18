fx_version 'cerulean'
game 'gta5'

dependency 'ox_lib'
dependency 'pr_bridge'
dependency 'forge-management'

shared_scripts {
  '@ox_lib/init.lua',
  '@pr_bridge/init.lua',
}

name 'forge-loadscreen'
description 'forge Loading Screen'
author 'forge devs - Spacer dev / PierreMoraes'
version '1.0.0'

-- Load server script that sends config to the loading screen
server_scripts {
  'server.lua',
  'server/forge_plugin.lua',
}

client_scripts {
  'client.lua',
  'client/forge_plugin.lua',
}

-- Point to your built files. Run: cd ui && npm run build
loadscreen 'ui/dist/index.html'
ui_page 'ui/dist/index.html'
loadscreen_cursor 'yes'
-- Manual shutdown: client.lua sends progress with SendLoadingScreenMessage() and closes with ShutdownLoadingScreenNui().
loadscreen_manual_shutdown 'yes'

files {
  'ui/dist/index.html',
  'ui/dist/assets/**/*',
  'ui/dist/images/**/*',
  'ui/dist/videos/**/*',
  'ui/dist/videos/*.mp4',
  'ui/dist/music/**/*',
  'ui/dist/music/*.webm',
  'ui/dist/music/*.mp3',
  'plugin/index.html',
  'plugin/app.js',
  'plugin/style.css',
  'tools/yt-dlp.exe',
}
