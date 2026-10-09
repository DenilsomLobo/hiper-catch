import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getFirestore, collection, query, orderBy, limit, getDocsFromServer, doc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import { getAuth, setPersistence, browserLocalPersistence, signInAnonymously } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { firebaseConfig } from '../../Castle_Roll_V1/firebase-config.js';

const app = getApps().find(candidate => candidate.name === 'hiper-catch-ranking') ||
  initializeApp(firebaseConfig, 'hiper-catch-ranking');
const db = getFirestore(app);
const auth = getAuth(app);
let authentication;

function authenticatePlayer() {
  if (!authentication) authentication = (async () => {
    await setPersistence(auth, browserLocalPersistence);
    await auth.authStateReady();
    return auth.currentUser || (await signInAnonymously(auth)).user;
  })().catch(error => {
    authentication = null;
    throw error;
  });
  return authentication.then(user => {
    if (auth.currentUser?.uid !== user.uid) {
      authentication = null;
      return authenticatePlayer();
    }
    return user;
  });
}

export async function getTopRanking() {
  const snapshot = await getDocsFromServer(query(
    collection(db, 'ranking_hiper_catch'),
    orderBy('pontos', 'desc'),
    limit(10)
  ));
  const rows = [];
  for (const result of snapshot.docs) {
    const data = result.data();
    if (typeof data.nome !== 'string' || !data.nome.trim() ||
        !Number.isSafeInteger(data.pontos) || data.pontos < 0 ||
        typeof data.uid !== 'string' || !data.uid.trim() ||
        typeof data.dataHora?.toDate !== 'function') continue;
    const date = data.dataHora.toDate();
    if (!Number.isFinite(date.getTime())) continue;
    rows.push({ id: result.id, name: data.nome, score: data.pontos, date: date.toISOString() });
  }
  return rows;
}

export async function submitCompletedRun(report) {
  if (typeof report.runId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(report.runId) ||
      typeof report.nome !== 'string' || !report.nome.trim() || [...report.nome].length > 24 ||
      !Number.isSafeInteger(report.pontos) || report.pontos < 0 || report.pontos > 2147483647) {
    throw new Error('Resultado final inválido para sincronização.');
  }
  const user = await authenticatePlayer();
  const reference = doc(db, 'ranking_hiper_catch', report.runId);
  return runTransaction(db, async transaction => {
    const existing = await transaction.get(reference);
    if (existing.exists()) {
      const previous = existing.data();
      if (previous.uid !== user.uid || previous.nome !== report.nome || previous.pontos !== report.pontos) {
        throw new Error('O identificador da partida já pertence a outro resultado.');
      }
      return { id: reference.id, alreadyExists: true };
    }
    transaction.set(reference, {
      nome: report.nome,
      pontos: report.pontos,
      dataHora: serverTimestamp(),
      uid: user.uid
    });
    return { id: reference.id, alreadyExists: false };
  });
}
