const xrpl = require('xrpl');
// Note: In Node 18+, fetch is global. For older versions, require('node-fetch').

/**
 * ARMA (Asset Reserve Monitoring & Attestation) Logic
 * 1. Check BTC Reserve Address
 * 2. Check XRPL Stablecoin Issuance
 * 3. Trigger Kill Switch if Solvency < 100%
 */

// Configuration
const CONFIG = {
    BTC_ADDRESS: 'bc1q0sr96uux5h2jve9f53e6q3q6q3q6q3q6q3q6q3', // 비트코인 비축 샘플 주소
    XRPL_ISSUER: 'rQpe7NoDYJW8ZEy5sJJ411PqxAg7HnESZe', // 실시간 배포된 훅 주소
    XRPL_NODE: 'wss://xahau-test.net', // Xahau 테스트넷
    CHECK_INTERVAL_MS: 60000, 
    THRESHOLD: 0.99 
};

async function getBTCBalance(address) {
    try {
        // Blockstream API를 사용한 비트코인 잔액 조회 (Satoshi 단위)
        const response = await fetch(`https://blockstream.info/api/address/${address}`);
        const data = await response.json();
        return data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
    } catch (error) {
        console.error("BTC API Error:", error);
        return null;
    }
}

async function getXRPLIssuance(client, issuer) {
    try {
        const response = await client.request({
            command: 'gateway_balances',
            account: issuer
        });
        // 전체 발행량 합산
        let total = 0;
        if (response.result.assets) {
            for (const asset of Object.values(response.result.assets)) {
                total += parseFloat(asset);
            }
        }
        return total;
    } catch (error) {
        console.error("XRPL API Error:", error);
        return null;
    }
}

async function triggerKillSwitch(client, active) {
    console.warn(`[CRITICAL] Triggering Kill Switch: ${active ? 'LOCKDOWN' : 'RELEASE'}`);
    
    // XRPL Hook State를 업데이트하는 트랜잭션 (HookHash가 설치된 계정에서 실행)
    // 실제 구현에서는 전용 관리자 지갑의 서명이 필요합니다.
    const wallet = xrpl.Wallet.fromSeed(process.env.ADMIN_SEED);
    
    const tx = {
        TransactionType: "Invoke", // Hooks를 호출하기 위한 Invoke 트랜잭션
        Account: wallet.address,
        // Hook이 감지할 특정 파라미터를 전달하여 킬 스위치 작동
        HookParameters: [
            {
                HookParameter: {
                    HookParameterName: Buffer.from("ACTION").toString("hex").toUpperCase(),
                    HookParameterValue: Buffer.from(active ? "KILL" : "ALIVE").toString("hex").toUpperCase()
                }
            }
        ]
    };

    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    return result.result.meta.TransactionResult === "tesSUCCESS";
}

async function main() {
    const client = new xrpl.Client(CONFIG.XRPL_NODE);
    await client.connect();
    console.log("Connected to XRPL/Xahau Network");

    setInterval(async () => {
        console.log(`[${new Date().toISOString()}] Starting ARMA Audit...`);

        const btcSats = await getBTCBalance(CONFIG.BTC_ADDRESS);
        const xrplIssuance = await getXRPLIssuance(client, CONFIG.XRPL_ISSUER);

        if (btcSats !== null && xrplIssuance !== null) {
            // 단순화를 위해 1 BTC = 1 Stablecoin 가치라고 가정 (또는 현재 시세 반영 로직 추가 가능)
            const btcValue = btcSats / 100000000; // BTC 단위로 변환
            const parity = btcValue / xrplIssuance;

            console.log(`BTC Reserve: ${btcValue} BTC | XRPL Issuance: ${xrplIssuance} Units`);
            console.log(`Parity Ratio: ${(parity * 100).toFixed(2)}%`);

            if (parity < CONFIG.THRESHOLD) {
                console.error("!!! SOLVENCY VIOLATION DETECTED !!!");
                await triggerKillSwitch(client, true);
            } else {
                console.log("System Solvent. Operations Normal.");
            }
        }
    }, CONFIG.CHECK_INTERVAL_MS);
}

main().catch(console.error);
