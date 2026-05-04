const xrpl = require('xrpl');
const fs = require('fs');

async function deployHook() {
    const client = new xrpl.Client('wss://xahau.network'); // Xahau Testnet/Mainnet
    await client.connect();

    // 배포할 계정 (지갑)
    const wallet = xrpl.Wallet.fromSeed('your-testnet-seed'); 
    
    // 컴파일된 Wasm 파일 읽기
    const binary = fs.readFileSync('./hooks/guard.wasm');
    const hex = binary.toString('hex').toUpperCase();

    const tx = {
        TransactionType: "SetHook",
        Account: wallet.address,
        Hooks: [
            {
                Hook: {
                    CreateCode: hex,
                    HookApiVersion: 0,
                    HookNamespace: "DE1B...COMPLIANCE_NAMESPACE", // 유니크한 네임스페이스
                    HookOn: "0000000000000000" // 모든 트랜잭션 타입에 대해 트리거 (필요시 조정)
                }
            }
        ]
    };

    console.log("Submitting SetHook Transaction...");
    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    console.log("Deployment Result:", result.result.meta.TransactionResult);
    await client.disconnect();
}

deployHook().catch(console.error);
