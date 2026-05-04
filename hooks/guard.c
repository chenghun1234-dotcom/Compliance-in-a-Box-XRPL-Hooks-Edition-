/**
 * Compliance-in-a-Box: Defense-Grade XRPL Hook
 * Logic: Allow-Only Filtering + Global Kill Switch
 */

#include "hookapi.h"

// Key for the Global Kill Switch (32 bytes)
// 0x00...00 (31 zeros) + 0x01
uint8_t KILL_SWITCH_KEY[32] = {0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1};

int64_t hook(uint32_t reserved) {

    // 1. Check Global Kill Switch
    uint8_t kill_status[1];
    if (state(SBUF(kill_status), SBUF(KILL_SWITCH_KEY)) == 1) {
        if (kill_status[0] == 0) {
            rollback(SBUF("Compliance: Global Kill Switch is ACTIVE. All transactions halted."), 1);
        }
    }

    // 2. Identify the transaction type
    // We only care about 'Payment' transactions (Type 0)
    int64_t tt = otxn_type();
    if (tt != 0) {
        accept(SBUF("Compliance: Non-payment transaction ignored."), 0);
    }

    // 3. Get Sender and Receiver
    uint8_t account[20];
    otxn_field(SBUF(account), sfAccount);

    uint8_t dest[20];
    otxn_field(SBUF(dest), sfDestination);

    // 4. Whitelist Check (Sender)
    uint8_t sender_status[1];
    if (state(SBUF(sender_status), SBUF(account)) < 0 || sender_status[0] != 1) {
        rollback(SBUF("Compliance: Sender is not whitelisted."), 2);
    }

    // 5. Whitelist Check (Receiver)
    uint8_t dest_status[1];
    if (state(SBUF(dest_status), SBUF(dest)) < 0 || dest_status[0] != 1) {
        rollback(SBUF("Compliance: Destination is not whitelisted."), 3);
    }

    // 6. All checks passed
    accept(SBUF("Compliance: Transaction authorized."), 0);

    return 0;
}
