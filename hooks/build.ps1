# Compliance-in-a-Box Hook Build Script (Windows/PowerShell)

# 1. Docker 실행 여부 확인
if (!(Get-Process docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker가 실행 중이지 않습니다. Docker Desktop을 시작해 주세요."
    exit
}

Write-Host "Compiling XRPL Hook: guard.c -> guard.wasm..." -ForegroundColor Cyan

# 2. Docker를 이용한 컴파일 실행
# XRPL Hooks 전용 빌드 이미지 (richardah/hooks-sdk 등)를 사용합니다.
docker run --rm -v ${PWD}:/src richardah/hooks-sdk /bin/bash -c "
    clang -O3 -target wasm32 -nostdlib -Wl,--no-entry -Wl,--export-all -o /src/guard.wasm /src/guard.c
"

if ($LastExitCode -eq 0) {
    Write-Host "Build Successful! Output: hooks/guard.wasm" -ForegroundColor Green
} else {
    Write-Host "Build Failed. Please check the C code for errors." -ForegroundColor Red
}

# 3. 배포 안내
Write-Host "`nTo deploy this hook, use the following command (requires xahaud or xrpl-js):" -ForegroundColor Yellow
Write-Host "SetHook Transaction -> HookHash: $(certutil -hashfile guard.wasm SHA256 | Select-Object -Index 1)"
