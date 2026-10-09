param([int]$Port = 8080)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$castleFirebaseConfig = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\Castle_Roll_V1\firebase-config.js'))
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "Bob Roll: http://localhost:$Port (Ctrl+C para parar)"
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.svg'='image/svg+xml'; '.png'='image/png'; '.ico'='image/x-icon' }
try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $stream.ReadTimeout = 3000
      $stream.WriteTimeout = 5000
      $reader = [IO.StreamReader]::new($stream)
      $request = $reader.ReadLine()
      if (!$request) { continue }
      while ($reader.ReadLine()) {}
      $urlPath = [Uri]::UnescapeDataString(($request.Split(' ')[1]).Split('?')[0])
      if ($urlPath -eq '/') { $urlPath = '/index.html' }
      # Serve game files, tests, and only the shared Castle Roll Firebase config module.
      $isFirebaseConfig = $urlPath -eq '/Castle_Roll_V1/firebase-config.js'
      if ($request.Split(' ')[0] -ne 'GET' -or (!$isFirebaseConfig -and $urlPath -notmatch '^/(index\.html|(?:js|css|asset|assets|tests)/[a-zA-Z0-9_./-]+)$') -or $urlPath.Contains('..')) {
        $urlPath = '/not-found'
      }
      $isFirebaseConfig = $isFirebaseConfig -and $urlPath -eq '/Castle_Roll_V1/firebase-config.js'
      $file = if ($isFirebaseConfig) { $castleFirebaseConfig } else { [IO.Path]::GetFullPath((Join-Path $projectRoot $urlPath.TrimStart('/'))) }
      $status = '200 OK'
      $contentType = $types[[IO.Path]::GetExtension($file)]
      if (!$contentType) { $contentType = 'application/octet-stream' }
      $isGameFile = $file.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)
      $isApprovedConfig = $isFirebaseConfig -and $file -eq $castleFirebaseConfig
      if (!$types.ContainsKey([IO.Path]::GetExtension($file)) -or (!$isGameFile -and !$isApprovedConfig) -or !(Test-Path -LiteralPath $file -PathType Leaf)) {
        $status = '404 Not Found'; $body = [Text.Encoding]::UTF8.GetBytes('Not found')
      } else { $body = [IO.File]::ReadAllBytes($file) }
      $header = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nX-Content-Type-Options: nosniff`r`nX-Frame-Options: SAMEORIGIN`r`nReferrer-Policy: no-referrer`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n")
      $stream.Write($header,0,$header.Length); $stream.Write($body,0,$body.Length)
    } catch { Write-Verbose $_ } finally { $client.Dispose() }
  }
} finally { $listener.Stop() }
