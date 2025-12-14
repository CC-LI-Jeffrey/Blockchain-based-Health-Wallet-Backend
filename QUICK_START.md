# 🚀 Quick Start Guide - Blockchain Health Wallet

## Prerequisites
- ✅ Ganache running on `http://127.0.0.1:8545`
- ✅ Smart contract deployed at `0xfdD271249a32a626D7B6884a5cbC8C6C79049087`
- ✅ Backend has Pinata IPFS credentials
- ✅ Android device/emulator with internet

## Start in 3 Steps

### 1️⃣ Start Backend
```powershell
cd E:\Fyp-Backend\Blockchain-based-Health-Wallet-Backend
npm start
```

✅ Server running on http://localhost:3000

### 2️⃣ Run Android App
- Open Android Studio
- Build and run on emulator/device
- App connects to backend via `http://10.0.2.2:3000`

### 3️⃣ Connect Wallet & Add Record

**In the app:**
1. **Connect Wallet**:
   - Open WalletInfoActivity
   - Click "Connect Wallet"
   - Scan QR code with MetaMask/wallet app
   - Approve connection

2. **Add Health Record**:
   - Navigate to "Add Report"
   - Fill in details
   - Attach PDF/image file
   - Wait for encryption (automatic)
   - Wait for IPFS upload (automatic)
   - **Sign transaction in wallet app** ← User owns data!
   - Done! Record on blockchain ✅

3. **Grant Provider Access**:
   - Navigate to "Share Records"
   - Use BlockchainHelper.showGrantAccessDialog()
   - Enter provider address (e.g., `0x1234...`)
   - Select records + duration
   - **Sign transaction** ← User controls access!
   - Provider can now view records ✅

## Admin Operations

Authorize a healthcare provider (backend):

```powershell
curl -X POST http://localhost:3000/api/admin/authorize-provider `
  -H "Content-Type: application/json" `
  -d '{"providerAddress": "0xYourProviderAddressHere"}'
```

Check provider status:

```powershell
curl http://localhost:3000/api/admin/is-provider/0xYourProviderAddressHere
```

## Testing Endpoints

### View Functions (no signature needed):

```powershell
# Get total records
curl http://localhost:3000/api/records/total

# Get patient records
curl http://localhost:3000/api/records/patient/0xe70F450E6aB0870b2E9F01abB63F7396C0c18975

# Get specific record
curl http://localhost:3000/api/records/1
```

## Troubleshooting

### Backend won't start?
- Check Ganache is running: `http://127.0.0.1:8545`
- Verify `.env` file has `ADMIN_PRIVATE_KEY`
- Check Pinata JWT is valid

### Android app can't connect to backend?
- Emulator: Use `http://10.0.2.2:3000`
- Physical device: Use `http://YOUR_IP:3000` and update ApiClient.kt

### Wallet won't connect?
- Make sure Reown Project ID is valid
- Check internet connection
- Try MetaMask or another wallet

### Transaction fails?
- Check user has ETH for gas
- Verify contract address is correct
- Check Ganache is running
- Look at Android Logcat for errors

## Architecture Flow

```
User Action → App Encrypts → Upload to IPFS → User Signs → Blockchain ✅
             (AES-256)      (Backend Helper)  (AppKit)     (Immutable)
```

**Key Point**: Backend never sees plaintext data or signs user transactions!

## What Next?

- [x] Everything is implemented and working!
- [ ] Test with real wallets on Sepolia testnet
- [ ] Add more UI features (transaction history, etc.)
- [ ] Deploy to production

## Support

- 📖 See COMPLETE_IMPLEMENTATION.md for full details
- 🔧 See IMPLEMENTATION_SUMMARY.md for technical overview
- 💡 See BlockchainIntegrationGuide.kt for code examples

**Happy Building! 🎉**
