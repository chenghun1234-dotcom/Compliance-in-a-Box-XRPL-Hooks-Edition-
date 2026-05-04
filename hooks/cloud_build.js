const fs = require('fs');

/**
 * Compliance-in-a-Box: Zero-Install Cloud Build
 * Docker 없이 온라인 컴파일러 API를 사용하여 C 코드를 Wasm으로 변환합니다.
 */

async function cloudBuild() {
    console.log("🚀 Starting Cloud Build for guard.c...");

    // 파일 경로를 실행 위치에 상관없이 찾을 수 있도록 수정합니다.
    let sourcePath = './guard.c';
    if (!fs.existsSync(sourcePath)) {
        sourcePath = './hooks/guard.c';
    }
    
    if (!fs.existsSync(sourcePath)) {
        console.error("❌ Error: guard.c 파일을 찾을 수 없습니다.");
        return;
    }

    const sourceCode = fs.readFileSync(sourcePath, 'utf8');

    try {
        // XRPL Hooks 공식 빌드박스 API를 사용합니다.
        const response = await fetch('https://hook-buildbox.xrpl.org/api/build', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                files: [{
                    name: 'guard.c',
                    content: sourceCode
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Compiler API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success && data.wasm_hex) {
            const wasmBuffer = Buffer.from(data.wasm_hex, 'hex');
            const outputPath = sourcePath.replace('.c', '.wasm');
            fs.writeFileSync(outputPath, wasmBuffer);
            console.log(`✅ Build Successful! Output: ${outputPath}`);
        } else {
            console.error("❌ Compilation Failed:", data.error || "Unknown error");
            if (data.log) console.log("Compiler Log:", data.log);
        }

    } catch (error) {
        console.error("❌ Cloud Build Error:", error.message);
        console.log("\n[대안책] Docker 실행이 어렵다면 아래 온라인 IDE를 사용해 보세요:");
        console.log("👉 https://hooks-builder.xrpl.org/");
    }
}

cloudBuild();
