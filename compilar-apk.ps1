# Crea el APK. Se compila en una copia en el disco D porque Gradle falla en
# discos FAT32 como E:. Al terminar, el APK se copia a la carpeta «instaladores».
$ErrorActionPreference = "Continue"
$proyecto = $PSScriptRoot
$copia = "D:\herramientas\compilacion\juego-divisiones"
$version = (Get-Content "$proyecto\package.json" -Raw | ConvertFrom-Json).version

Set-Location $proyecto
# Siempre la misma clave de firma: así cada APK nuevo se instala encima del anterior sin borrar los datos del alumno
$clave = Join-Path $env:USERPROFILE ".android\debug.keystore"
if (-not (Test-Path $clave)) {
  New-Item -ItemType Directory -Force (Join-Path $env:USERPROFILE ".android") | Out-Null
  Copy-Item (Join-Path $proyecto "recursos\clave-android\debug.keystore") $clave
}
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw "Falló la sincronización con Capacitor" }

New-Item -ItemType Directory -Force "$copia\node_modules\@capacitor" | Out-Null
robocopy "$proyecto\celular" "$copia\celular" /MIR /XD build .gradle /NFL /NDL /NJH /NJS | Out-Null
# Capacitor y todos sus complementos (guardar archivos, compartir, copia de seguridad)
robocopy "$proyecto\node_modules\@capacitor" "$copia\node_modules\@capacitor" /MIR /XD cli /NFL /NDL /NJH /NJS | Out-Null

$env:GRADLE_USER_HOME = "D:\herramientas\gradle"
$env:ANDROID_HOME = "D:\herramientas\android-sdk"
Set-Location "$copia\celular"
# Solo el módulo de la app: evita descargas grandes que no hacen falta
.\gradlew.bat :app:assembleDebug --no-daemon "-Dorg.gradle.internal.http.connectionTimeout=180000" "-Dorg.gradle.internal.http.socketTimeout=180000"
if ($LASTEXITCODE -ne 0) { throw "Falló la compilación del APK" }

New-Item -ItemType Directory -Force "$proyecto\instaladores" | Out-Null
$destino = "$proyecto\instaladores\Juego de Divisiones $version.apk"
Copy-Item "$copia\celular\app\build\outputs\apk\debug\app-debug.apk" $destino -Force
Write-Output "APK listo: $destino"
