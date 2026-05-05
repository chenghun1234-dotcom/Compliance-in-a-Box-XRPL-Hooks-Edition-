const WebSocket = require('ws');
const xrpl = require('xrpl');
const fs = require('fs');
const path = require('path');

/**
 * Compliance-in-a-Box: Final Stabilized Raw Deployer
 * 1. 공식 Xahau Testnet 노드 사용 (wss://xahau-test.net)
 * 2. 연결 후 3초 대기 (동기화 지연 방지)
 * 3. 1,000 XAH 충전된 확정 계정 사용
 */

async function deployRaw() {
    console.log("🚀 Starting Stabilized Raw Deployment to Xahau Testnet...");
    
    // 공식 노드로 복구 (WebSocket 지원 확인됨)
    const ws = new WebSocket('wss://xahau-test.net');
    const wallet = xrpl.Wallet.fromSeed('ssKXkY9MCY32V33QDSfoJxZscxC7y');
    
    const wasmPath = path.join(__dirname, 'guard.wasm');
    const binary = fs.readFileSync(wasmPath);
    const hex = binary.toString('hex').toUpperCase();

    let requestId = 1;

    ws.on('open', () => {
        console.log("✅ Connected. Waiting 3 seconds for ledger synchronization...");
        
        // 동기화 지연을 방지하기 위해 3초 대기 후 첫 요청 전송
        setTimeout(() => {
            console.log("📡 Sending account_info request...");
            ws.send(JSON.stringify({
                id: requestId++,
                command: "account_info",
                account: wallet.address,
                ledger_index: "current",
                api_version: 1
            }));
        }, 3000);
    });

    ws.on('message', async (data) => {
        const resp = JSON.parse(data);
        
        if (resp.result && resp.result.account_data) {
            const sequence = resp.result.account_data.Sequence;
            console.log(`✨ Current Sequence: ${sequence}`);

            const tx = {
                TransactionType: "SetHook",
                Account: wallet.address,
                Sequence: sequence,
                Fee: "300000", 
                NetworkID: 21338,
                Hooks: [{
                    Hook: {
                        CreateCode: hex,
                        HookApiVersion: 0,
                        HookNamespace: "DE1B000000000000000000000000000000000000000000000000000000000001",
                        HookOn: "0000000000000000"
                    }
                }]
            };

            const signed = wallet.sign(tx);
            ws.send(JSON.stringify({
                id: requestId++,
                command: "submit",
                tx_blob: signed.tx_blob,
                api_version: 1
            }));
        } 
        else if (resp.result && resp.result.engine_result) {
            console.log("\n==================================================");
            console.log("🎊 Transaction Result:", resp.result.engine_result);
            console.log("📝 Message:", resp.result.engine_result_message);
            
            if (resp.result.engine_result === "tesSUCCESS") {
                console.log("✅ Compliance-in-a-Box Hook is now LIVE!");
                console.log(`📍 Explorer: https://test.xahauexplorer.com/explorer/${wallet.address}`);
            }
            console.log("==================================================\n");
            ws.close();
        } 
        else if (resp.error) {
            console.error("❌ Error from Node:", resp.error);
            ws.close();
        }
    });

    ws.on('error', (err) => {
        console.error("❌ WebSocket Error:", err);
    });

    ws.on('close', () => {
        console.log("👋 Connection closed.");
    });
}

deployRaw().catch(console.error);
