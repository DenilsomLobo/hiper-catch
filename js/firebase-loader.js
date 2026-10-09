globalThis.hiperCatchFirebaseReady = import('./firebase-ranking.js').catch(error => {
  console.error('Não foi possível carregar a integração Firebase do Hiper Catch:', error);
  return null;
});
