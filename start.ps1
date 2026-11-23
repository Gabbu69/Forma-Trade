param([int]$Port=8077,[switch]$NoBrowser)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
$php=(Get-Command php.exe).Source
$flags=@('-d','extension=pdo_mysql','-d','display_errors=0')
$state=Join-Path $PSScriptRoot '.runtime'
[void][IO.Directory]::CreateDirectory($state)
function Secret { [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N') }
if (!(Test-Path -LiteralPath '.env')) {
    $localConfig="DB_HOST=127.0.0.1`nDB_PORT=33317`nDB_NAME=forma_supply`nDB_USER=forma_app`nDB_PASSWORD=$(Secret)`nAPP_DEBUG=false"
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot '.env'),$localConfig)
    [IO.File]::WriteAllText((Join-Path $state 'db-admin'),(Secret))
}
if (Test-Path -LiteralPath (Join-Path $state 'db-admin')) {
    $bin=$env:FORMA_MARIADB_BIN
    if (!$bin) {
        $candidates=@(Get-ChildItem "$env:ProgramFiles\MariaDB*\bin\mysql_install_db.exe","C:\xampp\mysql\bin\mysql_install_db.exe" -ErrorAction SilentlyContinue)
        foreach ($candidate in $candidates) {
            & (Join-Path $candidate.DirectoryName 'mysqld.exe') --no-defaults --version | Out-Null
            if ($LASTEXITCODE -eq 0) { $bin=$candidate.DirectoryName; break }
        }
    }
    if (!$bin) { throw 'Install MariaDB for Windows or set FORMA_MARIADB_BIN to its bin directory.' }
    $data=Join-Path $state 'mysql'
    $admin=[IO.File]::ReadAllText((Join-Path $state 'db-admin'))
    if (!(Test-Path -LiteralPath (Join-Path $data 'mysql'))) {
        & (Join-Path $bin 'mysql_install_db.exe') "--datadir=$data" "--password=$admin" '--port=33317'
        if ($LASTEXITCODE) { throw 'MariaDB initialization failed.' }
    }
    function DbReady {
        $socket=New-Object Net.Sockets.TcpClient
        try { $socket.Connect('127.0.0.1',33317); return $true } catch { return $false } finally { $socket.Dispose() }
    }
    if (!(DbReady)) {
        $dbArgs=@("--defaults-file=`"$data\my.ini`"",'--bind-address=127.0.0.1','--port=33317',"--log-error=`"$state\database.log`"")
        Start-Process -FilePath (Join-Path $bin 'mysqld.exe') -ArgumentList $dbArgs -WindowStyle Hidden
        for ($attempt=0;$attempt -lt 60 -and !(DbReady);$attempt++){ Start-Sleep -Milliseconds 400 }
    }
    & $php @flags backend/config/provision.php
    if ($LASTEXITCODE) { throw 'Could not connect to the dedicated demo database. Check .runtime/database.log.' }
}
& $php @flags backend/setup.php
if ($LASTEXITCODE) { throw 'Database setup failed. Check the connection settings in .env.' }
$url="http://127.0.0.1:$Port/"
function AppReady {
    try {
        $response=Invoke-WebRequest -UseBasicParsing -Uri ($url+'api/catalog') -TimeoutSec 2
        return $response.Headers['X-Forma-Application'] -eq 'marketplace'
    } catch { return $false }
}
if (AppReady) {
    Write-Host "Forma Supply is already running at $url"
    if (!$NoBrowser) { Start-Process $url }
    exit 0
}
$serverArgs=$flags+@('-S',"127.0.0.1:$Port",'-t','backend','backend/index.php')
$server=Start-Process -FilePath $php -ArgumentList $serverArgs -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $state "web-$Port.log")
try {
    for ($i=0;$i -lt 30 -and !$server.HasExited;$i++) {
        if (AppReady) { break }
        Start-Sleep -Milliseconds 200
    }
    if ($server.HasExited -or !(AppReady)) { throw "Web startup failed. See .runtime/web-$Port.log or select another web port." }
    Write-Host "Forma Supply is available at $url"
    if (!$NoBrowser) { Start-Process $url }
    while (!$server.WaitForExit(500)) { }
} finally {
    if (!$server.HasExited) { $server.Kill() }
    $server.Dispose()
}