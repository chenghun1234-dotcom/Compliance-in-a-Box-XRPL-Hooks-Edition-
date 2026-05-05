// Dashboard Logic
const LIVE_HOOK_ADDRESS = "rQpe7NoDYJW8ZEy5sJJ411PqxAg7HnESZe"; // 실시간 배포된 훅 주소
let isLockedDown = false;
const whitelist = [
    LIVE_HOOK_ADDRESS,
    "rP173yDoz2XnN9nCCT9H2L9pE3N3pU1i6r",
    "rHB9CJAWyB4rj91VRv7mX9e29aKx2h87E"
];

document.addEventListener('DOMContentLoaded', () => {
    updateWhitelistUI();
    
    const killSwitchBtn = document.getElementById('toggleKillSwitch');
    const statusBadge = document.getElementById('killSwitchStatus');

    killSwitchBtn.addEventListener('click', async () => {
        isLockedDown = !isLockedDown;
        
        if (isLockedDown) {
            killSwitchBtn.innerText = "LIFT LOCKDOWN";
            killSwitchBtn.classList.remove('btn-off');
            killSwitchBtn.classList.add('btn-on');
            statusBadge.innerText = "INACTIVE (Halted)";
            statusBadge.classList.remove('status-active');
            statusBadge.classList.add('status-inactive');
            showNotification("CRITICAL: Global Kill Switch Activated. All transactions halted.", "error");
        } else {
            killSwitchBtn.innerText = "INITIATE LOCKDOWN";
            killSwitchBtn.classList.remove('btn-on');
            killSwitchBtn.classList.add('btn-off');
            statusBadge.innerText = "Active (Allowing)";
            statusBadge.classList.remove('status-inactive');
            statusBadge.classList.add('status-active');
            showNotification("SUCCESS: Global Kill Switch Deactivated. Operations resumed.", "success");
        }

        // In a real app, this would call the Cloudflare Worker:
        // await fetch('/api/kill-switch', { method: 'POST', body: JSON.stringify({ active: isLockedDown }) });
    });
});

function addToWhitelist() {
    const input = document.getElementById('accountInput');
    const address = input.value.trim();
    
    if (address && address.startsWith('r')) {
        if (!whitelist.includes(address)) {
            whitelist.push(address);
            updateWhitelistUI();
            input.value = '';
            showNotification(`Address ${address} Authorized.`, "success");
        } else {
            showNotification("Address already whitelisted.", "warning");
        }
    } else {
        showNotification("Invalid XRPL Address.", "error");
    }
}

function updateWhitelistUI() {
    const container = document.getElementById('whitelistItems');
    container.innerHTML = whitelist.map(addr => `
        <div class="list-item">
            <span>${addr.substring(0, 15)}...</span>
            <span class="status-badge status-active">Verified</span>
        </div>
    `).join('');
}

function showNotification(message, type) {
    // Basic alert for now, could be a premium toast
    console.log(`[${type.toUpperCase()}] ${message}`);
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '1rem 2rem';
    notification.style.borderRadius = '8px';
    notification.style.zIndex = '1000';
    notification.style.backdropFilter = 'blur(10px)';
    notification.style.border = '1px solid var(--border)';
    
    if (type === 'error') notification.style.background = 'rgba(255, 0, 85, 0.9)';
    else if (type === 'success') notification.style.background = 'rgba(0, 255, 136, 0.9)';
    else notification.style.background = 'rgba(255, 204, 0, 0.9)';

    notification.innerText = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}
