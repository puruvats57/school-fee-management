# How to See Payment Verification Logs

## Where to Look

### 1. Server Console (Terminal)
**This is where the fee update logs appear!**

When you run `npm run dev` in the `server` directory, you should see logs in that terminal window.

**Look for logs starting with:**
- `========== PAYMENT VERIFICATION STARTED ==========`
- `[Payment Verify]`
- `💰 Updating fee:`
- `✅ Fee updated successfully:`

### 2. Browser Console (F12)
**This shows frontend logs:**
- `[PaymentCallback]` logs
- Network requests
- Any JavaScript errors

## What You Should See

### When Payment Completes:

**In Server Terminal:**
```
========== PAYMENT VERIFICATION STARTED ==========
[Payment Verify] Request received at: 2024-01-15T10:30:00.000Z
[Payment Verify] Request body: { orderId: "abc123..." }
[Payment Verify] Looking for transaction with orderId: abc123...
[Payment Verify] Transaction found:
  - OrderId: abc123...
  - Status: pending
  - Amount: 4000
[Payment Verify] Verifying orderId: abc123...
[Payment Verify] Payment status: SUCCESS
[Payment Verify] Payment SUCCESS - Updating transaction and fee...
[Payment Verify] Finding fee with ID: ...
[Payment Verify] Fee found - Current: paidAmount=0, totalAmount=60000, status=pending
[Payment Verify] Found 1 successful transactions for this fee
[Payment Verify] 💰 Updating fee: oldPaidAmount=0, newPaidAmount=4000, totalAmount=60000, transactionAmount=4000
[Payment Verify] ✅ Fee updated successfully: status=partial, paidAmount=4000, dueAmount=56000
========== PAYMENT VERIFICATION ENDED (SUCCESS) ==========
```

## If You Don't See Logs

### Check 1: Is Server Running?
```bash
cd server
npm run dev
```
Make sure the server is running and you see: `Server is running on port 8000`

### Check 2: Is Payment Verification Being Called?
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Make a payment
4. Look for POST request to `/api/payment/verify`
5. Check if it's being called

### Check 3: Check Browser Console
Look for:
- `[PaymentCallback] OrderId from URL/session: ...`
- `[PaymentCallback] Verifying payment with orderId: ...`
- Any errors

### Check 4: Payment Status
The logs only appear if:
- Payment status from Cashfree is `'SUCCESS'`
- Transaction status is `'pending'` (not already `'success'`)

If transaction is already `'success'`, you'll see:
```
[Payment Verify] Transaction ... is already marked as success
[Payment Verify] Checking fee update for already-successful transaction
```

## Quick Test

To test if logging works, manually trigger verification:

**In Browser Console (F12):**
```javascript
// After making a payment, get the orderId from sessionStorage
const orderId = sessionStorage.getItem('lastOrderId');
console.log('OrderId:', orderId);

// Then check server terminal for logs
```

Or check the Network tab to see if the verify request is being made.

## Common Scenarios

### Scenario 1: No Logs at All
**Possible causes:**
- Payment verification endpoint not being called
- Check browser Network tab
- Check if `/payment-callback` page loads

### Scenario 2: Logs Show But Payment Status is Not SUCCESS
**You'll see:**
```
[Payment Verify] Payment status: PENDING
[Payment Verify] Payment status is: PENDING (not SUCCESS or FAILED)
```
**Solution:** Wait a few seconds, payment might still be processing

### Scenario 3: Transaction Already Success
**You'll see:**
```
[Payment Verify] Transaction ... is already marked as success
```
**This means:** Fee should already be updated, but logs will show the check

### Scenario 4: Fee Not Found
**You'll see:**
```
[Payment Verify] ❌ ERROR: Fee not found for transaction feeId: ...
```
**Solution:** Check database, fee record might be missing

## Next Steps

1. **Make a test payment**
2. **Watch server terminal** (where you ran `npm run dev`)
3. **Look for logs** starting with `[Payment Verify]`
4. **Share the logs** if you see any errors or unexpected behavior

The logs are definitely there - make sure you're looking at the **server terminal**, not just the browser console!

