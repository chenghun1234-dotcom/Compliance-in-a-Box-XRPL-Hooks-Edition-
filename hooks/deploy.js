const xrpl = require('xrpl');
const fs = require('fs');
const path = require('path');

/**
 * Compliance-in-a-Box: Final Deployment Script
 * 1. API v1 강제 적용
 * 2. 미리 충전된 테스트 계정 사용 (rQEoeJ9sR4NEsvq7ixbWXezVsA6qB6izJm)
 * 3. guard.wasm 배포
 */

async function deployHook() {
    // API v1로 고정하여 호환성 문제 해결
    const client = new xrpl.Client('wss://xahau-test.net', { apiVersion: 1 }); 
    await client.connect();
    console.log("✅ Connected to Xahau Testnet (API v1)");

    try {
        // 제가 직접 발급받아 충전해둔 테스트 계정입니다.
        const wallet = xrpl.Wallet.fromSeed('snFZy1Xnjk4Lveme3Ho3XT6i6yyLB');
        console.log(`✨ Using Funded Wallet: ${wallet.address}`);

        // Wasm 파일 경로 설정 (실행 위치에 상관없이 찾을 수 있도록)
        let wasmPath = path.join(__dirname, 'guard.wasm');
        if (!fs.existsSync(wasmPath)) {
            wasmPath = path.join(process.cwd(), 'hooks', 'guard.wasm');
        }
        
        const binary = fs.readFileSync(wasmPath);
        const hex = binary.toString('hex').toUpperCase();

        const tx = {
            TransactionType: "SetHook",
            Account: wallet.address,
            Hooks: [
                {
                    Hook: {
                        CreateCode: hex,
                        HookApiVersion: 0,
                        HookNamespace: "DE1B000000000000000000000000000000000000000000000000000000000001",
                        HookOn: "0000000000000000"
                    }
                }
            ],
            // 모든 요청에 api_version: 1 명시
            api_version: 1 
        };

        console.log("🚀 Submitting SetHook Transaction...");
        
        // Autofill 시에도 API 버전 명시
        const prepared = await client.autofill(tx, { api_version: 1 });
        const signed = wallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob, { api_version: 1 });

        console.log("🎊 Deployment Result:", result.result.meta.TransactionResult);
        
        if (result.result.meta.TransactionResult === "tesSUCCESS") {
            console.log("\n==================================================");
            console.log("✅ Compliance-in-a-Box Hook is now LIVE!");
            console.log(`📍 Explorer: https://test.xahauexplorer.com/explorer/${wallet.address}`);
            console.log("==================================================\n");
        } else {
            console.error("❌ Transaction Failed:", result.result.meta.TransactionResult);
        }

    } catch (error) {
        console.error("❌ Deployment Error:", error);
    } finally {
        await client.disconnect();
    }
}

deployHook().catch(console.error);
