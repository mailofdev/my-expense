/**
 * Owner isolation and admin profile reads.
 * Run with: npm run test:rules
 * Requires a JDK so the Firestore emulator can start.
 */
const { readFileSync } = require('fs');
const { doc, getDoc, setDoc, collection, getDocs } = require('firebase/firestore');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');

async function seed(testEnv) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/admin'), { role: 'admin', email: 'admin@example.com' });
    await setDoc(doc(db, 'users/alice'), { role: 'user', email: 'alice@example.com' });
    await setDoc(doc(db, 'users/alice/expenses/rent'), { amount: 1000 });
    await setDoc(doc(db, 'users/alice/walletTransactions/salary'), { amount: 50000, type: 'credit' });
  });
}

async function main() {
  const testEnv = await initializeTestEnvironment({
    projectId: 'demo-glow-money',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });

  try {
    await seed(testEnv);
    const alice = testEnv.authenticatedContext('alice').firestore();
    const admin = testEnv.authenticatedContext('admin').firestore();
    const stranger = testEnv.authenticatedContext('bob').firestore();
    const anon = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(alice, 'users/alice')));
    await assertSucceeds(getDoc(doc(alice, 'users/alice/expenses/rent')));
    await assertFails(getDoc(doc(alice, 'users/admin')));
    await assertFails(getDocs(collection(alice, 'users')));
    await assertFails(getDoc(doc(stranger, 'users/alice')));
    await assertFails(getDoc(doc(stranger, 'users/alice/expenses/rent')));
    await assertFails(getDoc(doc(stranger, 'users/alice/walletTransactions/salary')));
    await assertFails(getDoc(doc(anon, 'users/alice')));
    await assertFails(setDoc(doc(alice, 'users/alice'), { role: 'admin' }, { merge: true }));
    await assertFails(setDoc(doc(alice, 'users/bob'), { role: 'user', email: 'bob@example.com' }));

    await assertSucceeds(getDocs(collection(admin, 'users')));
    await assertSucceeds(getDoc(doc(admin, 'users/alice')));
    await assertFails(getDoc(doc(admin, 'users/alice/expenses/rent')));
    await assertFails(getDoc(doc(admin, 'users/alice/walletTransactions/salary')));

    console.log('Firestore rules passed.');
  } finally {
    await testEnv.cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
