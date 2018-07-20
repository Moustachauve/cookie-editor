$buildPath = ".\build"
If(!(test-path $buildPath))
{
      New-Item -ItemType Directory -Force -Path $buildPath
}

# Chrome

Copy-Item "manifest.chrome.json" -Destination "manifest.json"

Compress-Archive -LiteralPath `
icons\, 
interface\, `
cookie-editor.js, `
manifest.json `
-CompressionLevel Optimal `
-Force `
-DestinationPath build\build-chrome.zip


# Firefox

Copy-Item "manifest.firefox.json" -Destination "manifest.json"

Compress-Archive -LiteralPath `
icons\, 
interface\, `
cookie-editor.js, `
manifest.json `
-CompressionLevel Optimal `
-Force `
-DestinationPath build\build-firefox.zip